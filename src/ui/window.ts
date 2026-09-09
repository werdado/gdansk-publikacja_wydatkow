import { MAX_WINDOW_ROWS, PAGE_SIZE } from '../pagination.ts';

export const ROW_HEIGHT = 128;

export function windowFor(scrollTop: number, viewport: number, total: number, visible: number) {
  const first = Math.floor(Math.max(0, scrollTop) / ROW_HEIGHT);
  const nearEnd = first + Math.ceil(viewport / ROW_HEIGHT) >= visible - 10;
  const nextVisible = Math.min(total, visible + (nearEnd ? PAGE_SIZE : 0));
  const lastPage = Math.floor(Math.max(0, nextVisible - 1) / PAGE_SIZE);
  const start = Math.max(0, Math.min(lastPage, Math.floor(first / PAGE_SIZE) - 1) * PAGE_SIZE);
  const end = Math.min(nextVisible, start + MAX_WINDOW_ROWS);
  return { start, end, visible: nextVisible, top: start * ROW_HEIGHT, bottom: (nextVisible - end) * ROW_HEIGHT };
}
