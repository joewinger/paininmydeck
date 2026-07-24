import type { Card } from '@/shared/protocol';

export interface PresentedHandCard {
  card: Card;
  blankCount?: number;
}

export function isEditableBlankCard(card: Card): boolean {
  return card.text.startsWith('%BLANK%');
}

/**
 * Collapse blank instances for presentation only. The representative remains an
 * authoritative card from the hand, and a selected representative wins over
 * ID ordering so an in-progress draft survives reordered snapshots.
 */
export function presentHandCards(
  hand: readonly Card[],
  selectedCardId: string | null,
): PresentedHandCard[] {
  const blanks = hand.filter(isEditableBlankCard);
  if (blanks.length === 0) return hand.map((card) => ({ card }));

  const selectedBlank = blanks.find((card) => card.id === selectedCardId);
  const representative =
    selectedBlank ?? blanks.reduce((lowest, card) => (card.id < lowest.id ? card : lowest));
  let stackInserted = false;

  return hand.flatMap((card) => {
    if (!isEditableBlankCard(card)) return [{ card }];
    if (stackInserted) return [];
    stackInserted = true;
    return [{ card: representative, blankCount: blanks.length }];
  });
}
