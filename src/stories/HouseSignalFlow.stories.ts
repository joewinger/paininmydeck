import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, userEvent, within } from 'storybook/test';

import HouseSignalFlow from './HouseSignalFlow.vue';
import './shotgun-house-signal.css';
import './house-signal-flow.css';

const meta = {
  title: 'Brand exploration/Shotgun 2/C — House Signal/Flow',
  component: HouseSignalFlow,
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
    docs: {
      description: {
        component:
          'A deterministic, DOM-based vertical slice carrying the House Signal system from profile setup through final results.',
      },
    },
  },
  argTypes: {
    screen: {
      control: 'select',
      options: ['profile', 'lobby', 'player', 'judging', 'reveal', 'results'],
    },
  },
} satisfies Meta<typeof HouseSignalFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

const mobile = { viewport: { defaultViewport: 'mobile' } };

export const Profile: Story = {
  args: { screen: 'profile' },
  parameters: mobile,
};

export const HostLobby: Story = {
  name: 'Host lobby',
  args: { screen: 'lobby' },
  parameters: mobile,
};

export const PlayerChoosing: Story = {
  name: 'Player choosing',
  args: { screen: 'player' },
  parameters: mobile,
};

export const PlayerSubmitted: Story = {
  name: 'Player submitted / waiting',
  args: {
    screen: 'player',
    initialSelectedAnswerId: 'answer-2',
    initialAnswerSubmitted: true,
  },
  parameters: mobile,
};

export const CzarJudging: Story = {
  name: 'Czar judging',
  args: { screen: 'judging' },
  parameters: mobile,
};

export const CzarDecisionLocked: Story = {
  name: 'Czar decision locked',
  args: {
    screen: 'judging',
    initialSelectedWinnerId: 'judge-3',
    initialWinnerLocked: true,
  },
  parameters: mobile,
};

export const WinnerReveal: Story = {
  name: 'Winner reveal',
  args: { screen: 'reveal' },
  parameters: mobile,
};

export const Results: Story = {
  args: { screen: 'results' },
  parameters: mobile,
};

export const ProfileEntryInteraction: Story = {
  name: 'Interaction / profile entry',
  args: { screen: 'profile' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const callSign = canvas.getByRole('textbox', { name: 'Call sign' });

    await userEvent.type(callSign, 'Casey');
    await userEvent.click(canvas.getByRole('radio', { name: 'Acid yellow' }));
    await expect(canvas.getByRole('radio', { name: 'Acid yellow' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Claim this seat' }));
    await expect(canvas.findByText('Profile set for Casey')).resolves.toBeInTheDocument();
    await expect(canvas.getByText('IDENTITY LOCKED')).toBeVisible();
  },
};

export const AnswerSubmissionInteraction: Story = {
  name: 'Interaction / answer submission',
  args: { screen: 'player' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const answer = canvas.getByRole('button', {
      name: 'Select answer: An aggressively enthusiastic thumbs-up.',
    });

    await userEvent.click(answer);
    await expect(answer).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Transmit selected answer' }));
    await expect(canvas.findByText(/Answer transmitted:/)).resolves.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Answer transmitted' })).toBeDisabled();
  },
};

export const WinnerSelectionInteraction: Story = {
  name: 'Interaction / winner selection',
  args: { screen: 'judging' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const answer = canvas.getByRole('button', {
      name: 'Select winning answer: Calling it “networking” so nobody asks questions.',
    });

    await userEvent.click(answer);
    await expect(answer).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Lock winning signal' }));
    await expect(canvas.findByText(/Winning signal locked:/)).resolves.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Winning signal locked' })).toBeDisabled();
  },
};
