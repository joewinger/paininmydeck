import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const MAX_DIFF_PIXEL_RATIO = 0.002;
let roomCreatorSerial = 0;

type Rectangle = { x: number; y: number; width: number; height: number };

const LEGACY_SETTINGS_DRAWER = { x: 33, y: 349, width: 324, height: 495 };

async function settleVisualState(page: Page, delay = 750): Promise<void> {
  await page.evaluate(async () => document.fonts.ready);
  const visibleIcons = page.locator('ion-icon:visible');
  if ((await visibleIcons.count()) > 0) {
    await expect
      .poll(() =>
        visibleIcons.evaluateAll((icons) =>
          icons.every((icon) =>
            Boolean(icon.querySelector('svg') ?? icon.shadowRoot?.querySelector('svg')),
          ),
        ),
      )
      .toBe(true);
  }
  await page.waitForTimeout(delay);
}

async function requiredBoundingBox(page: Page, selector: string): Promise<Rectangle> {
  const box = await page.locator(selector).boundingBox();
  expect(box, `${selector} should have a visual bounding box`).not.toBeNull();
  return box as Rectangle;
}

async function createRoom(page: Page): Promise<string> {
  roomCreatorSerial += 1;
  // Cloudflare supplies this header in production. A unique documentation-only
  // address keeps independent local visual fixtures from tripping the intended
  // three-creations-per-minute friend-facing rate limit.
  await page.route(
    '**/api/rooms',
    (route) =>
      route.continue({
        headers: {
          ...route.request().headers(),
          'CF-Connecting-IP': `2001:db8:${process.pid.toString(16)}:${roomCreatorSerial}::1`,
        },
      }),
    { times: 1 },
  );
  await page.goto('/');
  await page.getByText('START A NEW GAME', { exact: true }).click();
  await expect(page).toHaveURL(/\/join\/[A-HJ-NP-Z]{5}$/);
  const roomId = page.url().split('/').at(-1);
  expect(roomId).toMatch(/^[A-HJ-NP-Z]{5}$/);
  await expect(page.locator('#setUsernameModal')).toBeVisible();
  return roomId as string;
}

async function setProfile(page: Page, displayName: string, swatchIndex: number): Promise<void> {
  const modal = page.locator('#setUsernameModal');
  await expect(modal).toBeVisible();
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
  return page;
}

async function roomCodeRegion(page: Page): Promise<Rectangle> {
  return requiredBoundingBox(page, '#navbar-info');
}

async function compareLegacyFixture(
  page: Page,
  testInfo: TestInfo,
  fixtureName: string,
  ignoredRegions: Rectangle[],
): Promise<void> {
  const fixturePath = fileURLToPath(new URL(`../visual/legacy/${fixtureName}`, import.meta.url));
  const expected = PNG.sync.read(readFileSync(fixturePath));
  const actualScreenshot = await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  });
  const actual = PNG.sync.read(actualScreenshot);

  expect({ width: actual.width, height: actual.height }).toEqual({
    width: expected.width,
    height: expected.height,
  });

  let ignoredPixels = 0;
  for (const region of ignoredRegions) {
    const left = Math.max(0, Math.floor(region.x));
    const top = Math.max(0, Math.floor(region.y));
    const right = Math.min(actual.width, Math.ceil(region.x + region.width));
    const bottom = Math.min(actual.height, Math.ceil(region.y + region.height));
    ignoredPixels += Math.max(0, right - left) * Math.max(0, bottom - top);
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const offset = (y * actual.width + x) * 4;
        expected.data.copy(actual.data, offset, offset, offset + 4);
      }
    }
  }

  const diff = new PNG({ width: actual.width, height: actual.height });
  const differingPixels = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    actual.width,
    actual.height,
    { includeAA: false, threshold: 0.1 },
  );
  const comparedPixels = actual.width * actual.height - ignoredPixels;
  const ratio = differingPixels / comparedPixels;

  if (ratio > MAX_DIFF_PIXEL_RATIO) {
    await testInfo.attach('actual', {
      body: actualScreenshot,
      contentType: 'image/png',
    });
    await testInfo.attach('visual-diff', {
      body: PNG.sync.write(diff),
      contentType: 'image/png',
    });
  }
  expect(ratio, `${fixtureName} differed by ${(ratio * 100).toFixed(3)}%`).toBeLessThanOrEqual(
    MAX_DIFF_PIXEL_RATIO,
  );
}

async function prepareHome(page: Page): Promise<Rectangle[]> {
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
  await settleVisualState(page);
  const controls = await page.locator('.game-controls').boundingBox();
  const carousel = await page.locator('.scroll-port').boundingBox();
  expect(controls).not.toBeNull();
  expect(carousel).not.toBeNull();
  // The carousel advances automatically, so its viewport is covered by
  // interaction tests rather than a time-sensitive pixel snapshot.
  return [controls as Rectangle, carousel as Rectangle];
}

test('mobile Home remains visually frozen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  const dynamicRegions = await prepareHome(page);
  await compareLegacyFixture(page, testInfo, 'legacy-home-mobile.png', dynamicRegions);
});

test('desktop Home remains visually frozen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const dynamicRegions = await prepareHome(page);
  await compareLegacyFixture(page, testInfo, 'legacy-home-desktop.png', dynamicRegions);
});

test('mobile username modal remains visually frozen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await createRoom(page);
  await settleVisualState(page);

  await compareLegacyFixture(page, testInfo, 'legacy-username-modal-mobile.png', []);
});

test('mobile lobby remains visually frozen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await createRoom(page);
  await setProfile(page, 'Baseline', 1);
  await expect(page.locator('#lobby li')).toHaveCount(1);
  await settleVisualState(page);

  await compareLegacyFixture(page, testInfo, 'legacy-lobby-mobile.png', [
    await roomCodeRegion(page),
  ]);
});

test('mobile Settings remains visually frozen outside the approved Public Game removal', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await createRoom(page);
  await setProfile(page, 'Baseline', 1);
  await page.locator('#statusBar .statusBarButton').nth(2).click();

  const settings = page.locator('#statusMenuContent-settings');
  await expect(settings).toBeVisible();
  await expect(settings.locator('tr')).toHaveCount(7);
  await expect(settings).not.toContainText('Public Game');
  await expect
    .poll(() =>
      settings
        .locator('input[type="number"]')
        .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)),
    )
    .toEqual(['7', '10', '0', '0', '4']);
  await expect(settings.locator('input[type="checkbox"]')).toHaveCount(2);
  await expect(settings.getByRole('button', { name: 'Save' })).toBeVisible();
  await settleVisualState(page);

  // Removing the legacy Public Game row shortens this bottom-anchored drawer,
  // shifting every child and its shadow. Mask the union of the old/new drawer
  // footprint while retaining explicit assertions for every preserved control.
  await compareLegacyFixture(page, testInfo, 'legacy-settings-mobile.png', [
    await roomCodeRegion(page),
    LEGACY_SETTINGS_DRAWER,
  ]);
});

test('mobile first-round Czar view remains visually frozen', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  test.setTimeout(60_000);

  const hostContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const thirdContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hostContext.newPage();

  try {
    const roomId = await createRoom(host);
    await setProfile(host, 'Baseline', 1);
    const second = await joinRoom(secondContext, roomId, 'Friend One', 2);
    const third = await joinRoom(thirdContext, roomId, 'Friend Two', 3);
    await expect(host.locator('#lobby li')).toHaveCount(3);

    await host.getByRole('button', { name: 'Start Game' }).click();
    await Promise.all([
      expect(host).toHaveURL(new RegExp(`/join/${roomId}/game$`)),
      expect(second).toHaveURL(new RegExp(`/join/${roomId}/game$`)),
      expect(third).toHaveURL(new RegExp(`/join/${roomId}/game$`)),
    ]);
    await expect(host.locator('#interstitial')).toBeHidden({ timeout: 5_000 });
    await expect(host.locator('#infoBar')).toContainText('You are the Card Czar!');
    await expect(host.locator('.whiteCard')).toHaveCount(0);

    // Question copy is randomized and can add lines, which would otherwise
    // resize the card before its text-only region is masked. Collapse only the
    // copy's typography so the legacy card chrome and following layout remain
    // comparable at their original 210px minimum height.
    await host.locator('.questionCard').evaluate((element) => {
      (element as HTMLElement).style.fontSize = '0';
    });
    await settleVisualState(host);

    const question = await requiredBoundingBox(host, '.questionCard');
    const dynamicQuestionCopy = {
      x: question.x + 15,
      y: question.y + 50,
      width: question.width - 30,
      height: question.height - 65,
    };
    await compareLegacyFixture(host, testInfo, 'legacy-game-czar-mobile.png', [
      await roomCodeRegion(host),
      dynamicQuestionCopy,
    ]);
  } finally {
    await Promise.allSettled([hostContext.close(), secondContext.close(), thirdContext.close()]);
  }
});
