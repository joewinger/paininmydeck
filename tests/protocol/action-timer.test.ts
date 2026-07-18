import { describe, expect, it } from 'vitest';

import type { GameSettings } from '@/shared/protocol';
import { RoomError } from '../../worker/errors';
import { parseClientCommand, parseSettings } from '../../worker/validation';

const SETTINGS: GameSettings = {
  actionTimerSeconds: 20,
  cardsPerHand: 7,
  pointsToWin: 10,
  numBlankCards: 0,
  guaranteedBlanks: 0,
  allBlanks: false,
  familyMode: false,
  numRedraws: 4,
};

describe('action timer settings', () => {
  it('rejects the pre-timer protocol so an open client reloads before sending old settings', () => {
    let rejection: unknown;
    try {
      parseClientCommand({
        protocolVersion: 1,
        commandId: 'old-client',
        type: 'request_snapshot',
        payload: {},
      });
    } catch (error) {
      rejection = error;
    }
    expect(rejection).toMatchObject({ code: 'OUTDATED_CLIENT' });
  });

  it.each([0, 5, 20, 120])('accepts %s seconds', (actionTimerSeconds) => {
    expect(parseSettings({ ...SETTINGS, actionTimerSeconds })).toMatchObject({
      actionTimerSeconds,
    });
  });

  it.each([-1, 1, 4, 121, 5.5])('rejects unsupported value %s', (actionTimerSeconds) => {
    expect(() => parseSettings({ ...SETTINGS, actionTimerSeconds })).toThrow(RoomError);
    try {
      parseSettings({ ...SETTINGS, actionTimerSeconds });
    } catch (error) {
      expect(error).toMatchObject({ code: 'INVALID_SETTINGS' });
    }
  });
});
