import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import App from '@/App.vue';
import { storyActions } from '../../.storybook/gameStore';
import { gameScenarios, ROOM_ID } from './fixtures/gameScenarios';

const lobbyRoute = `/join/${ROOM_ID}`;
const gameRoute = `${lobbyRoute}/game`;
const resultsRoute = `${lobbyRoute}/results`;

const meta = {
  title: 'Screens/Game states',
  component: App,
  tags: ['autodocs', 'test'],
  parameters: {
    a11y: { test: 'error' },
    docs: {
      description: {
        component:
          'Real application screens driven by deterministic protocol snapshots. No room, socket, or second browser is created.',
      },
    },
  },
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openStatusPanel(
  canvasElement: HTMLElement,
  buttonIndex: number,
): Promise<ReturnType<typeof within>> {
  const buttons = canvasElement.querySelectorAll<HTMLElement>('.statusBarButton');
  expect(buttons.length).toBeGreaterThan(buttonIndex);
  await userEvent.click(buttons[buttonIndex]);
  return within(canvasElement);
}

export const Home: Story = {
  parameters: { route: '/', a11y: { test: 'error' } },
};

export const HomeRoomCodeValidation: Story = {
  name: 'Home / room code validation',
  parameters: { route: '/', a11y: { test: 'error' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const roomCode = canvas.getByRole('textbox', { name: 'Enter room code' });

    await userEvent.type(roomCode, 'i0d3e');
    await expect(roomCode).toHaveValue('DE');
    await userEvent.click(canvas.getByRole('button', { name: 'Play' }));
    await expect(roomCode).toHaveAttribute('aria-invalid', 'true');
    await expect(
      canvas.findByText('That room code needs five valid letters.'),
    ).resolves.toBeVisible();
    await expect(canvas.findByRole('alert')).resolves.toHaveTextContent(
      'Enter the five-letter room ID (without I or O).',
    );

    await userEvent.clear(roomCode);
    await userEvent.type(roomCode, 'd-e c_k!s9');
    await expect(roomCode).toHaveValue('DECKS');
    await expect(roomCode).toHaveAttribute('aria-invalid', 'false');
  },
};

export const ProfileRequired: Story = {
  name: 'Lobby / profile required',
  parameters: {
    route: lobbyRoute,
    game: gameScenarios.profileRequired,
    a11y: { test: 'error' },
  },
};

export const LobbyHost: Story = {
  name: 'Lobby / host',
  parameters: { route: lobbyRoute, game: gameScenarios.lobbyHost, a11y: { test: 'error' } },
};

export const LobbyGuest: Story = {
  name: 'Lobby / guest',
  parameters: { route: lobbyRoute, game: gameScenarios.lobbyGuest, a11y: { test: 'error' } },
};

export const LobbyDisconnected: Story = {
  name: 'Lobby / player disconnected',
  parameters: {
    route: lobbyRoute,
    game: gameScenarios.lobbyDisconnected,
    a11y: { test: 'error' },
  },
};

export const SettingsOpen: Story = {
  name: 'Lobby / settings open',
  parameters: { route: lobbyRoute, game: gameScenarios.lobbyHost },
  play: async ({ canvasElement }) => {
    const canvas = await openStatusPanel(canvasElement, 2);
    await waitFor(() => expect(canvas.getByRole('heading', { name: 'Settings' })).toBeVisible());
  },
};

export const ChatOpen: Story = {
  name: 'Lobby / narrow desktop chat open',
  parameters: {
    route: lobbyRoute,
    game: gameScenarios.lobbyHost,
    viewport: { defaultViewport: 'narrowDesktop' },
  },
  play: async ({ canvasElement }) => {
    const canvas = await openStatusPanel(canvasElement, 1);
    await waitFor(() => expect(canvas.getByText('This round was made for me.')).toBeVisible());
    const chatInput = canvas.getByRole('textbox', { name: 'Chat message' });
    await userEvent.type(chatInput, 'Deal me in.');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expect(storyActions.sendChat).toHaveBeenCalledWith('Deal me in.');
  },
};

export const ChatOpenMobile: Story = {
  name: 'Lobby / mobile chat open',
  parameters: {
    route: lobbyRoute,
    game: gameScenarios.lobbyHost,
    viewport: { defaultViewport: 'mobile' },
  },
  play: async ({ canvasElement }) => {
    const canvas = await openStatusPanel(canvasElement, 1);
    await waitFor(() => expect(canvas.getByRole('region', { name: 'Chat' })).toBeVisible());
    await expect(canvas.getByRole('textbox', { name: 'Chat message' })).toBeVisible();
  },
};

export const PersistentChatLobby: Story = {
  name: 'Lobby / persistent chat',
  parameters: {
    route: lobbyRoute,
    game: gameScenarios.lobbyHost,
    viewport: { defaultViewport: 'desktop' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: 'Chat' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Chat' })).not.toBeInTheDocument();
  },
};

export const PlayerCollecting: Story = {
  name: 'Game / player collecting',
  parameters: { route: gameRoute, game: gameScenarios.playerCollecting },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Play answer: An aggressively enthusiastic thumbs-up.',
      }),
    );
    await expect(storyActions.submitCard).toHaveBeenCalledWith('answer-1');
  },
};

export const PersistentChatGame: Story = {
  name: 'Game / persistent chat',
  parameters: {
    route: gameRoute,
    game: gameScenarios.playerCollecting,
    viewport: { defaultViewport: 'desktop' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: 'Chat' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Chat' })).not.toBeInTheDocument();
  },
};

export const PlayerActionPending: Story = {
  name: 'Game / player card pending',
  parameters: { route: gameRoute, game: gameScenarios.playerActionPending },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', {
        name: 'Play answer: An aggressively enthusiastic thumbs-up.',
      }),
    ).toBeDisabled();
  },
};

export const PlayerRedraw: Story = {
  name: 'Game / redraw control',
  parameters: { route: gameRoute, game: gameScenarios.playerCollecting },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const redraw = canvas.getAllByRole('button', { name: 'Redraw card' })[0];
    redraw.focus();
    await expect(redraw).toHaveFocus();
    await expect(redraw).toBeVisible();
    await userEvent.keyboard('{Enter}');
    await expect(storyActions.redrawCard).toHaveBeenCalledWith('answer-1');
  },
};

export const BlankCardEditing: Story = {
  name: 'Game / blank card editing',
  parameters: { route: gameRoute, game: gameScenarios.playerCollecting },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const blankCard = canvas.getByPlaceholderText('Blank Card');
    await userEvent.click(blankCard);
    await userEvent.type(blankCard, 'A suspicious number of tiny cowboy hats');
    await expect(canvas.findByText('39/60')).resolves.toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Play blank answer' }));
    await expect(storyActions.submitBlank).toHaveBeenCalledWith(
      'blank-1',
      'A suspicious number of tiny cowboy hats',
    );
  },
};

export const PlayerSubmitted: Story = {
  name: 'Game / player submitted',
  parameters: { route: gameRoute, game: gameScenarios.playerSubmitted },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Unpin question' }));
    await expect(canvas.getByRole('button', { name: 'Pin question' })).toBeVisible();
  },
};

export const PlayerReconnecting: Story = {
  name: 'Game / reconnecting',
  parameters: { route: gameRoute, game: gameScenarios.playerReconnecting },
};

export const WaitingForPlayer: Story = {
  name: 'Game / waiting for player',
  parameters: { route: gameRoute, game: gameScenarios.playerWaitingForReconnect },
};

export const CzarCollecting: Story = {
  name: 'Game / Czar collecting',
  parameters: { route: gameRoute, game: gameScenarios.czarCollecting },
};

export const CzarJudging: Story = {
  name: 'Game / Czar judging',
  parameters: { route: gameRoute, game: gameScenarios.czarJudging },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Choose winner: A group chat that should have stayed private.',
      }),
    );
    await expect(storyActions.chooseWinner).toHaveBeenCalledWith('played-rowan');
  },
};

export const WinnerReveal: Story = {
  name: 'Game / winner reveal',
  parameters: { route: gameRoute, game: gameScenarios.winnerReveal },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Sam wins the round!')).toBeVisible();
    await expect(canvas.queryByText('Select the winning card!')).not.toBeInTheDocument();
  },
};

export const RoundInterstitial: Story = {
  name: 'Game / round interstitial',
  parameters: {
    route: gameRoute,
    game: gameScenarios.playerCollecting,
    ui: { interstitial: { title: 'Round 3', subtitle: 'Alex is the Card Czar' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = await canvas.findByRole('status');
    await expect(status).toBeVisible();
    await expect(within(status).getByRole('heading', { name: 'Round 3' })).toBeVisible();
    await expect(within(status).getByText('Alex is the Card Czar')).toBeVisible();
  },
};

export const HistoryOpen: Story = {
  name: 'Game / history open',
  parameters: { route: gameRoute, game: gameScenarios.czarJudging },
  play: async ({ canvasElement }) => {
    const canvas = await openStatusPanel(canvasElement, 0);
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'Round History' })).toBeVisible(),
    );
    expect(canvas.getByText(/Round 2/)).toBeVisible();
  },
};

export const LeaderboardOpen: Story = {
  name: 'Game / leaderboard open',
  parameters: { route: gameRoute, game: gameScenarios.czarJudging },
  play: async ({ canvasElement }) => {
    const canvas = await openStatusPanel(canvasElement, 2);
    await waitFor(() => expect(canvas.getByRole('heading', { name: 'Leaderboard' })).toBeVisible());
  },
};

export const GameWon: Story = {
  name: 'Results / game won',
  parameters: { route: resultsRoute, game: gameScenarios.gameWon },
};

export const PersistentChatResults: Story = {
  name: 'Results / persistent chat',
  parameters: {
    route: resultsRoute,
    game: gameScenarios.gameWon,
    viewport: { defaultViewport: 'desktop' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: 'Chat' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Chat' })).not.toBeInTheDocument();
  },
};

export const GameCancelled: Story = {
  name: 'Results / game cancelled',
  parameters: { route: resultsRoute, game: gameScenarios.gameCancelled },
};
