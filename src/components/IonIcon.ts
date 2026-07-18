import { defineComponent, h } from 'vue';
import {
  arrowBack,
  arrowBackCircleOutline,
  arrowForward,
  chatbubbleOutline,
  checkmark,
  createOutline,
  informationCircleOutline,
  peopleCircleOutline,
  send,
  settingsOutline,
  shieldCheckmarkOutline,
  time,
  timeOutline,
  timerOutline,
  trash,
  trashOutline,
} from 'ionicons/icons';

const ICONS: Record<string, string> = {
  'arrow-back': arrowBack,
  'arrow-back-circle-outline': arrowBackCircleOutline,
  'arrow-forward': arrowForward,
  'chatbubble-outline': chatbubbleOutline,
  checkmark,
  'create-outline': createOutline,
  'information-circle-outline': informationCircleOutline,
  'people-circle-outline': peopleCircleOutline,
  send,
  'settings-outline': settingsOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  time,
  'time-outline': timeOutline,
  'timer-outline': timerOutline,
  trash,
  'trash-outline': trashOutline,
};

function svgMarkup(dataUri: string | undefined): string {
  if (!dataUri) return '';
  const comma = dataUri.indexOf(',');
  return comma === -1 ? '' : dataUri.slice(comma + 1);
}

export default defineComponent({
  name: 'IonIcon',
  inheritAttrs: false,
  props: {
    name: { type: String, required: true },
  },
  setup(props, { attrs }) {
    return () =>
      h(
        'ion-icon',
        {
          ...attrs,
          name: props.name,
          role: 'img',
          'aria-label': props.name.replaceAll('-', ' '),
        },
        [h('div', { class: 'icon-inner', innerHTML: svgMarkup(ICONS[props.name]) })],
      );
  },
});
