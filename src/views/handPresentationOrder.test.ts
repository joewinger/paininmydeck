import { describe, expect, it } from 'vitest';

import { cardsInHandOrder, reconcileHandOrder, shuffleHandOrder } from './handPresentationOrder';

const hand = [
  { id: 'one', text: 'One' },
  { id: 'two', text: 'Two' },
  { id: 'three', text: 'Three' },
];

describe('hand presentation order', () => {
  it('keeps the local order when an unchanged hand arrives in a different server order', () => {
    const authoritativeHand = [hand[2], hand[0], hand[1]];

    expect(reconcileHandOrder(['two', 'three', 'one'], authoritativeHand)).toEqual([
      'two',
      'three',
      'one',
    ]);
    expect(cardsInHandOrder(authoritativeHand, ['two', 'three', 'one'])).toEqual([
      hand[1],
      hand[2],
      hand[0],
    ]);
  });

  it('drops removed cards and appends newly dealt cards after the surviving local order', () => {
    const changedHand = [
      { id: 'four', text: 'Four' },
      hand[2],
      { id: 'five', text: 'Five' },
      hand[0],
    ];

    expect(reconcileHandOrder(['two', 'three', 'one'], changedHand)).toEqual([
      'three',
      'one',
      'four',
      'five',
    ]);
  });

  it('uses fresh card data without changing its presentation position', () => {
    const updatedHand = [{ id: 'one', text: 'Updated one' }, hand[1], hand[2]];

    expect(cardsInHandOrder(updatedHand, ['three', 'one', 'two'])).toEqual([
      hand[2],
      updatedHand[0],
      hand[1],
    ]);
  });

  it('shuffles a copy and guarantees a visible change when at least two cards exist', () => {
    const original = ['one', 'two', 'three'];

    expect(shuffleHandOrder(original, () => 0.999)).toEqual(['three', 'one', 'two']);
    expect(original).toEqual(['one', 'two', 'three']);
    expect(shuffleHandOrder(['one'], () => 0.999)).toEqual(['one']);
  });
});
