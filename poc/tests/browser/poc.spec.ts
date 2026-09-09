import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
  await expect(page.locator('#count')).toHaveAttribute('data-total', '66343', { timeout: 15000 });
}
async function example(page: Page, id: string) {
  const previous = await page.locator('#results').getAttribute('data-request');
  await page.locator('#example').selectOption(id);
  await expect(page.locator('#results')).not.toHaveAttribute('data-request', previous ?? '');
  await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
}

test('pełny zbiór, profile, źródła dopasowania, sortowanie i oceny', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await expect(page.locator('#profile')).toHaveValue('one');
  await expect(page.locator('#combine')).toHaveValue('AND');
  await expect(page.locator('#results tr')).toHaveCount(100);
  const timings = JSON.parse((await page.locator('#metrics').getAttribute('data-timings'))!);
  await example(page, 'delete');
  await expect(page.locator('#results')).toContainText('PRESSCOM');
  const fuzzyCount = await page.locator('#count').getAttribute('data-total');
  await page.locator('#profile').selectOption('control');
  await expect(page.locator('#count')).not.toHaveAttribute('data-total', fuzzyCount!);
  await page.locator('#profile').selectOption('one');
  await expect(page.locator('#count')).toHaveAttribute('data-total', fuzzyCount!);
  await page.getByText('Dodatkowe filtry', { exact: true }).click();
  await page.locator('#amount').fill('1000');
  await page.locator('#amount-op').selectOption('>');
  await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
  const filtered = await page.locator('#count').getAttribute('data-total');
  await page.getByRole('button', { name: 'Poniesione wydatki', exact: true }).click();
  await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#count')).toHaveAttribute('data-total', filtered!);
  await expect(page.locator('#amount-op')).toHaveValue('>');
  const amounts = await page.locator('#results tr td:nth-child(4)').allTextContents();
  const numeric = amounts.map(value => Number(value.replace(/\s/g, '').replace(',', '.')));
  expect(numeric.every(value => value > 1000)).toBe(true);
  expect(numeric).toEqual([...numeric].sort((a, b) => a - b));
  await page.getByRole('combobox', { name: /Ocena wpisu/ }).first().selectOption('trafny');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksportuj oceny (1)' }).click();
  expect((await download).suggestedFilename()).toBe('oceny-wyszukiwania.json');
  expect(errors).toEqual([]);
  await mkdir('docs/wyniki-poc', { recursive: true });
  await writeFile('docs/wyniki-poc/przegladarka-desktop.json', JSON.stringify({ browser: await page.context().browser()!.version(), viewport: page.viewportSize(), timings, note: 'Lokalny Chromium, zwykłe JSON przez HTTP, bez ograniczenia CPU i sieci.' }, null, 2));
});

test('telefon: wyszukiwanie i poziome przewijanie tabeli', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await example(page, 'school');
  await expect(page.locator('#results')).toContainText('2022:4386');
  const dimensions = await page.evaluate(() => {
    const table = document.querySelector('.table-scroll')!;
    return { page: document.documentElement.scrollWidth, viewport: window.innerWidth, table: table.clientWidth, content: table.scrollWidth };
  });
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.content).toBeGreaterThan(dimensions.table);
  await page.screenshot({ path: 'docs/wyniki-poc/poc-telefon.png', fullPage: true });
  const timings = JSON.parse((await page.locator('#metrics').getAttribute('data-timings'))!);
  await writeFile('docs/wyniki-poc/przegladarka-waski-ekran.json', JSON.stringify({ browser: await page.context().browser()!.version(), viewport: page.viewportSize(), timings, note: 'Wąski viewport desktopowego Chromium; nie jest to pomiar fizycznego telefonu.' }, null, 2));
});

test('kolejne wyniki, literalny numer i pusty wynik', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Pokaż kolejne 100 wpisów' }).click();
  await expect(page.locator('#results tr')).toHaveCount(200);
  await example(page, 'number-global');
  await expect(page.locator('#results tr')).toHaveCount(1);
  await expect(page.locator('#results')).toContainText('2026:302');
  await example(page, 'number-wrong');
  await expect(page.locator('#count')).toHaveAttribute('data-total', '0');
  await expect(page.locator('#empty')).toBeVisible();
});

test('błąd pobrania danych jest widoczny', async ({ page }) => {
  // Browser-context routing also intercepts worker requests.
  await page.context().route('**/generated/records.json', route => route.fulfill({ status: 503, body: 'Niedostępne' }));
  await page.goto('/');
  await expect(page.locator('#status')).toContainText('Błąd:', { timeout: 60000 });
  await expect(page.locator('#query')).toBeDisabled();
});

test('pomiar odpowiedzi workera i przygotowania widocznych wierszy', async ({ page }) => {
  await ready(page);
  await page.locator('#profile').selectOption('adaptive');
  const measurements = [];
  for (const id of ['case', 'delete', 'topic', 'topic-swap', 'school', 'training', 'global', 'global-cross', 'none']) {
    await example(page, id);
    const timing = JSON.parse((await page.locator('#timing').getAttribute('data-measurement'))!);
    measurements.push({ caseId: id, ...timing });
  }
  await writeFile('docs/wyniki-poc/przegladarka-zapytania.json', JSON.stringify({
    browser: await page.context().browser()!.version(), profile: 'adaptive', combine: 'AND', measurements,
    note: 'Pojedyncze lokalne pomiary. responseAndDomMs obejmuje wysłanie do workera, odpowiedź i zmiany DOM, ale nie gwarantuje zakończenia rysowania obrazu. Bez ograniczenia CPU i sieci.',
  }, null, 2));
  await example(page, 'topic');
  await page.screenshot({ path: 'docs/wyniki-poc/poc-desktop.png', fullPage: true });
});
