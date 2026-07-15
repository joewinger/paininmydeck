import catalogJson from '../cards/base.json';

export interface CatalogCard {
  id: string;
  text: string;
  type: 'answer' | 'question';
  familySafe: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function readCatalog(): readonly CatalogCard[] {
  const raw: unknown = catalogJson;
  if (!isRecord(raw) || !Array.isArray(raw.cards)) {
    throw new Error('cards/base.json does not contain a card array');
  }

  const cards: CatalogCard[] = [];
  const seen = new Set<string>();
  for (const item of raw.cards) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.text !== 'string' ||
      (item.type !== 'answer' && item.type !== 'question') ||
      !isRecord(item.flags)
    ) {
      throw new Error('cards/base.json contains an invalid card');
    }

    const { flags } = item;
    if (
      !isBoolean(flags.language) ||
      !isBoolean(flags.obscene) ||
      !isBoolean(flags.offensive) ||
      !isBoolean(flags.politics) ||
      !isBoolean(flags.sex)
    ) {
      throw new Error(`Card ${item.id} contains invalid safety flags`);
    }
    if (seen.has(item.id)) {
      throw new Error(`Duplicate card id: ${item.id}`);
    }
    seen.add(item.id);
    cards.push(
      Object.freeze({
        id: item.id,
        text: item.text,
        type: item.type,
        familySafe: !flags.obscene && !flags.offensive && !flags.sex,
      }),
    );
  }

  if (!cards.some((card) => card.type === 'answer')) {
    throw new Error('Card catalog has no answers');
  }
  if (!cards.some((card) => card.type === 'question')) {
    throw new Error('Card catalog has no questions');
  }
  return Object.freeze(cards);
}

export const CARD_CATALOG = readCatalog();

export function answerCards(familyMode: boolean): CatalogCard[] {
  return CARD_CATALOG.filter((card) => card.type === 'answer' && (!familyMode || card.familySafe));
}

export function questionCards(familyMode: boolean): CatalogCard[] {
  return CARD_CATALOG.filter(
    (card) => card.type === 'question' && (!familyMode || card.familySafe),
  );
}

export function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  const random = new Uint32Array(1);
  for (let index = result.length - 1; index > 0; index -= 1) {
    crypto.getRandomValues(random);
    const target = Math.floor((random[0] / 0x1_0000_0000) * (index + 1));
    const value = result[index];
    result[index] = result[target];
    result[target] = value;
  }
  return result;
}
