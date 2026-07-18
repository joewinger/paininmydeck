import { describe, expect, it } from 'vitest';
import { faviconPathForMode } from '../../build/favicon';

describe('faviconPathForMode', () => {
  it.each([
    ['development', '/favicon-development.svg'],
    ['staging', '/favicon-staging.svg'],
    ['production', '/favicon.svg'],
    ['test', '/favicon.svg'],
  ])('uses %s favicon at build time', (mode, expectedPath) => {
    expect(faviconPathForMode(mode)).toBe(expectedPath);
  });
});
