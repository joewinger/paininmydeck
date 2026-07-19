import { defineComponent, ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import StatusMenu from '@/components/StatusMenu/index.vue';
import { useGameStore } from '@/stores/game';
import { gameScenarios, ROOM_ID } from './fixtures/gameScenarios';

const ResponsiveChatHarness = defineComponent({
  components: { StatusMenu },
  setup() {
    const game = useGameStore();
    const persistentChat = ref(false);
    let messageSequence = 0;

    const toggleLayout = (): void => {
      persistentChat.value = !persistentChat.value;
    };
    const receiveMessage = (): void => {
      messageSequence += 1;
      game.room.chatMessages.push({
        id: `responsive-chat-${messageSequence}`,
        timestamp: 1_700_000_100_000 + messageSequence,
        type: 'chat',
        senderPlayerId: 'rowan',
        senderDisplayName: 'Rowan',
        text: `Responsive message ${messageSequence}`,
      });
    };

    return { persistentChat, receiveMessage, toggleLayout };
  },
  template: `
    <div>
      <div
        role="group"
        aria-label="Responsive chat test controls"
        style="position: fixed; z-index: 4000; top: 8px; left: 8px; display: flex; gap: 8px"
      >
        <button
          type="button"
          style="border-color: #2d2540; background: #fffaf0; color: #2d2540"
          @click="toggleLayout"
        >
          {{ persistentChat ? 'Use narrow layout' : 'Use wide layout' }}
        </button>
        <button
          type="button"
          style="border-color: #2d2540; background: #fffaf0; color: #2d2540"
          @click="receiveMessage"
        >
          Receive message
        </button>
      </div>
      <div style="position: fixed; inset: 82px 18px 0 auto; width: 320px">
        <status-menu :persistent-chat="persistentChat" />
      </div>
    </div>
  `,
});

const meta = {
  title: 'Components/Persistent chat',
  component: ResponsiveChatHarness,
  tags: ['test'],
  parameters: {
    route: `/join/${ROOM_ID}`,
    game: gameScenarios.lobbyHost,
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof ResponsiveChatHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ResponsiveState: Story = {
  name: 'Preserves responsive state and unread semantics',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const controls = within(canvas.getByRole('group', { name: 'Responsive chat test controls' }));

    await userEvent.click(canvas.getByRole('button', { name: /^Chat$/ }));
    await waitFor(() =>
      expect(canvas.getByRole('textbox', { name: 'Chat message' })).toBeVisible(),
    );
    const chatInput = canvas.getByRole('textbox', { name: 'Chat message' });
    const chatLog = canvas.getByRole('log', { name: 'Room chat' });
    const receiveMessage = controls.getByRole('button', { name: 'Receive message' });
    chatInput.focus();
    await expect(chatInput).toHaveFocus();
    await userEvent.type(chatInput, 'Draft survives the breakpoint');
    for (let index = 0; index < 12; index += 1) {
      await userEvent.click(receiveMessage);
    }
    await waitFor(() => expect(chatLog.scrollHeight).toBeGreaterThan(chatLog.clientHeight));
    chatLog.scrollTop = -40;
    const savedScrollTop = chatLog.scrollTop;
    await expect(savedScrollTop).toBeLessThan(0);

    await userEvent.click(controls.getByRole('button', { name: 'Use wide layout' }));
    await waitFor(() =>
      expect(canvas.queryByRole('button', { name: /^Chat$/ })).not.toBeInTheDocument(),
    );
    await expect(canvas.getByRole('region', { name: 'Chat' })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Chat message' })).toBe(chatInput);
    await expect(canvas.getByRole('log', { name: 'Room chat' })).toBe(chatLog);
    await expect(chatInput).toHaveValue('Draft survives the breakpoint');
    await expect(chatLog.scrollTop).toBe(savedScrollTop);

    await userEvent.click(controls.getByRole('button', { name: 'Use narrow layout' }));
    await expect(canvas.getByRole('button', { name: /^Chat$/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(canvas.getByRole('textbox', { name: 'Chat message' })).toBe(chatInput);

    await userEvent.click(chatInput);
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(canvasElement.querySelector('#statusMenuContent-chat')).not.toBeVisible(),
    );
    await expect(canvas.getByRole('button', { name: /^Chat$/ })).toHaveFocus();

    await userEvent.click(receiveMessage);
    await expect(canvas.getByRole('button', { name: 'Chat, unread messages' })).toBeInTheDocument();

    await userEvent.click(controls.getByRole('button', { name: 'Use wide layout' }));
    await waitFor(() => expect(canvas.getByRole('region', { name: 'Chat' })).toBeVisible());
    await userEvent.click(receiveMessage);
    await userEvent.click(controls.getByRole('button', { name: 'Use narrow layout' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: /^Chat$/ })).toBeInTheDocument());
  },
};
