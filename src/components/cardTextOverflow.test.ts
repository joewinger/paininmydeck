import { describe, expect, it } from 'vitest';

import { hasScrollableCardText } from './cardTextOverflow';

describe('hasScrollableCardText', () => {
  it('only marks card copy as scrollable when it exceeds its visible area', () => {
    expect(hasScrollableCardText(null)).toBe(false);
    expect(hasScrollableCardText({ clientHeight: 220, scrollHeight: 220 })).toBe(false);
    expect(hasScrollableCardText({ clientHeight: 220, scrollHeight: 221 })).toBe(true);
  });
});
