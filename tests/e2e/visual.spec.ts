import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const MAX_DIFF_PIXEL_RATIO = 0.002;
const UPDATE_VISUAL_BASELINES = process.env.UPDATE_VISUAL_BASELINES === '1';
let roomCreatorSerial = 0;

type Rectangle = { x: number; y: number; width: number; height: number };

async function settleVisualState(page: Page, delay = 750): Promise<void> {
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
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
  await page.getByRole('button', { name: 'Start a new game' }).click();
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

async function compareRefreshFixture(
  page: Page,
  testInfo: TestInfo,
  fixtureName: string,
  ignoredRegions: Rectangle[],
): Promise<void> {
  const fixturePath = fileURLToPath(new URL(`../visual/refresh/${fixtureName}`, import.meta.url));
  const actualScreenshot = await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  });

  if (UPDATE_VISUAL_BASELINES) {
    mkdirSync(dirname(fixturePath), { recursive: true });
    writeFileSync(fixturePath, actualScreenshot);
    testInfo.annotations.push({
      type: 'approved visual baseline update',
      description: fixturePath,
    });
  }

  expect(
    existsSync(fixturePath),
    `${fixturePath} is missing. Set UPDATE_VISUAL_BASELINES=1 only after approving the refresh.`,
  ).toBe(true);

  const expected = PNG.sync.read(readFileSync(fixturePath));
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

async function prepareHome(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start a new game' })).toBeVisible();
  await expect(page.locator('.pimd-carousel__track')).toHaveCount(1);
  await settleVisualState(page);
}

test('approved refresh: mobile Home', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await prepareHome(page);
  await compareRefreshFixture(page, testInfo, 'home-mobile.png', []);
});

test('approved refresh: desktop Home', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await prepareHome(page);
  await compareRefreshFixture(page, testInfo, 'home-desktop.png', []);
});

test('approved refresh: mobile profile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await createRoom(page);
  await settleVisualState(page);

  await compareRefreshFixture(page, testInfo, 'profile-mobile.png', [
    await requiredBoundingBox(page, '.profile-intro .pimd-eyebrow'),
  ]);
});

test('approved refresh: mobile lobby', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await createRoom(page);
  await setProfile(page, 'Baseline', 1);
  await expect(page.locator('.lobby-roster > ol > li')).toHaveCount(1);
  await settleVisualState(page);

  await compareRefreshFixture(page, testInfo, 'lobby-mobile.png', [
    await roomCodeRegion(page),
    await requiredBoundingBox(page, '.lobby-room-card h1'),
  ]);
});

test('approved refresh: mobile Settings', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await createRoom(page);
  await setProfile(page, 'Baseline', 1);
  await page.getByRole('button', { name: 'Settings' }).click();

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

  await compareRefreshFixture(page, testInfo, 'settings-mobile.png', [
    await roomCodeRegion(page),
    await requiredBoundingBox(page, '.lobby-room-card h1'),
  ]);
});

test('approved refresh: mobile first-round Czar', async ({ browser }, testInfo) => {
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

    await settleVisualState(host);
    await expect(host.locator('#infoBar')).toContainText('You are the Card Czar!');
    await expect(host.locator('.whiteCard')).toHaveCount(0);

    // Keep generated copy deterministic without hiding the redesigned shell.
    await host.locator('.questionCard__copy').evaluate((element) => {
      element.textContent = 'A terrible idea involving ____.';
    });
    await host.locator('#navbar-info .navbar-info__code').evaluate((element) => {
      element.textContent = 'ABCDE';
    });

    await compareRefreshFixture(host, testInfo, 'game-czar-mobile.png', []);
  } finally {
    await Promise.allSettled([hostContext.close(), secondContext.close(), thirdContext.close()]);
  }
});
