import { expect, test, type BrowserContext, type Page } from '@playwright/test';

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
    await host.getByText('START A NEW GAME', { exact: true }).click();
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

    // Card zero demonstrates the legacy redraw gesture as the interstitial clears.
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

test('Home keeps the five-letter input and carousel interaction contract', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/');

  const input = page.locator('input.room-input');
  await input.fill('abcde');
  await expect(input).toHaveValue('ABCDE');
  await expect(input).toHaveAttribute('maxlength', '5');
  await expect(page.locator('ion-icon[name="shuffle"]')).toHaveCount(0);

  await page.waitForTimeout(750);
  const scrollPort = page.locator('.scroll-port');
  const before = await scrollPort.evaluate((element) => element.scrollLeft);
  await page.locator('.btn-right').click();
  await expect
    .poll(() => scrollPort.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(before + 100);
});
