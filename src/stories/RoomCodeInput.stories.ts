import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { expect, userEvent, within } from 'storybook/test';

import RoomCodeInput from '@/components/RoomCodeInput.vue';

const meta = {
  title: 'Components/Room code input',
  component: RoomCodeInput,
  tags: ['autodocs', 'test'],
  parameters: {
    layout: 'centered',
    a11y: { test: 'error' },
    docs: {
      description: {
        component:
          'The controlled five-letter room code field used by Pain in my Deck! It normalizes lowercase input and filters ambiguous letters, numbers, and punctuation.',
      },
    },
  },
  args: {
    modelValue: '',
    label: 'Enter room code',
    invalid: false,
  },
  render: (args) => ({
    components: { RoomCodeInput },
    setup() {
      const roomCode = ref(args.modelValue);
      return { args, roomCode };
    },
    template: `
      <div style="width: min(360px, calc(100vw - 32px))">
        <RoomCodeInput
          v-model="roomCode"
          :label="args.label"
          :invalid="args.invalid"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof RoomCodeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Invalid: Story = {
  args: {
    modelValue: 'DECK',
    invalid: true,
  },
};

export const InputFiltering: Story = {
  name: 'Interaction / input filtering',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Enter room code' });

    await userEvent.type(input, 'i0o-1d3e?c_k!s9');

    await expect(input).toHaveValue('DECKS');
    const cells = canvasElement.querySelectorAll<HTMLElement>('.pimd-room-code__control > span');
    expect(Array.from(cells, (cell) => cell.textContent?.trim()).join('')).toBe('DECKS');
  },
};
