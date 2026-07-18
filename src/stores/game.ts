import { defineStore } from 'pinia';
import { gameApi, GameApiError, RoomSocket } from '@/api/gameClient';
import type {
  Card,
  ConnectionState,
  GameSettings,
  GameSnapshot,
  PlayerSummary,
  RoomState,
  SetProfileRequest,
} from '@/shared/protocol';
import { isRoomId, normalizeRoomId } from '@/shared/protocol';
import { useUiStore } from '@/stores/ui';

const DEFAULT_SETTINGS: GameSettings = {
  cardsPerHand: 7,
  pointsToWin: 10,
  numBlankCards: 0,
  guaranteedBlanks: 0,
  allBlanks: false,
  familyMode: false,
  numRedraws: 4,
};

function emptyRoom(): RoomState {
  return {
    roomId: '',
    phase: 'LOBBY',
    gameState: 'LOBBY',
    players: [],
    settings: { ...DEFAULT_SETTINGS },
    turn: {
      roundId: '',
      revealDeadline: null,
      round: 0,
      status: 'WAITING_FOR_CARDS',
      questionCard: '',
      czarPlayerId: '',
      playedCards: [],
      submittedPlayerIds: [],
      winningCard: null,
    },
    chatMessages: [],
    roundHistory: [],
    finalRecord: null,
  };
}

let roomSocket: RoomSocket | null = null;
let revealTimer: number | null = null;

export const useGameStore = defineStore('game', {
  state: () => ({
    room: emptyRoom(),
    self: null as GameSnapshot['me'],
    revision: -1,
    needsProfile: false,
    connectionState: 'idle' as ConnectionState,
    displayMode: false,
    cardActionPending: false,
    beingKicked: false,
    terminalExit: null as 'INVALID_ROOM' | null,
  }),

  getters: {
    roomId: (state): string | null => state.room.roomId || null,
    gameState: (state) => state.room.gameState,
    phase: (state) => state.room.phase,
    users: (state) => state.room.players,
    settings: (state) => state.room.settings,
    turn: (state) => state.room.turn,
    chatMessages: (state) => state.room.chatMessages,
    roundHistory: (state) => state.room.roundHistory,
    username: (state) => state.self?.displayName ?? '',
    hand: (state): Card[] => state.self?.hand ?? [],
    isPrivileged: (state) => state.self?.isPrivileged ?? false,
    playedThisTurn: (state) => state.self?.playedThisTurn ?? false,
    redrawsUsed: (state) => state.self?.redrawsUsed ?? 0,
    sortedUsers: (state): PlayerSummary[] =>
      [...state.room.players].sort((a, b) => b.points - a.points),
    usedColorSets: (state): string[] =>
      state.room.players.map((player) => player.colorSet.join(',')),
    czar: (state): PlayerSummary | undefined =>
      state.room.players.find((player) => player.playerId === state.room.turn.czarPlayerId),
    isCzar: (state) => Boolean(state.self && state.self.playerId === state.room.turn.czarPlayerId),
    userColorSet(): readonly [string, string] {
      return this.selfPlayer?.colorSet ?? ['#828282', '#BDBDBD'];
    },
    czarColorSet(): readonly [string, string] {
      return this.czar?.colorSet ?? ['#828282', '#BDBDBD'];
    },
    selfPlayer: (state): PlayerSummary | undefined =>
      state.room.players.find((player) => player.playerId === state.self?.playerId),
    playedPlayerIds: (state): string[] => state.room.turn.submittedPlayerIds,
  },

  actions: {
    async createRoom(): Promise<string> {
      const ui = useUiStore();
      try {
        const response = await gameApi.createRoom();
        const roomId = normalizeRoomId(response.roomId);
        if (!isRoomId(roomId))
          throw new GameApiError('The server returned an invalid room ID.', {
            code: 'INVALID_RESPONSE',
          });
        return roomId;
      } catch (error) {
        ui.notifyException(error, 'Error creating room. Try again in a little while.');
        throw error;
      }
    },

    async enterRoom(value: string): Promise<void> {
      const roomId = normalizeRoomId(value);
      if (!isRoomId(roomId)) {
        throw new GameApiError('Room IDs contain exactly five letters (without I or O).', {
          code: 'INVALID_ROOM_ID',
          title: 'Invalid Room ID',
        });
      }

      if (this.roomId && (this.roomId !== roomId || this.displayMode)) await this.leaveRoom();
      roomSocket?.close();
      roomSocket = null;
      this.displayMode = false;
      this.beingKicked = false;
      this.terminalExit = null;
      this.connectionState = 'connecting';

      const response = await gameApi.enterRoom(roomId);
      if (normalizeRoomId(response.snapshot.room.roomId) !== roomId) {
        throw new GameApiError('The server returned the wrong room.', { code: 'INVALID_RESPONSE' });
      }
      this.needsProfile = response.needsProfile;
      this.applySnapshot(response.snapshot);
      if (response.needsProfile) this.connectionState = 'idle';
      else this.connectSocket(roomId);
    },

    async watchRoom(value: string): Promise<void> {
      const roomId = normalizeRoomId(value);
      if (!isRoomId(roomId)) {
        throw new GameApiError('Room IDs contain exactly five letters (without I or O).', {
          code: 'INVALID_ROOM_ID',
          title: 'Invalid Room ID',
        });
      }

      roomSocket?.close();
      roomSocket = null;
      this.resetRoom();
      this.displayMode = true;
      this.connectionState = 'connecting';

      try {
        const response = await gameApi.watchRoom(roomId);
        if (
          normalizeRoomId(response.snapshot.room.roomId) !== roomId ||
          response.snapshot.me !== null
        ) {
          throw new GameApiError('The server returned invalid display data.', {
            code: 'INVALID_RESPONSE',
          });
        }
        this.applySnapshot(response.snapshot);
        this.connectWatchSocket(roomId);
      } catch (error) {
        this.resetRoom();
        throw error;
      }
    },

    async setProfile(displayName: string, colorSet: readonly [string, string]): Promise<void> {
      if (!this.roomId)
        throw new GameApiError('Join a room before setting your profile.', { code: 'NOT_IN_ROOM' });
      const profile: SetProfileRequest = { displayName: displayName.trim(), colorSet };
      if (!profile.displayName)
        throw new GameApiError('Username can not be blank!', {
          code: 'INVALID_DISPLAY_NAME',
          title: 'Invalid Username',
        });
      if (profile.displayName.length > 12)
        throw new GameApiError('Usernames can be at most 12 characters.', {
          code: 'INVALID_DISPLAY_NAME',
          title: 'Invalid Username',
        });

      let response: Awaited<ReturnType<typeof gameApi.setProfile>>;
      try {
        response = await gameApi.setProfile(this.roomId, profile);
      } catch (error) {
        const terminalCodes = [
          'ROOM_LOCKED',
          'PROFILE_LOCKED',
          'GAME_ALREADY_STARTED',
          'ROOM_EXPIRED',
          'ROOM_NOT_FOUND',
          'INVALID_SESSION',
          'LOST_SESSION',
          'ROOM_FULL',
        ];
        const ui = useUiStore();
        if (error instanceof GameApiError && terminalCodes.includes(error.code)) {
          this.terminalExit = 'INVALID_ROOM';
          const message =
            error.code === 'ROOM_FULL'
              ? 'This room is already full.'
              : ['ROOM_LOCKED', 'PROFILE_LOCKED', 'GAME_ALREADY_STARTED'].includes(error.code)
                ? 'This game has already started.'
                : 'This room is no longer available.';
          ui.notify({ title: 'Unable to Join', message });
        } else {
          ui.notifyException(error);
        }
        throw error;
      }
      this.applySnapshot(response.snapshot);
      this.needsProfile = false;
      try {
        sessionStorage.setItem('username', profile.displayName);
      } catch {
        // Storage can be unavailable in hardened/private browser contexts.
      }
      try {
        localStorage.setItem('username', profile.displayName);
      } catch {
        // Remembering a name is optional; joining the room is not.
      }
      this.connectSocket(this.roomId);
    },

    connectSocket(roomId: string): void {
      roomSocket?.close();
      roomSocket = new RoomSocket(roomId, {
        onSnapshot: (snapshot) => this.applySnapshot(snapshot),
        onError: (error) => useUiStore().notifyException(error),
        onTerminalError: (error) => this.handleTerminalSocketError(error),
        onConnectionState: (state) => {
          this.connectionState = state;
        },
      });
      roomSocket.connect();
    },

    connectWatchSocket(roomId: string): void {
      roomSocket?.close();
      roomSocket = new RoomSocket(
        roomId,
        {
          onSnapshot: (snapshot) => {
            if (snapshot.me !== null) {
              useUiStore().notify({ message: 'The room sent invalid display data.' });
              return;
            }
            this.applySnapshot(snapshot);
          },
          onError: (error) => useUiStore().notifyException(error),
          onTerminalError: (error) => this.handleTerminalSocketError(error),
          onConnectionState: (state) => {
            this.connectionState = state;
          },
        },
        { endpoint: 'watch-socket', readOnly: true },
      );
      roomSocket.connect();
    },

    async leaveRoom(): Promise<void> {
      const socket = roomSocket;
      const wasDisplayMode = this.displayMode;
      roomSocket = null;
      if (socket) {
        try {
          if (!wasDisplayMode) {
            await Promise.race([
              socket.send({ type: 'leave_room', payload: {} }),
              new Promise<void>((resolve) => window.setTimeout(resolve, 500)),
            ]);
          }
        } catch {
          // Leaving is local-first; the server also expires disconnected sessions.
        } finally {
          socket.close();
        }
      }
      this.resetRoom();
    },

    async updateSettings(settings: GameSettings): Promise<void> {
      await this.send({ type: 'update_settings', payload: { settings } });
    },
    async startGame(): Promise<void> {
      await this.send({ type: 'start_game', payload: {} });
    },
    async playAgain(): Promise<void> {
      await this.send({ type: 'play_again', payload: {} });
    },
    async submitCard(cardId: string): Promise<void> {
      await this.send({ type: 'submit_card', roundId: this.turn.roundId, payload: { cardId } });
    },
    async submitBlank(cardId: string, text: string): Promise<void> {
      await this.send({
        type: 'submit_blank',
        roundId: this.turn.roundId,
        payload: { cardId, text },
      });
    },
    async redrawCard(cardId: string): Promise<void> {
      await this.send({ type: 'redraw_card', roundId: this.turn.roundId, payload: { cardId } });
    },
    async chooseWinner(cardId: string): Promise<void> {
      await this.send({ type: 'choose_winner', roundId: this.turn.roundId, payload: { cardId } });
    },
    async sendChat(text: string): Promise<void> {
      await this.send({ type: 'send_chat', payload: { text } });
    },
    async kickPlayer(playerId: string): Promise<void> {
      await this.send({ type: 'kick_player', payload: { playerId } });
    },

    colorSetForPlayer(playerId?: string): readonly [string, string] {
      return (
        this.room.players.find((player) => player.playerId === playerId)?.colorSet ?? [
          '#828282',
          '#BDBDBD',
        ]
      );
    },

    applySnapshot(snapshot: GameSnapshot): void {
      if (
        !snapshot?.room ||
        snapshot.protocolVersion !== 1 ||
        typeof snapshot.revision !== 'number' ||
        typeof snapshot.serverTime !== 'number'
      ) {
        useUiStore().notify({ message: 'The room sent incomplete game data.' });
        return;
      }
      if (this.roomId === snapshot.room.roomId && snapshot.revision < this.revision) return;

      const previous = {
        phase: this.room.phase,
        round: this.room.turn.round,
        selfId: this.self?.playerId,
      };
      this.room = snapshot.room;
      this.self = snapshot.me;
      this.revision = snapshot.revision;
      this.armRevealDeadline(snapshot);

      if (snapshot.me?.sessionStatus === 'KICKED') {
        this.handleTerminalSocketError(
          new GameApiError("You've been kicked :(", { code: 'KICKED_SESSION', title: 'Kicked!' }),
        );
        return;
      }
      if (snapshot.me?.sessionStatus === 'LOST' || (previous.selfId && !snapshot.me)) {
        this.handleTerminalSocketError(
          new GameApiError('This room session is no longer available.', { code: 'LOST_SESSION' }),
        );
        return;
      }

      if (previous.selfId && snapshot.room.phase === 'COLLECTING' && previous.phase === 'LOBBY') {
        useUiStore().showInterstitial(
          `Round ${snapshot.room.turn.round || 1}`,
          `${this.czar?.displayName ?? 'Someone'} is the Czar.`,
        );
      } else if (
        previous.selfId &&
        snapshot.room.phase === 'COLLECTING' &&
        snapshot.room.turn.round > previous.round
      ) {
        const sorted = this.sortedUsers;
        let subtitle = `${this.czar?.displayName ?? 'Someone'} is the Czar`;
        if (sorted.length > 1 && sorted[0].points === sorted[1].points && sorted[0].points > 0)
          subtitle = 'First place is tied.';
        else if (sorted[0]?.points > 0) subtitle = `${sorted[0].displayName} is in the lead.`;
        useUiStore().showInterstitial(`Round ${snapshot.room.turn.round}`, subtitle);
      }
    },

    handleTerminalSocketError(error: GameApiError): void {
      const socket = roomSocket;
      roomSocket = null;
      socket?.close();
      if (revealTimer !== null) window.clearTimeout(revealTimer);
      revealTimer = null;
      if (error.code === 'KICKED_SESSION') {
        this.beingKicked = true;
        useUiStore().notify({ title: 'Kicked!', message: "You've been kicked :(" });
        return;
      }
      this.terminalExit = 'INVALID_ROOM';
      useUiStore().notify({ title: 'Invalid Room', message: 'This room is no longer available.' });
    },

    armRevealDeadline(snapshot: GameSnapshot): void {
      if (revealTimer !== null) window.clearTimeout(revealTimer);
      revealTimer = null;
      if (this.displayMode) return;
      const deadline = snapshot.room.turn.revealDeadline;
      if (snapshot.room.phase !== 'REVEAL' || deadline === null) return;
      const roundId = snapshot.room.turn.roundId;
      revealTimer = window.setTimeout(
        () => {
          revealTimer = null;
          if (!roomSocket || this.room.phase !== 'REVEAL' || this.turn.roundId !== roundId) return;
          void roomSocket.send({ type: 'process_due', payload: {} }).catch(() => undefined);
        },
        Math.max(0, deadline - snapshot.serverTime),
      );
    },

    dispose(): void {
      if (revealTimer !== null) window.clearTimeout(revealTimer);
      revealTimer = null;
      roomSocket?.close();
      roomSocket = null;
    },

    resetRoom(): void {
      if (revealTimer !== null) window.clearTimeout(revealTimer);
      revealTimer = null;
      this.room = emptyRoom();
      this.self = null;
      this.revision = -1;
      this.needsProfile = false;
      this.connectionState = 'idle';
      this.displayMode = false;
      this.cardActionPending = false;
      this.beingKicked = false;
      this.terminalExit = null;
    },

    async send(command: Parameters<RoomSocket['send']>[0]): Promise<void> {
      try {
        if (this.displayMode)
          throw new GameApiError('This room display is read-only.', {
            code: 'READ_ONLY_SESSION',
          });
        if (!roomSocket)
          throw new GameApiError('The room connection is not ready.', { code: 'NOT_CONNECTED' });
        await roomSocket.send(command);
      } catch (error) {
        const terminalCodes = [
          'KICKED_SESSION',
          'LOST_SESSION',
          'ROOM_EXPIRED',
          'INVALID_ROOM',
          'OUTDATED_CLIENT',
        ];
        if (!(error instanceof GameApiError) || !terminalCodes.includes(error.code))
          useUiStore().notifyException(error);
        throw error;
      }
    },
  },
});
