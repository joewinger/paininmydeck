import { describe, expect, it } from 'vitest';

import { isRoomId, normalizeRoomId, ROOM_ID_PATTERN } from '../../src/shared/protocol';

describe('room IDs', () => {
  it('accepts exactly five letters from the unambiguous alphabet', () => {
    expect(ROOM_ID_PATTERN.test('ABCDE')).toBe(true);
    expect(ROOM_ID_PATTERN.test('HJKLM')).toBe(true);
    expect(ROOM_ID_PATTERN.test('PQRST')).toBe(true);
    expect(ROOM_ID_PATTERN.test('VWXYZ')).toBe(true);
  });

  it('normalizes share links to uppercase', () => {
    expect(normalizeRoomId('  abcde\n')).toBe('ABCDE');
    expect(isRoomId(normalizeRoomId('  abcde\n'))).toBe(true);
  });

  it.each(['ABCD', 'ABCDEF', 'AB1DE', 'AB-CE', 'ABIDE', 'ABODE', '１２３４５', ''])(
    'rejects invalid or ambiguous value %j',
    (value) => {
      expect(isRoomId(value)).toBe(false);
    },
  );
});
