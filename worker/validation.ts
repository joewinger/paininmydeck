import type {
  ClientCommand,
  ColorSet,
  GameSettings,
  SetProfileRequest,
} from '../src/shared/protocol';
import { PROTOCOL_VERSION } from '../src/shared/protocol';
import { RoomError } from './errors';

const COMMAND_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;
const ALLOWED_COLOR_SETS = new Set([
  '#EE796E,#FAB4AD',
  '#F2A971,#FCD4B5',
  '#F4C876,#FDE6B9',
  '#ADD787,#CAEBAD',
  '#65C294,#96DFBB',
  '#5E87C5,#8FAFE0',
  '#5561AF,#808BD0',
  '#7E67AF,#A793D2',
  '#BE7CB5,#DEABD7',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function integerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function emptyPayload(value: unknown): value is Record<string, never> {
  return isRecord(value) && Object.keys(value).length === 0;
}

export function parseSettings(value: unknown): GameSettings {
  if (!isRecord(value)) {
    throw new RoomError('INVALID_SETTINGS', 'Game settings are invalid.');
  }

  if (
    !integerInRange(value.actionTimerSeconds, 0, 120) ||
    (Number(value.actionTimerSeconds) > 0 && Number(value.actionTimerSeconds) < 5) ||
    !integerInRange(value.cardsPerHand, 3, 30) ||
    !integerInRange(value.pointsToWin, 1, 100) ||
    !integerInRange(value.numBlankCards, 0, 2_000) ||
    !integerInRange(value.guaranteedBlanks, 0, 30) ||
    typeof value.allBlanks !== 'boolean' ||
    typeof value.familyMode !== 'boolean' ||
    !integerInRange(value.numRedraws, 0, 30)
  ) {
    throw new RoomError('INVALID_SETTINGS', 'One or more game settings are out of range.');
  }
  if (value.guaranteedBlanks > value.cardsPerHand) {
    throw new RoomError('INVALID_SETTINGS', 'Guaranteed blank cards cannot exceed the hand size.');
  }

  return {
    actionTimerSeconds: value.actionTimerSeconds,
    cardsPerHand: value.cardsPerHand,
    pointsToWin: value.pointsToWin,
    numBlankCards: value.numBlankCards,
    guaranteedBlanks: value.guaranteedBlanks,
    allBlanks: value.allBlanks,
    familyMode: value.familyMode,
    numRedraws: value.numRedraws,
  };
}

export function parseProfile(value: Record<string, unknown>): SetProfileRequest {
  if (typeof value.displayName !== 'string') {
    throw new RoomError('INVALID_PROFILE', 'Enter a display name.');
  }
  const displayName = value.displayName.trim().normalize('NFKC');
  if (displayName.length < 1 || displayName.length > 12 || /[\p{Cc}\p{Cf}]/u.test(displayName)) {
    throw new RoomError('INVALID_DISPLAY_NAME', 'Display names must be 1–12 visible characters.');
  }

  if (
    !Array.isArray(value.colorSet) ||
    value.colorSet.length !== 2 ||
    typeof value.colorSet[0] !== 'string' ||
    typeof value.colorSet[1] !== 'string'
  ) {
    throw new RoomError('INVALID_COLORS', 'Choose a valid two-color player theme.');
  }
  const first = value.colorSet[0].toUpperCase();
  const second = value.colorSet[1].toUpperCase();
  if (!ALLOWED_COLOR_SETS.has(`${first},${second}`)) {
    throw new RoomError('INVALID_COLORS', 'Choose one of the available player themes.');
  }

  const colorSet: ColorSet = [first, second];
  return { displayName, colorSet };
}

export function normalizeDisplayName(displayName: string): string {
  return displayName.normalize('NFKC').toLocaleLowerCase('en-US');
}

function commandBase(value: Record<string, unknown>): {
  commandId: string;
  roundId: string | undefined;
} {
  if (value.protocolVersion !== PROTOCOL_VERSION) {
    throw new RoomError('OUTDATED_CLIENT', 'Refresh this page to use the current game protocol.');
  }
  if (typeof value.commandId !== 'string' || !COMMAND_ID_PATTERN.test(value.commandId)) {
    throw new RoomError('INVALID_COMMAND', 'The command id is invalid.');
  }
  if (value.roundId !== undefined && typeof value.roundId !== 'string') {
    throw new RoomError('INVALID_COMMAND', 'The round id is invalid.');
  }
  return { commandId: value.commandId, roundId: value.roundId };
}

function gameplayRoundId(roundId: string | undefined): string {
  if (roundId === undefined || roundId.length < 1 || roundId.length > 128) {
    throw new RoomError('ROUND_REQUIRED', 'This command needs the current round id.');
  }
  return roundId;
}

export function parseClientCommand(value: unknown): ClientCommand {
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new RoomError('INVALID_COMMAND', 'The WebSocket message is not a valid command.');
  }
  const { commandId, roundId } = commandBase(value);
  const payload = value.payload;

  switch (value.type) {
    case 'update_settings':
      if (!isRecord(payload)) {
        throw new RoomError('INVALID_COMMAND', 'Settings payload is invalid.');
      }
      return {
        protocolVersion: PROTOCOL_VERSION,
        commandId,
        type: 'update_settings',
        payload: { settings: parseSettings(payload.settings) },
      };
    case 'start_game':
    case 'leave_room':
    case 'request_snapshot':
    case 'process_due':
      if (!emptyPayload(payload)) {
        throw new RoomError('INVALID_COMMAND', 'This command does not accept a payload.');
      }
      return {
        protocolVersion: PROTOCOL_VERSION,
        commandId,
        type: value.type,
        payload: {},
      };
    case 'submit_card':
    case 'redraw_card':
    case 'choose_winner': {
      if (!isRecord(payload) || typeof payload.cardId !== 'string') {
        throw new RoomError('INVALID_COMMAND', 'Card payload is invalid.');
      }
      if (payload.cardId.length < 1 || payload.cardId.length > 128) {
        throw new RoomError('INVALID_COMMAND', 'Card id is invalid.');
      }
      return {
        protocolVersion: PROTOCOL_VERSION,
        commandId,
        type: value.type,
        roundId: gameplayRoundId(roundId),
        payload: { cardId: payload.cardId },
      };
    }
    case 'submit_blank': {
      if (
        !isRecord(payload) ||
        typeof payload.cardId !== 'string' ||
        typeof payload.text !== 'string'
      ) {
        throw new RoomError('INVALID_COMMAND', 'Blank-card payload is invalid.');
      }
      const text = payload.text.trim().normalize('NFKC');
      if (
        payload.cardId.length < 1 ||
        payload.cardId.length > 128 ||
        text.length < 1 ||
        text.length > 60 ||
        /[\p{Cc}\p{Cf}]/u.test(text)
      ) {
        throw new RoomError('INVALID_BLANK', 'Blank-card answers must be 1–60 visible characters.');
      }
      return {
        protocolVersion: PROTOCOL_VERSION,
        commandId,
        type: 'submit_blank',
        roundId: gameplayRoundId(roundId),
        payload: { cardId: payload.cardId, text },
      };
    }
    case 'send_chat': {
      if (!isRecord(payload) || typeof payload.text !== 'string') {
        throw new RoomError('INVALID_COMMAND', 'Chat payload is invalid.');
      }
      const text = payload.text.trim().normalize('NFKC');
      if (text.length < 1 || text.length > 280 || /[\p{Cc}\p{Cf}]/u.test(text)) {
        throw new RoomError('INVALID_CHAT', 'Chat messages must be 1–280 visible characters.');
      }
      return {
        protocolVersion: PROTOCOL_VERSION,
        commandId,
        type: 'send_chat',
        payload: { text },
      };
    }
    case 'kick_player':
      if (
        !isRecord(payload) ||
        typeof payload.playerId !== 'string' ||
        payload.playerId.length < 1 ||
        payload.playerId.length > 128
      ) {
        throw new RoomError('INVALID_COMMAND', 'Player payload is invalid.');
      }
      return {
        protocolVersion: PROTOCOL_VERSION,
        commandId,
        type: 'kick_player',
        payload: { playerId: payload.playerId },
      };
    default:
      throw new RoomError('UNKNOWN_COMMAND', 'This game command is not supported.');
  }
}
