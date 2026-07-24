import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import App from '@/App.vue';
import { useGameStore } from '@/stores/game';
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
  name: 'Lobby / chat open',
  parameters: { route: lobbyRoute, game: gameScenarios.lobbyHost },
  play: async ({ canvasElement }) => {
    const canvas = await openStatusPanel(canvasElement, 1);
    await waitFor(() => expect(canvas.getByText('This round was made for me.')).toBeVisible());
    await userEvent.type(canvas.getByRole('textbox', { name: 'Chat message' }), 'Deal me in.');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expect(storyActions.sendChat).toHaveBeenCalledWith('Deal me in.');
  },
};

export const PlayerCollecting: Story = {
  name: 'Game / player collecting',
  parameters: { route: gameRoute, game: gameScenarios.playerCollecting },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const visibleCardOrder = () =>
      Array.from(
        canvasElement.querySelectorAll('#card-container > .whiteCard-wrapper > .whiteCard'),
      ).map((card) => card.getAttribute('aria-label'));
    const initialCardOrder = visibleCardOrder();

    await userEvent.click(canvas.getByRole('button', { name: 'Shuffle hand' }));
    await waitFor(() => expect(visibleCardOrder()).not.toEqual(initialCardOrder));
    await expect(storyActions.submitCard).not.toHaveBeenCalled();
    await expect(storyActions.redrawCard).not.toHaveBeenCalled();

    const firstAnswer = canvas.getByRole('button', {
      name: 'Select answer: An aggressively enthusiastic thumbs-up.',
    });
    const secondAnswer = canvas.getByRole('button', {
      name: 'Select answer: Trying to look casual while everything is on fire.',
    });

    firstAnswer.focus();
    await userEvent.keyboard('{Enter}');
    await expect(firstAnswer).toHaveAttribute('aria-pressed', 'true');
    await expect(storyActions.submitCard).not.toHaveBeenCalled();

    await userEvent.click(secondAnswer);
    await expect(firstAnswer).toHaveAttribute('aria-pressed', 'false');
    await expect(secondAnswer).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(canvas.getByRole('button', { name: 'Play Card' })).toBeDisabled();

    await userEvent.click(firstAnswer);
    await userEvent.click(canvas.getByRole('button', { name: 'Play Card' }));
    await expect(storyActions.submitCard).toHaveBeenCalledWith('answer-1');
  },
};

export const PlayerActionPending: Story = {
  name: 'Game / player card pending',
  parameters: { route: gameRoute, game: gameScenarios.playerActionPending },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', {
        name: 'Select answer: An aggressively enthusiastic thumbs-up.',
      }),
    ).toBeDisabled();
  },
};

export const PlayerSelectionClearsOnRoundChange: Story = {
  name: 'Game / stale selection clears',
  parameters: { route: gameRoute, game: gameScenarios.playerCollecting },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const answer = canvas.getByRole('button', {
      name: 'Select answer: An aggressively enthusiastic thumbs-up.',
    });

    await userEvent.click(answer);
    await expect(answer).toHaveAttribute('aria-pressed', 'true');

    useGameStore().room.turn.roundId = 'round-4';

    await waitFor(() => expect(answer).toHaveAttribute('aria-pressed', 'false'));
    await expect(canvas.getByRole('button', { name: 'Play Card' })).toBeDisabled();
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
    const blankStack = canvas.getByRole('group', {
      name: '1 blank card. Write an answer to play one blank card.',
    });
    await expect(blankStack.closest('.whiteCard-wrapper')).toHaveClass('is-blank-stack');
    await expect(canvas.getByText('1 blank card')).toBeVisible();
    const blankCard = canvas.getByPlaceholderText('Blank Card');
    await userEvent.click(blankCard);
    await expect(canvas.getByText('Write an answer on the selected blank card.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Play Card' })).toBeDisabled();
    await userEvent.type(blankCard, 'A suspicious number of tiny cowboy hats');
    await expect(canvas.findByText('39/60')).resolves.toBeVisible();
    await expect(storyActions.submitBlank).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Play Card' }));
    await expect(storyActions.submitBlank).toHaveBeenCalledWith(
      'blank-1',
      'A suspicious number of tiny cowboy hats',
    );
  },
};

export const CountedBlankStack: Story = {
  name: 'Game / counted blank stack',
  parameters: {
    route: gameRoute,
    game: gameScenarios.playerBlankStack,
    viewport: { defaultViewport: 'desktop' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const game = useGameStore();
    const stack = canvas.getByRole('group', {
      name: '4 blank cards. Write an answer to play one blank card.',
    });
    const stackWrapper = stack.closest('.whiteCard-wrapper');

    await expect(canvas.getByText('4 blank cards')).toBeVisible();
    await expect(stackWrapper).toHaveClass('is-blank-stack');
    await expect(stackWrapper?.querySelector('.btn-trash')).toBeNull();
    await expect(canvas.getAllByRole('button', { name: /^Select answer:/ })).toHaveLength(2);
    await expect(canvas.getByRole('status')).toHaveTextContent(
      '4 blank cards in your hand. Writing an answer uses one blank card.',
    );

    const editor = within(stack).getByRole('textbox', { name: 'Your blank answer' });
    editor.focus();
    await expect(editor).toHaveFocus();
    await userEvent.keyboard('A deterministic write-in');
    await expect(
      canvas.getByRole('group', {
        name: '4 blank cards. Selected. Write an answer to play one blank card.',
      }),
    ).toBeVisible();

    if (!game.self) throw new Error('Expected a private player fixture.');
    game.self.hand = game.self.hand.filter((card) => card.id !== 'blank-z').reverse();
    await waitFor(() =>
      expect(
        canvas.getByRole('group', {
          name: '3 blank cards. Selected. Write an answer to play one blank card.',
        }),
      ).toBeVisible(),
    );
    await expect(editor).toHaveValue('A deterministic write-in');

    storyActions.submitBlank.mockImplementationOnce(async (cardId) => {
      if (!game.self) throw new Error('Expected a private player fixture.');
      game.self.hand = game.self.hand.filter((card) => card.id !== cardId);
    });
    const confirm = canvas.getByRole('button', { name: 'Play Card' });
    confirm.focus();
    await userEvent.keyboard('{Enter}');

    await expect(storyActions.submitBlank).toHaveBeenCalledOnce();
    await expect(storyActions.submitBlank).toHaveBeenCalledWith(
      'blank-a',
      'A deterministic write-in',
    );
    await waitFor(() =>
      expect(
        canvas.getByRole('group', {
          name: '2 blank cards. Write an answer to play one blank card.',
        }),
      ).toBeVisible(),
    );
    await expect(canvas.getByRole('status')).toHaveTextContent('2 blank cards in your hand');
  },
};

export const AllBlankStackMobile: Story = {
  name: 'Game / all-blank stack (mobile)',
  parameters: {
    route: gameRoute,
    game: gameScenarios.playerAllBlankStack,
    viewport: { defaultViewport: 'mobile' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('list', { name: 'Your answer cards' }).children).toHaveLength(1);
    await expect(
      canvas.getByRole('group', {
        name: '4 blank cards. Write an answer to play one blank card.',
      }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /^Select answer:/ })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Redraw card' })).not.toBeInTheDocument();
  },
};

export const BlankStackVanishesAtZero: Story = {
  name: 'Game / blank stack removed at zero',
  parameters: { route: gameRoute, game: gameScenarios.playerBlankStack },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const game = useGameStore();
    if (!game.self) throw new Error('Expected a private player fixture.');

    game.self.hand = game.self.hand.filter((card) => !card.text.startsWith('%BLANK%'));

    await waitFor(() =>
      expect(canvas.queryByRole('group', { name: /blank cards?/ })).not.toBeInTheDocument(),
    );
    await expect(canvas.getByRole('status')).toHaveTextContent('No blank cards in your hand.');
    await expect(canvas.getAllByRole('button', { name: /^Select answer:/ })).toHaveLength(2);
  },
};

export const BlankStackReconnectingMobile: Story = {
  name: 'Game / blank stack reconnecting (mobile)',
  parameters: {
    route: gameRoute,
    game: gameScenarios.playerBlankStackReconnecting,
    viewport: { defaultViewport: 'mobile' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const game = useGameStore();
    const editor = canvas.getByRole('textbox', { name: 'Your blank answer' });

    editor.focus();
    await userEvent.keyboard('Still here after reconnect');
    await expect(canvas.getByText('Reconnecting to the room...')).toBeVisible();
    if (!game.self) throw new Error('Expected a private player fixture.');
    game.self.hand = [...game.self.hand].reverse();
    game.connectionState = 'open';

    await expect(editor).toHaveValue('Still here after reconnect');
    await expect(
      canvas.getByRole('group', {
        name: '4 blank cards. Selected. Write an answer to play one blank card.',
      }),
    ).toBeVisible();
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
    const answer = canvas.getByRole('button', {
      name: 'Select winner: A group chat that should have stayed private.',
    });
    await userEvent.click(answer);
    await expect(answer).toHaveAttribute('aria-pressed', 'true');
    await expect(storyActions.chooseWinner).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Choose Winner' }));
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
    const heading = await canvas.findByRole('heading', { name: 'Round 3' });
    const status = heading.closest<HTMLElement>('[role="status"]');
    if (!status) throw new Error('Expected the round heading inside a status region.');
    await expect(status).toBeVisible();
    await expect(heading).toBeVisible();
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

export const GameWonGuest: Story = {
  name: 'Results / guest waiting for rematch',
  parameters: { route: resultsRoute, game: gameScenarios.gameWonGuest },
};

export const HostStartsRematch: Story = {
  name: 'Results / host starts rematch',
  parameters: { route: resultsRoute, game: gameScenarios.gameWon },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Play Again' }));
    await expect(storyActions.playAgain).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'At the table' })).toBeVisible(),
    );
  },
};

export const GameCancelled: Story = {
  name: 'Results / game cancelled',
  parameters: { route: resultsRoute, game: gameScenarios.gameCancelled },
};
