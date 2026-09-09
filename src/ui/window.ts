export const ROW_HEIGHT = 128;

export function windowFor(scrollTop: number, viewport: number, total: number, visible: number) {
  const first = Math.floor(Math.max(0, scrollTop) / ROW_HEIGHT);
  const nearEnd = first + Math.ceil(viewport / ROW_HEIGHT) >= visible - 10;
  const nextVisible = Math.min(total, visible + (nearEnd ? 100 : 0));
  const lastPage = Math.floor(Math.max(0, nextVisible - 1) / 100);
  const start = Math.max(0, Math.min(lastPage, Math.floor(first / 100) - 1) * 100);
  const end = Math.min(nextVisible, start + 300);
  return { start, end, visible: nextVisible, top: start * ROW_HEIGHT, bottom: (nextVisible - end) * ROW_HEIGHT };
}
