import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

type CardFlags = {
  language: boolean;
  obscene: boolean;
  offensive: boolean;
  politics: boolean;
  sex: boolean;
};

type Card = {
  id: string;
  text: string;
  type: 'answer' | 'question';
  flags: CardFlags;
  pick?: number;
};

type Catalog = {
  schemaVersion: number;
  catalog: {
    id: string;
    version: string;
    source: {
      kind: string;
      projectId: string;
      database: string;
      collection: string;
      deck: string;
      exportedOn: string;
    };
    license: {
      spdx: string;
    };
    counts: {
      total: number;
      answers: number;
      questions: number;
      familySafeAnswers: number;
      familySafeQuestions: number;
    };
    cardsSha256: string;
  };
  cards: Card[];
};

const catalogPath = fileURLToPath(new URL('../../cards/base.json', import.meta.url));
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as Catalog;
const cards = catalog.cards;
const answers = cards.filter((card) => card.type === 'answer');
const questions = cards.filter((card) => card.type === 'question');
const familySafe = cards.filter(
  (card) => !card.flags.obscene && !card.flags.offensive && !card.flags.sex,
);

const EXPECTED_CARDS_SHA256 = 'f426fbd88adac1690b78d6529b8cf092678ce7d88aacc2aaa3417a09ef020d7c';

describe('legacy CAH base catalog', () => {
  it('pins its schema, provenance, version, and license', () => {
    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.catalog.id).toBe('cah-base');
    expect(catalog.catalog.version).toBe('legacy-firestore-2026-07-15');
    expect(catalog.catalog.source).toEqual({
      kind: 'legacy-firestore-export',
      projectId: 'paininmydeck',
      database: '(default)',
      collection: 'cards',
      deck: 'CAH_BASE',
      exportedOn: '2026-07-15',
    });
    expect(catalog.catalog.license.spdx).toBe('CC-BY-NC-SA-2.0');
  });

  it('contains exactly the expected original single-answer deck', () => {
    expect(cards).toHaveLength(534);
    expect(answers).toHaveLength(458);
    expect(questions).toHaveLength(76);
    expect(questions.every((card) => card.pick === 1)).toBe(true);
    expect(answers.every((card) => card.pick === undefined)).toBe(true);
    expect(catalog.catalog.counts).toEqual({
      total: 534,
      answers: 458,
      questions: 76,
      familySafeAnswers: 305,
      familySafeQuestions: 71,
    });
  });

  it('preserves stable IDs, exact non-empty text, and complete boolean flags', () => {
    const expectedFlagNames = ['language', 'obscene', 'offensive', 'politics', 'sex'];

    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);

    for (const card of cards) {
      expect(card.id).toMatch(/^[A-Za-z0-9]{20}$/);
      expect(card.text).not.toBe('');
      expect(card.text).toBe(card.text.trim());
      expect(card.text).toBe(card.text.normalize('NFC'));
      expect(Object.keys(card.flags).sort()).toEqual(expectedFlagNames);
      expect(Object.values(card.flags).every((flag) => typeof flag === 'boolean')).toBe(true);
    }
  });

  it('matches the legacy family-mode projection', () => {
    expect(familySafe.filter((card) => card.type === 'answer')).toHaveLength(305);
    expect(familySafe.filter((card) => card.type === 'question')).toHaveLength(71);
  });

  it('retains the complete legacy flag classifications', () => {
    const flagged = (flag: keyof CardFlags) => cards.filter((card) => card.flags[flag]).length;

    expect(flagged('language')).toBe(8);
    expect(flagged('obscene')).toBe(35);
    expect(flagged('offensive')).toBe(51);
    expect(flagged('politics')).toBe(11);
    expect(flagged('sex')).toBe(102);
  });

  it('matches the pinned content digest', () => {
    const digest = createHash('sha256').update(JSON.stringify(cards)).digest('hex');

    expect(catalog.catalog.cardsSha256).toBe(EXPECTED_CARDS_SHA256);
    expect(digest).toBe(EXPECTED_CARDS_SHA256);
  });
});
