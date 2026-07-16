import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, userEvent, within } from 'storybook/test';

import OddballFlow from './OddballFlow.vue';
import './oddball-social-club.css';
import './oddball-flow.css';

const meta = {
  title: 'Brand exploration/Option C — Oddball Social Club/Flow',
  component: OddballFlow,
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
    docs: {
      description: {
        component:
          'A deterministic, DOM-based vertical slice that carries the handmade Oddball Social Club language through the complete game flow.',
      },
    },
  },
  args: {
    roomCode: 'DECKS',
  },
  argTypes: {
    screen: {
      control: 'select',
      options: ['profile', 'lobby', 'player', 'waiting', 'judging', 'reveal', 'results'],
    },
  },
} satisfies Meta<typeof OddballFlow>;

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

export const PlayerSubmittedWaiting: Story = {
  name: 'Player submitted / waiting',
  args: { screen: 'waiting' },
  parameters: mobile,
};

export const CzarJudging: Story = {
  name: 'Czar judging',
  args: { screen: 'judging' },
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
    const submit = canvas.getByRole('button', { name: 'Take my seat' });

    await userEvent.click(submit);
    await expect(canvas.getByText('Write a call sign before taking the seat.')).toBeVisible();

    await userEvent.type(canvas.getByRole('textbox', { name: 'Call sign' }), 'Casey');
    await userEvent.click(canvas.getByRole('radio', { name: 'Yellow club badge' }));
    await expect(canvas.getByRole('radio', { name: 'Yellow club badge' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(submit);
    await expect(canvas.getByText('Casey has a seat. Badge stamped and ready.')).toBeVisible();
  },
};

export const AnswerSubmissionInteraction: Story = {
  name: 'Interaction / answer selection and submission',
  args: { screen: 'player' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const answer = canvas.getByRole('button', {
      name: 'Select answer: Trying to look casual while everything is on fire.',
    });

    await userEvent.click(answer);
    await expect(answer).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByText(/Selected: Trying to look casual/)).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Submit this card' }));
    await expect(canvas.getByText(/Card submitted: Trying to look casual/)).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Card is in' })).toBeDisabled();
  },
};

export const WinnerSelectionInteraction: Story = {
  name: 'Interaction / change and lock winner',
  args: { screen: 'judging' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const firstAnswer = canvas.getByRole('button', {
      name: 'Select winning answer: A group chat that should have stayed private.',
    });
    const finalAnswer = canvas.getByRole('button', {
      name: 'Select winning answer: Calling it “networking” so nobody asks questions.',
    });

    await userEvent.click(firstAnswer);
    await expect(firstAnswer).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(finalAnswer);
    await expect(firstAnswer).toHaveAttribute('aria-pressed', 'false');
    await expect(finalAnswer).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(canvas.getByRole('button', { name: 'Lock winner' }));
    await expect(canvas.getByText(/Winner locked: Calling it/)).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Winner locked' })).toBeDisabled();
    await expect(finalAnswer).toBeDisabled();
  },
};
