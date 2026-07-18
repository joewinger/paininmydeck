import { describe, expect, it } from 'vitest';

import { czarAnnouncement } from '@/stores/game';

describe('czarAnnouncement', () => {
  it('tells the Czar to read the prompt aloud', () => {
    expect(czarAnnouncement('Alex', true)).toBe('You’re the Czar — read this prompt aloud.');
  });

  it('names the current reader for everyone else', () => {
    expect(czarAnnouncement('Alex', false)).toBe('Reader / Czar: Alex.');
  });
});
