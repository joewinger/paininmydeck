import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';

async function swipeCardToRevealRedraw(page: Page, card: Locator): Promise<void> {
  const bounds = await card.boundingBox();
  if (!bounds) throw new Error('Expected a visible answer card to swipe.');

  const startX = bounds.x + Math.min(30, bounds.width * 0.2);
  const centerY = bounds.y + bounds.height / 2;
  await page.mouse.move(startX, centerY);
  await page.mouse.down();
  await page.mouse.move(startX + Math.min(100, bounds.width * 0.62), centerY, { steps: 6 });
  await page.mouse.up();
}

async function setProfile(page: Page, displayName: string, swatchIndex: number): Promise<void> {
  const modal = page.locator('#setUsernameModal');
  // A real managed Turnstile check may spend several seconds evaluating the
  // browser before the provisional lobby snapshot can render.
  await expect(modal).toBeVisible({ timeout: 65_000 });
  await modal.locator('input').fill(displayName);
  await modal.locator('.swatch').nth(swatchIndex).click();
  await modal.getByRole('button', { name: 'Set Username' }).click();
  await expect(modal).toBeHidden();
  await expect(page.locator('#navbar-info')).toContainText('Room');
}

async function joinRoom(
  context: BrowserContext,
  roomId: string,
  displayName: string,
  swatchIndex: number,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`/join/${roomId}`);
  await setProfile(page, displayName, swatchIndex);
  await expect(page.locator('#lobby li')).toHaveCount(swatchIndex + 1);
  return page;
}

test('three friends can complete a game and reload the results', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  test.setTimeout(180_000);

  const hostContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const thirdContext = await browser.newContext();
  const host = await hostContext.newPage();

  try {
    await host.goto('/');
    await host.getByRole('button', { name: 'Start a new game' }).click();
    await expect(host).toHaveURL(/\/join\/[A-HJ-NP-Z]{5}$/, { timeout: 65_000 });
    const roomId = host.url().split('/').at(-1);
    expect(roomId).toMatch(/^[A-HJ-NP-Z]{5}$/);
    await setProfile(host, 'Alice', 0);

    const second = await joinRoom(secondContext, roomId as string, 'Bob', 1);
    const third = await joinRoom(thirdContext, roomId as string, 'Casey', 2);
    await expect(host.locator('#lobby li')).toHaveCount(3);
    await expect(host.locator('#infoBar')).toHaveCount(0);

    await host.locator('#statusBar .statusBarButton').nth(2).click();
    const pointsInput = host
      .locator('#statusMenuContent-settings tr')
      .filter({ hasText: 'Points To Win' })
      .locator('input');
    await pointsInput.fill('1');
    await host.locator('#statusMenuContent-settings').getByRole('button', { name: 'Save' }).click();

    await host.getByRole('button', { name: 'Start Game' }).click();
    await Promise.all([
      expect(host).toHaveURL(new RegExp(`/join/${roomId}/game$`)),
      expect(second).toHaveURL(new RegExp(`/join/${roomId}/game$`)),
      expect(third).toHaveURL(new RegExp(`/join/${roomId}/game$`)),
    ]);
    await Promise.all([
      expect(host.locator('#interstitial')).toBeHidden({ timeout: 5_000 }),
      expect(second.locator('#interstitial')).toBeHidden({ timeout: 5_000 }),
      expect(third.locator('#interstitial')).toBeHidden({ timeout: 5_000 }),
    ]);

    const redrawWrapper = second.locator('.whiteCard-wrapper.trashable').nth(1);
    const redrawCard = redrawWrapper.locator('.whiteCard');
    const originalCardText = (await redrawCard.locator('.card-text').textContent())?.trim();
    expect(originalCardText).toBeTruthy();

    await swipeCardToRevealRedraw(second, redrawCard);
    await expect(redrawWrapper).toHaveClass(/trashMode/);
    await redrawCard.hover();
    await expect(redrawWrapper).toHaveClass(/trashMode/);

    await second.getByRole('heading', { name: 'Pick one from your hand' }).click();
    await expect(redrawWrapper).not.toHaveClass(/trashMode/);

    await swipeCardToRevealRedraw(second, redrawCard);
    await expect(redrawWrapper).toHaveClass(/trashMode/);
    await redrawWrapper.getByRole('button', { name: 'Redraw card' }).click();
    await expect
      .poll(() => second.locator('.whiteCard .card-text').allTextContents())
      .not.toContain(originalCardText as string);

    await second.locator('.whiteCard').nth(1).click();
    await expect(second.locator('#infoBar')).toContainText('Waiting for everyone to play a card!');
    await third.locator('.whiteCard').nth(1).click();
    await expect(third.locator('#infoBar')).toContainText('Waiting for Alice to pick a winner');
    await expect(host.locator('.whiteCard')).toHaveCount(2);
    await expect(host.locator('.whiteCard.facedown')).toHaveCount(0);
    await host.locator('.whiteCard').first().click();

    await Promise.all([
      expect(host).toHaveURL(new RegExp(`/join/${roomId}/results$`), { timeout: 7_000 }),
      expect(second).toHaveURL(new RegExp(`/join/${roomId}/results$`), { timeout: 7_000 }),
      expect(third).toHaveURL(new RegExp(`/join/${roomId}/results$`), { timeout: 7_000 }),
    ]);
    await expect(host.locator('#gameover h1')).toContainText('won!');
    await expect(host.locator('.final-leaderboard_player')).toHaveCount(3);

    await host.reload();
    await expect(host).toHaveURL(new RegExp(`/join/${roomId}/results$`));
    await expect(host.locator('#gameover h1')).toContainText('won!');
    await expect(host.locator('#interstitial')).toHaveCount(0);
  } finally {
    await Promise.allSettled([hostContext.close(), secondContext.close(), thirdContext.close()]);
  }
});

test('Home keeps the five-letter input and manual carousel interaction contract', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/');

  const input = page.getByRole('textbox', { name: 'Enter room code' });
  await input.fill('abcde');
  await expect(input).toHaveValue('ABCDE');
  await expect(input).toHaveAttribute('maxlength', '5');
  await expect(page.locator('ion-icon[name="shuffle"]')).toHaveCount(0);

  await page.waitForTimeout(750);
  const scrollPort = page.locator('.pimd-carousel__track');
  const before = await scrollPort.evaluate((element) => element.scrollLeft);
  await page.getByRole('button', { name: 'Next feature' }).click();
  await expect
    .poll(() => scrollPort.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(before + 100);
});

test('TV mode watches a room without joining as a player', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  test.setTimeout(90_000);

  const hostContext = await browser.newContext();
  const displayContext = await browser.newContext();
  const host = await hostContext.newPage();

  try {
    await host.goto('/');
    await host.getByRole('button', { name: 'Start a new game' }).click();
    await expect(host).toHaveURL(/\/join\/[A-HJ-NP-Z]{5}$/, { timeout: 65_000 });
    const roomId = host.url().split('/').at(-1) as string;
    await setProfile(host, 'Alice', 0);
    await expect(host.locator('#lobby li')).toHaveCount(1);
    await expect(host.getByRole('link', { name: 'Open TV mode' })).toHaveAttribute(
      'target',
      '_blank',
    );

    const display = await displayContext.newPage();
    await display.goto(`/tv/${roomId}`);

    await expect(display).toHaveURL(new RegExp(`/tv/${roomId}$`));
    await expect(display.locator('#tv')).toBeVisible();
    await expect(display.getByRole('heading', { name: 'Players' })).toBeVisible();
    await expect(display.getByRole('heading', { name: 'Chat' })).toBeVisible();
    await expect(display.locator('.room-qr-code')).toHaveAttribute(
      'data-join-url',
      new RegExp(`/join/${roomId}$`),
    );
    await expect(display.locator('#setUsernameModal')).toHaveCount(0);
    await expect(display.locator('#navbar, #statusMenu, textarea, input')).toHaveCount(0);
    await expect
      .poll(() =>
        display.evaluate(() => ({
          horizontal: document.documentElement.scrollWidth > window.innerWidth,
          vertical: document.documentElement.scrollHeight > window.innerHeight,
        })),
      )
      .toEqual({ horizontal: false, vertical: false });
    await expect(host.locator('#lobby li')).toHaveCount(1);
  } finally {
    await Promise.allSettled([hostContext.close(), displayContext.close()]);
  }
});

test('TV mode creates a room and leaves the first phone in charge', async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  test.setTimeout(90_000);

  const displayContext = await browser.newContext();
  const phoneContext = await browser.newContext();
  const display = await displayContext.newPage();

  try {
    await display.goto('/tv');
    await expect(display).toHaveURL(/\/tv\/[A-HJ-NP-Z]{5}$/, { timeout: 65_000 });
    const roomId = display.url().split('/').at(-1) as string;

    await expect(display.locator('#tv')).toBeVisible();
    await expect(display.locator('.tv-header__room')).toContainText(roomId);
    await expect(display.locator('.room-qr-code')).toHaveAttribute(
      'data-join-url',
      new RegExp(`/join/${roomId}$`),
    );
    await expect(display.getByText('Pass this around the room')).toHaveCount(0);
    await expect(display.getByText('The room is quiet… for now.')).toBeVisible();
    await expect(display.getByText('0 of 8 players are checked in.')).toBeVisible();

    const phone = await joinRoom(phoneContext, roomId, 'Alice', 0);
    await expect(phone.getByRole('heading', { name: 'The table is yours' })).toBeVisible();
    await expect(phone.getByRole('button', { name: 'Start Game' })).toBeVisible();
    await expect(display.getByText('1 of 8 players is checked in.')).toBeVisible();

    await display.reload();
    await expect(display).toHaveURL(new RegExp(`/tv/${roomId}$`));
    await expect(display.locator('#tv')).toBeVisible();
    await expect(display.getByText('1 of 8 players is checked in.')).toBeVisible();
    await expect(phone.locator('#lobby li')).toHaveCount(1);
  } finally {
    await Promise.allSettled([displayContext.close(), phoneContext.close()]);
  }
});
