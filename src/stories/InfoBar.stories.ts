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
    await expect(
      within(canvasElement).findByText('Reconnecting to the room...'),
    ).resolves.toBeVisible();
  },
};

export const WaitingForPlayer: Story = {
  args: {
    text: 'Waiting for Sam to reconnect...',
  },
};
