import { onBeforeUnmount, onMounted, readonly, ref, type DeepReadonly, type Ref } from 'vue';

export const PERSISTENT_CHAT_MEDIA_QUERY = '(min-width: 1380px)';

export function usePersistentChatLayout(): DeepReadonly<Ref<boolean>> {
  const persistentChat = ref(
    typeof window !== 'undefined' && window.matchMedia(PERSISTENT_CHAT_MEDIA_QUERY).matches,
  );
  let mediaQuery: MediaQueryList | null = null;

  const update = (event: MediaQueryListEvent | MediaQueryList): void => {
    persistentChat.value = event.matches;
  };

  onMounted(() => {
    mediaQuery = window.matchMedia(PERSISTENT_CHAT_MEDIA_QUERY);
    update(mediaQuery);
    mediaQuery.addEventListener('change', update);
  });

  onBeforeUnmount(() => mediaQuery?.removeEventListener('change', update));

  return readonly(persistentChat);
}
