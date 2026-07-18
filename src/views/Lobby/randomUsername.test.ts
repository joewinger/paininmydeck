import { describe, expect, it } from 'vitest';

import { generateRandomUsername } from './randomUsername';

describe('generateRandomUsername', () => {
  it('offers a broad pool of names that fit the profile limit', () => {
    const names = Array.from({ length: 1_000 }, (_, index) =>
      generateRandomUsername([], () => index / 1_000),
    );

    expect(new Set(names).size).toBeGreaterThan(300);
    for (const name of names) {
      expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
      expect(name.length).toBeLessThanOrEqual(12);
    }
  });

  it('skips table names that are already in use without case or whitespace sensitivity', () => {
    expect(generateRandomUsername([' brave badger '], () => 0)).toBe('Brave Beaver');
  });
});
