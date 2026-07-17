import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, within } from 'storybook/test';

import InfoBar from '@/components/InfoBar.vue';

const meta = {
  title: 'Components/Info bar',
  component: InfoBar,
  tags: ['autodocs', 'test'],
  parameters: { layout: 'centered' },
  args: {
    text: 'Reconnecting to the room...',
  },
} satisfies Meta<typeof InfoBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Reconnecting: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('Reconnecting to the room...')).resolves.toBeVisible();
    await expect(canvasElement.querySelector('.info-bar__icon')).toHaveTextContent('↻');
    await expect(canvasElement.querySelector('#infoBar')).toHaveAttribute(
      'data-status',
      'reconnecting',
    );
  },
};

export const Connecting: Story = {
  args: {
    text: 'Connecting to the room...',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.info-bar__icon')).toHaveTextContent('…');
    await expect(canvasElement.querySelector('.info-bar__icon')).not.toHaveTextContent('↻');
  },
};

export const WaitingForPlayer: Story = {
  args: {
    text: 'Waiting for Sam to reconnect...',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.info-bar__icon')).toHaveTextContent('◷');
    await expect(canvasElement.querySelector('.info-bar__icon')).not.toHaveTextContent('↻');
  },
};

export const CzarRole: Story = {
  args: {
    text: 'You are the Card Czar!',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.info-bar__icon')).toHaveTextContent('★');
  },
};

export const CzarAction: Story = {
  args: {
    text: 'Select the winning card!',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.info-bar__icon')).toHaveTextContent('→');
  },
};

export const Winner: Story = {
  args: {
    text: 'Sam wins the round!',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.info-bar__icon')).toHaveTextContent('✓');
  },
};

export const DefaultInfo: Story = {
  args: {
    text: 'Room rules updated.',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.info-bar__icon')).toHaveTextContent('i');
    await expect(canvasElement.querySelector('#infoBar')).toHaveAttribute('data-status', 'info');
  },
};
