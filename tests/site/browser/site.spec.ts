import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ROW_HEIGHT } from '../../../src/ui/window.ts';

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
  await expect(page.locator('#count')).toHaveAttribute('data-total', '66343');
}
async function submit(page: Page) {
  const before = await page.locator('#results').getAttribute('data-request');
  await page.getByRole('button', { name: 'Szukaj', exact: true }).click();
  await expect(page.locator('#results')).not.toHaveAttribute('data-request', before ?? '');
  await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
}
test('pełny zbiór, stałe ustawienia i dwie kolumny', async ({ page }) => {
  await ready(page);
  await expect(page.locator('tr.entry-row')).toHaveCount(100);
  await expect(page.locator('#profile, #combine, #scope, #example')).toHaveCount(0);
  await page.locator('#filter-contractorName').fill('prescom');
  await page.locator('#filter-contractSubject').fill('szkolenie');
  await submit(page);
  await expect(page.locator('#count')).toHaveAttribute('data-total', '131');
  await page.locator('#query').fill('qzxvjkqzxv');
  await submit(page);
  await expect(page.locator('#count')).toHaveAttribute('data-total', '0');
});
test('sortowanie zachowuje filtry, literówki w numerze nie pasują', async ({ page }) => {
  await ready(page);
  await page.locator('#filter-contractNumber').fill('/2766/WKIO/215/');
  await submit(page);
  await expect(page.locator('tr.entry-row')).toHaveCount(1);
  await expect(page.locator('tr.entry-row')).toHaveAttribute('data-id', '2026:302');
  await page.getByRole('button', { name: 'Poniesione wydatki', exact: true }).click();
  await expect(page.locator('#filter-contractNumber')).toHaveValue('/2766/WKIO/215/');
  await expect(page.locator('#count')).toHaveAttribute('data-total', '1');
  await page.locator('#filter-contractNumber').fill('/2766/WKIO/999/');
  await submit(page);
  await expect(page.locator('#count')).toHaveAttribute('data-total', '0');
});
test('wąski ekran i pełny długi opis', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.locator('#filter-contractNumber').fill('RWB-W/3989/BI/240/');
  await submit(page);
  await page.getByRole('button', { name: 'Rozwiń wpis 2015:2614', exact: true }).click();
  await expect(page.locator('#record-dialog')).toBeVisible();
  await expect(page.locator('#record-fields')).toContainText('MIECZYSŁAW ROBAKOWSKI');
  await page.keyboard.press('Escape');
  await expect(page.locator('#record-dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('błąd pobrania nie pokazuje niepełnych wyników', async ({ page }) => {
  await page.context().route('**/generated/manifest.json', route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/');
  await expect(page.getByText('Nie udało się wczytać danych.', { exact: true })).toBeVisible();
  await expect(page.locator('#query')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Spróbuj ponownie' })).toBeVisible();
});

test('długie przewijanie nie gromadzi wszystkich wierszy', async ({ page }) => {
  await ready(page);
  const first = await page.locator('tr.entry-row').first().getAttribute('data-id');
  for (let step = 0; step < 35; step++) {
    const previousHeight = await page.locator('.table-scroll').evaluate(element => element.scrollHeight);
    await page.locator('.table-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect.poll(() => page.locator('.table-scroll').evaluate(element => element.scrollHeight)).toBeGreaterThan(previousHeight);
    expect(await page.locator('tr.entry-row').count()).toBeLessThanOrEqual(300);
  }
  await page.locator('.table-scroll').evaluate(element => { element.scrollTop = 0; });
  await expect(page.locator('tr.entry-row').first()).toHaveAttribute('data-id', first!);
  await expect(page.locator('#count')).toHaveAttribute('data-total', '66343');
});

test('klawiatura zachowuje kolejność wpisów przy rozszerzaniu i przesuwaniu okna', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  await page.locator('tr.entry-row button').first().focus();
  const sizes = new Set<number>();
  for (let index = 0; index < 340; index++) {
    if (index) await page.keyboard.press('Tab');
    // Let keyboard scrolling and its animation-frame window update run before checking focus.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator(`tr.entry-row[aria-rowindex="${index + 3}"] button`)).toBeFocused();
    const size = await page.locator('tr.entry-row').count();
    expect(size).toBeLessThanOrEqual(300);
    sizes.add(size);
  }
  expect([...sizes]).toEqual([100, 200, 300]);
  expect(Number(await page.locator('tr.entry-row').first().getAttribute('aria-rowindex'))).toBeGreaterThan(3);
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('tr.entry-row[aria-rowindex="341"] button')).toBeFocused();
});

test('wysokość wierszy odpowiada oknu także po zmianie szerokości', async ({ page }) => {
  await ready(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const heights = await page.locator('tr.entry-row').evaluateAll(rows => rows.map(row => row.getBoundingClientRect().height));
    expect([...new Set(heights)]).toEqual([ROW_HEIGHT]);
    const table = page.locator('.table-scroll');
    await table.evaluate(element => { element.scrollLeft = element.scrollWidth; });
    await expect(page.getByRole('button', { name: 'Obowiązuje do dnia', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('wydziały: klawiatura, zachowanie wyboru i liczebności po kwocie', async ({ page }) => {
  await ready(page);
  const summary = page.locator('.department-picker summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.department-picker')).toHaveAttribute('open', '');
  await page.keyboard.press('Tab');
  await expect(page.locator('#department-text')).toBeFocused();
  await page.locator('#department-text').fill('kadr');
  await page.keyboard.press('Tab');
  const checkbox = page.locator('#departments input').first();
  await expect(checkbox).toBeFocused();
  const name = await checkbox.inputValue();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
  await page.locator('#department-text').fill('qzxvjkqzxv');
  await expect(page.locator('#departments input')).toHaveCount(0);
  await expect(page.locator('#department-selected')).toHaveText('(1)');
  await page.locator('#department-text').fill('kadr');
  await expect(page.locator('#departments input').filter({ visible: true }).first()).toBeChecked();
  expect(await checkbox.inputValue()).toBe(name);
  await page.locator('#amount').fill('1000');
  await page.locator('#amount-op').selectOption('>');
  await submit(page);
  const total = Number(await page.locator('#count').getAttribute('data-total'));
  expect(total).toBeGreaterThan(0);
  const label = await checkbox.locator('..').textContent();
  expect(Number(label!.match(/\(([\d\s]+)\)$/u)![1].replace(/\s/g, ''))).toBe(total);
  const amounts = await page.locator('tr.entry-row td.number').allTextContents();
  expect(amounts.every(value => Number(value.replace(/\s/g, '').replace(',', '.')) > 1000)).toBe(true);
});

test('ponowne pobranie przywraca pełny zbiór po błędzie', async ({ page }) => {
  const pattern = '**/generated/manifest.json';
  await page.context().route(pattern, route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/');
  await expect(page.getByText('Nie udało się wczytać danych.', { exact: true })).toBeVisible();
  await expect(page.locator('tr.entry-row')).toHaveCount(0);
  await page.context().unroute(pattern);
  await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await expect(page.locator('#count')).toHaveAttribute('data-total', '66343', { timeout: 60000 });
  await expect(page.locator('#query')).toBeEnabled();
});
