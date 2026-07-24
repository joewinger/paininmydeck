import { describe, expect, it } from 'vitest';

import type { Card } from '@/shared/protocol';
import { presentHandCards } from '@/views/blankCardStack';

const answerA: Card = { id: 'answer-a', text: 'A regular answer.' };
const answerB: Card = { id: 'answer-b', text: 'Another regular answer.' };
const blankZ: Card = { id: 'blank-z', text: '%BLANK%', blank: true };
const blankA: Card = { id: 'blank-a', text: '%BLANK%', blank: true };
const blankM: Card = { id: 'blank-m', text: '%BLANK%', blank: true };

describe('blank-card hand presentation', () => {
  it('keeps regular cards individual and inserts one counted stack at the first blank slot', () => {
    expect(presentHandCards([answerA, blankZ, answerB, blankA, blankM], null)).toEqual([
      { card: answerA },
      { card: blankA, blankCount: 3 },
      { card: answerB },
    ]);
  });

  it('uses the same stack presentation for a single blank', () => {
    expect(presentHandCards([answerA, blankZ], null)).toEqual([
      { card: answerA },
      { card: blankZ, blankCount: 1 },
    ]);
  });

  it('renders an all-blank hand as one stack and no regular cards', () => {
    expect(presentHandCards([blankZ, blankA, blankM], null)).toEqual([
      { card: blankA, blankCount: 3 },
    ]);
  });

  it('keeps the selected underlying ID across reordered and reduced snapshots', () => {
    expect(presentHandCards([blankM, answerA, blankA], 'blank-m')).toEqual([
      { card: blankM, blankCount: 2 },
      { card: answerA },
    ]);
  });

  it('removes the stack when no blank instances remain', () => {
    expect(presentHandCards([answerA, answerB], 'blank-a')).toEqual([
      { card: answerA },
      { card: answerB },
    ]);
  });
});
