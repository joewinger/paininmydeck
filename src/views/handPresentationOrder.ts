import type { Card } from '@/shared/protocol';

type RandomSource = () => number;

/**
 * Preserve the player's local order for cards that still exist, then append
 * newly dealt cards in the order supplied by the authoritative snapshot.
 */
export function reconcileHandOrder(
  currentOrder: readonly string[],
  authoritativeHand: readonly Pick<Card, 'id'>[],
): string[] {
  const authoritativeIds = new Set(authoritativeHand.map((card) => card.id));
  const includedIds = new Set<string>();
  const nextOrder: string[] = [];

  for (const cardId of currentOrder) {
    if (!authoritativeIds.has(cardId) || includedIds.has(cardId)) continue;
    includedIds.add(cardId);
    nextOrder.push(cardId);
  }

  for (const card of authoritativeHand) {
    if (includedIds.has(card.id)) continue;
    includedIds.add(card.id);
    nextOrder.push(card.id);
  }

  return nextOrder;
}

export function cardsInHandOrder<T extends Pick<Card, 'id'>>(
  authoritativeHand: readonly T[],
  presentationOrder: readonly string[],
): T[] {
  const cardsById = new Map(authoritativeHand.map((card) => [card.id, card]));
  return reconcileHandOrder(presentationOrder, authoritativeHand).map((cardId) =>
    cardsById.get(cardId)!,
  );
}

/** Fisher-Yates shuffle with an identity fallback so an actionable click moves cards. */
export function shuffleHandOrder(
  currentOrder: readonly string[],
  random: RandomSource = Math.random,
): string[] {
  const shuffled = [...currentOrder];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.length > 1 && shuffled.every((cardId, index) => cardId === currentOrder[index])) {
    shuffled.unshift(shuffled.pop()!);
  }

  return shuffled;
}

/** Shuffle one presentation group as a single visible unit. */
export function shuffleHandOrderWithGroup(
  currentOrder: readonly string[],
  groupedCardIds: readonly string[],
  random: RandomSource = Math.random,
): string[] {
  const groupedIdSet = new Set(groupedCardIds);
  const groupedOrder = currentOrder.filter((cardId) => groupedIdSet.has(cardId));
  if (groupedOrder.length === 0) return shuffleHandOrder(currentOrder, random);

  const visibleUnits: string[][] = [];
  let groupInserted = false;
  for (const cardId of currentOrder) {
    if (!groupedIdSet.has(cardId)) {
      visibleUnits.push([cardId]);
      continue;
    }
    if (groupInserted) continue;
    visibleUnits.push(groupedOrder);
    groupInserted = true;
  }

  const unitOrder = visibleUnits.map((_, index) => String(index));
  return shuffleHandOrder(unitOrder, random).flatMap((index) => visibleUnits[Number(index)]);
}
