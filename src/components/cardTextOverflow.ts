export function hasScrollableCardText(
  element: Pick<HTMLElement, 'clientHeight' | 'scrollHeight'> | null,
): boolean {
  return element !== null && element.scrollHeight > element.clientHeight;
}
