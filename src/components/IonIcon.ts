import { defineComponent, h } from 'vue';
import {
  arrowBack,
  arrowBackCircleOutline,
  arrowForward,
  chatbubbleOutline,
  checkmark,
  informationCircleOutline,
  peopleCircleOutline,
  send,
  settingsOutline,
  time,
  trash,
} from 'ionicons/icons';

const ICONS: Record<string, string> = {
  'arrow-back': arrowBack,
  'arrow-back-circle-outline': arrowBackCircleOutline,
  'arrow-forward': arrowForward,
  'chatbubble-outline': chatbubbleOutline,
  checkmark,
  'information-circle-outline': informationCircleOutline,
  'people-circle-outline': peopleCircleOutline,
  send,
  'settings-outline': settingsOutline,
  time,
  trash,
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
