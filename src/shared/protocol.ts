export const ROOM_ID_PATTERN = /^[A-HJ-NP-Z]{5}$/;

export type RoomId = string;
export type GameState = 'LOBBY' | 'PLAYING' | 'FINISHED';
export type GamePhase = 'LOBBY' | 'COLLECTING' | 'JUDGING' | 'REVEAL' | 'FINISHED' | 'CANCELLED';
export type RoomPhase = GamePhase;
export type TurnStatus = 'WAITING_FOR_CARDS' | 'WAITING_FOR_CZAR' | 'REVEAL';
export type ConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';
export type SessionStatus = 'ACTIVE' | 'KICKED' | 'LOST';
export type ColorSet = readonly [string, string];
export type HandRedealMode = 'replenish' | 'every_round' | 'czar_rotation';

export interface GameSettings {
  cardsPerHand: number;
  pointsToWin: number;
  numBlankCards: number;
  guaranteedBlanks: number;
  allBlanks: boolean;
  familyMode: boolean;
  numRedraws: number;
  handRedealMode: HandRedealMode;
}

export interface Card {
  id: string;
  text: string;
  blank?: boolean;
}

export type PlayedCard = Card;

export interface RevealedCard extends Card {
  playedByPlayerId: string;
  playedByDisplayName: string;
}

export interface PlayerSummary {
  playerId: string;
  displayName: string;
  colorSet: ColorSet;
  points: number;
  czarOrder: number;
  connected: boolean;
}

export interface PrivatePlayerState {
  sessionStatus: SessionStatus;
  playerId: string;
  displayName: string;
  hand: Card[];
  isPrivileged: boolean;
  playedThisTurn: boolean;
  redrawsUsed: number;
}

export interface TurnState {
  roundId: string;
  revealDeadline: number | null;
  round: number;
  status: TurnStatus;
  questionCard: string;
  czarPlayerId: string;
  playedCards: PlayedCard[];
  submittedPlayerIds: string[];
  winningCard: RevealedCard | null;
}

export interface ChatMessage {
  id: string;
  timestamp: number;
  type: 'chat' | 'system';
  senderPlayerId?: string;
  senderDisplayName: string;
  text: string;
}

export interface RoundAnswer {
  text: string;
  playedByPlayerId?: string;
  playedByDisplayName: string;
}

export interface RoundHistoryEntry {
  round: number;
  question: string;
  winningAnswer: string;
  winningPlayerId?: string;
  winningPlayerDisplayName: string;
  otherAnswers: RoundAnswer[];
}

export interface FinalRecord {
  outcome: 'won' | 'cancelled';
  winner: PlayerSummary | null;
  rounds: number;
  leaderboard: PlayerSummary[];
}

export interface RoomState {
  roomId: RoomId;
  phase: RoomPhase;
  gameState: GameState;
  players: PlayerSummary[];
  settings: GameSettings;
  turn: TurnState;
  chatMessages: ChatMessage[];
  roundHistory: RoundHistoryEntry[];
  finalRecord: FinalRecord | null;
}

/**
 * The only state frame sent by the server. `me` is connection-specific, so a
 * room broadcast must be serialized once per socket and must never expose a
 * different player's hand.
 */
export interface GameSnapshot {
  protocolVersion: 1;
  revision: number;
  serverTime: number;
  room: RoomState;
  me: PrivatePlayerState | null;
}

export interface CreateRoomResponse {
  roomId: RoomId;
  redirectUrl: string;
}

export interface TurnstileRequest {
  turnstileToken: string;
}

export interface EnterRoomResponse {
  snapshot: GameSnapshot;
  needsProfile: boolean;
}

export interface WatchRoomResponse {
  snapshot: GameSnapshot;
}

export interface SetProfileRequest {
  displayName: string;
  colorSet: ColorSet;
}

export interface SetProfileResponse {
  snapshot: GameSnapshot;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    title?: string;
  };
}

export interface CommandPayloads {
  update_settings: { settings: GameSettings };
  start_game: Record<string, never>;
  submit_card: { cardId: string };
  submit_blank: { cardId: string; text: string };
  redraw_card: { cardId: string };
  choose_winner: { cardId: string };
  send_chat: { text: string };
  kick_player: { playerId: string };
  leave_room: Record<string, never>;
  request_snapshot: Record<string, never>;
  process_due: Record<string, never>;
}

export type ClientCommandType = keyof CommandPayloads;

export type ClientCommand = {
  [K in ClientCommandType]: {
    protocolVersion: 1;
    commandId: string;
    type: K;
    roundId?: string;
    payload: CommandPayloads[K];
  };
}[ClientCommandType];

export type ClientCommandDraft = {
  [K in ClientCommandType]: {
    type: K;
    roundId?: string;
    payload: CommandPayloads[K];
  };
}[ClientCommandType];

export interface AckMessage {
  protocolVersion: 1;
  type: 'ack';
  commandId: string;
}

export interface ErrorMessage {
  protocolVersion: 1;
  type: 'error';
  commandId?: string;
  error: ApiErrorBody['error'];
}

export interface SnapshotMessage {
  protocolVersion: 1;
  type: 'snapshot';
  snapshot: GameSnapshot;
}

export type ClientSocketMessage = ClientCommand;
export type ServerSocketMessage = AckMessage | ErrorMessage | SnapshotMessage;

export function normalizeRoomId(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

export function isRoomId(value: unknown): value is RoomId {
  return typeof value === 'string' && ROOM_ID_PATTERN.test(value);
}

export function blankify(value: unknown): string {
  return String(value ?? '').replace('_', '________');
}
