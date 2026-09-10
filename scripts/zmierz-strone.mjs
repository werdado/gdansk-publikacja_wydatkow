// Zewnętrzny pomiar produkcyjnego buildu. Instrumentacja istnieje tylko w tej sesji.
import { chromium, expect } from '@playwright/test';
import { preview } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';

const CASES = [
  { id: 'case', text: 'pReSsCoM', scope: 'contractorName' },
  { id: 'delete', text: 'prescom', scope: 'contractorName' },
  { id: 'topic', text: 'remont', scope: 'contractSubject' },
  { id: 'topic-swap', text: 'remnot', scope: 'contractSubject' },
  { id: 'school', text: 'remont szkoly', scope: 'contractSubject' },
  { id: 'training', text: 'szkolenie', scope: 'contractSubject' },
  { id: 'global', text: 'presscom szkolenie', scope: 'global' },
  { id: 'global-cross', text: 'sportu koszykowki', scope: 'global' },
  { id: 'none', text: 'qzxvjkqzxv', scope: 'contractSubject' },
];

const output = 'docs/wyniki-strony';
await mkdir(output, { recursive: true });
const server = await preview({ configFile: 'vite.site.config.ts', preview: { host: '127.0.0.1', port: 4174, strictPort: true } });
let browser;
try {
  browser = await chromium.launch();
  const instrument = async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => {
      window.__measurements = [];
      window.__workerCreated = performance.now();
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(url, options) {
          const absolute = new URL(url, location.href).href;
          const source = `import ${JSON.stringify(absolute)};
            let started = 0;
            const receive = self.onmessage, send = self.postMessage.bind(self);
            self.onmessage = event => { started = performance.timeOrigin + performance.now(); return receive(event); };
            self.postMessage = message => send({ ...message, __measurement: { started, sent: performance.timeOrigin + performance.now() } });`;
          const blob = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
          super(blob, options);
          window.__workerCreated = performance.now();
          this.sent = new Map();
        }
        postMessage(message) {
          this.sent.set(message.type === 'init' ? 'ready' : `${message.requestId}:${message.windowId ?? 0}`, performance.timeOrigin + performance.now());
          super.postMessage(message);
        }
        set onmessage(handler) {
          super.onmessage = event => {
            const received = performance.timeOrigin + performance.now();
            const data = event.data, worker = data.__measurement;
            const sent = this.sent.get(data.type === 'ready' ? 'ready' : `${data.requestId}:${data.windowId ?? 0}`);
            handler.call(this, event);
            const rendered = performance.timeOrigin + performance.now();
            const measurement = {
              type: data.type, requestId: data.requestId, windowId: data.windowId, total: data.total,
              dispatchMs: worker.started - sent, workerMs: worker.sent - worker.started,
              responseTransferMs: received - worker.sent, domMs: rendered - received,
              responseAndDomMs: rendered - sent,
              navigationToDomMs: rendered - performance.timeOrigin,
            };
            window.__measurements.push(measurement);
            requestAnimationFrame(() => requestAnimationFrame(() => {
              measurement.throughTwoFramesMs = performance.timeOrigin + performance.now() - received;
            }));
          };
        }
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    return { context, page, cdp, errors };
  };
  const cold = [];
  let session;
  for (let run = 0; run < 3; run++) {
    await session?.context.close();
    session = await instrument();
    const { page } = session;
    await page.goto('http://127.0.0.1:4174');
    await expect(page.locator('#count')).toHaveAttribute('data-total', '66343', { timeout: 60000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    cold.push(await page.evaluate(() => ({ workerCreatedMs: window.__workerCreated, events: window.__measurements.slice() })));
  }
  const { context, page, cdp, errors } = session;
  const submit = async () => {
    const before = await page.locator('#results').getAttribute('data-request');
    await page.getByRole('button', { name: 'Szukaj', exact: true }).click();
    await expect(page.locator('#results')).not.toHaveAttribute('data-request', before ?? '');
    await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const queries = [];
  let previous;
  for (const id of ['case', 'delete', 'topic', 'topic-swap', 'school', 'training', 'global', 'global-cross', 'none']) {
    const item = CASES.find(item => item.id === id);
    if (previous) await page.locator(previous).fill('');
    const selector = item.scope === 'global' ? '#query' : '#filter-' + item.scope;
    await page.locator(selector).fill(item.text);
    await submit();
    queries.push({ caseId: id, text: item.text, scope: item.scope, ...await page.evaluate(() => window.__measurements.filter(item => item.type === 'result' && item.windowId === 0).at(-1)) });
    previous = selector;
  }
  await page.getByRole('button', { name: 'Wyczyść filtry' }).click();
  await expect(page.locator('#count')).toHaveAttribute('data-total', '66343');
  const root = await browser.newBrowserCDPSession();
  const targets = await root.send('Target.getTargets');
  const target = targets.targetInfos.find(target => target.type === 'worker');
  const { sessionId } = await root.send('Target.attachToTarget', { targetId: target.targetId, flatten: false });
  let commandId = 0;
  const workerCommand = (method) => new Promise((resolve, reject) => {
    const id = ++commandId;
    const listener = event => {
      const message = JSON.parse(event.message);
      if (event.sessionId !== sessionId || message.id !== id) return;
      root.off('Target.receivedMessageFromTarget', listener);
      if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result);
    };
    root.on('Target.receivedMessageFromTarget', listener);
    root.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method }) }).catch(reject);
  });
  const memory = async () => {
    const beforeGC = { main: await cdp.send('Runtime.getHeapUsage'), worker: await workerCommand('Runtime.getHeapUsage') };
    await cdp.send('HeapProfiler.collectGarbage');
    await workerCommand('HeapProfiler.collectGarbage');
    return { beforeGC, afterGC: { main: await cdp.send('Runtime.getHeapUsage'), worker: await workerCommand('Runtime.getHeapUsage') } };
  };
  const beforeMemory = await memory();
  const first = await page.locator('tr.entry-row').first().getAttribute('data-id');
  const scroll = [];
  for (let step = 0; step < 35; step++) {
    const previousHeight = await page.locator('.table-scroll').evaluate(element => element.scrollHeight);
    await page.locator('.table-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect.poll(() => page.locator('.table-scroll').evaluate(element => element.scrollHeight)).toBeGreaterThan(previousHeight);
    const sample = await page.evaluate(() => ({
      rows: document.querySelectorAll('tr.entry-row').length,
      height: document.querySelector('.table-scroll').scrollHeight,
      firstIndex: Number(document.querySelector('tr.entry-row').getAttribute('aria-rowindex')) - 2,
      lastIndex: Number([...document.querySelectorAll('tr.entry-row')].at(-1).getAttribute('aria-rowindex')) - 2,
      rowHeights: [...new Set([...document.querySelectorAll('tr.entry-row')].map(row => row.getBoundingClientRect().height))],
    }));
    expect(sample.rows).toBeLessThanOrEqual(300);
    expect(sample.rowHeights).toEqual([128]);
    scroll.push(sample);
  }
  const afterMemory = await memory();
  await page.locator('.table-scroll').evaluate(element => { element.scrollTop = 0; });
  await expect(page.locator('tr.entry-row').first()).toHaveAttribute('data-id', first);
  const restoredFirst = await page.locator('tr.entry-row').first().getAttribute('data-id');
  await page.screenshot({ path: output + '/strona-desktop.png', fullPage: true });
  const dimensions = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    dimensions.push(await page.evaluate(() => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, tableWidth: document.querySelector('.table-scroll').clientWidth, contentWidth: document.querySelector('.table-scroll').scrollWidth, rowHeights: [...new Set([...document.querySelectorAll('tr.entry-row')].map(row => row.getBoundingClientRect().height))] })));
  }
  await page.screenshot({ path: output + '/strona-mobile-viewport.png', fullPage: true });
  await page.locator('#filter-contractNumber').fill('RWB-W/3989/BI/240/');
  await submit();
  await page.getByRole('button', { name: 'Rozwiń wpis 2015:2614', exact: true }).click();
  await expect(page.locator('#record-fields')).toContainText('MIECZYSŁAW ROBAKOWSKI');
  const dialog = await page.locator('#record-dialog').evaluate(element => ({ height: element.clientHeight, contentHeight: element.scrollHeight, fields: element.querySelectorAll('dt').length, textLength: element.textContent.length }));
  await page.screenshot({ path: output + '/dialog-mobile-viewport.png', fullPage: true });
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click();
  await expect(page.locator('#record-dialog')).not.toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Wyczyść filtry' }).click();
  await expect(page.locator('#count')).toHaveAttribute('data-total', '66343');
  const summary = page.locator('.department-picker summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.locator('#department-text')).toBeFocused();
  await page.keyboard.type('kadr');
  await page.keyboard.press('Tab');
  const selected = page.locator('#departments input').first();
  await expect(selected).toBeFocused();
  await page.keyboard.press('Space');
  await expect(selected).toBeChecked();
  await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
  const departmentBeforeAmount = await selected.locator('..').textContent();
  await page.locator('#department-text').fill('qzxvjkqzxv');
  await expect(page.locator('#departments input')).toHaveCount(0);
  await expect(page.locator('#department-selected')).toHaveText('(1)');
  await page.locator('#department-text').fill('kadr');
  await expect(selected).toBeChecked();
  await page.locator('#amount').fill('1000');
  await page.locator('#amount-op').selectOption('>');
  await submit();
  const departmentAfterAmount = await selected.locator('..').textContent();
  const amountTotal = await page.locator('#count').getAttribute('data-total');
  await selected.focus();
  await page.screenshot({ path: output + '/wydzialy-klawiatura.png', fullPage: true });
  await summary.focus();
  await page.keyboard.press('Enter');
  const columnsReachedByTab = [];
  await page.locator('#headings button').first().focus();
  const columnCount = await page.locator('#headings button').count();
  for (let column = 0; column < columnCount; column++) {
    const button = page.locator('#headings button').nth(column);
    await expect(button).toBeFocused();
    await expect(button).toBeInViewport();
    columnsReachedByTab.push(await button.textContent());
    if (column < columnCount - 1) await page.keyboard.press('Tab');
  }
  await page.screenshot({ path: output + '/ostatnie-kolumny.png', fullPage: true });
  const manual = { departmentBeforeAmount, departmentAfterAmount, amountTotal, selectionPreservedAfterNameSearch: true, columnsReachedByTab, dialogCloseButton: true };
  expect(errors).toEqual([]);
  const report = {
    measuredAt: new Date().toISOString(), browser: browser.version(), node: process.version,
    environment: { platform: os.platform(), release: os.release(), architecture: os.arch(), cpus: os.cpus().length, cpu: os.cpus()[0].model, totalMemoryBytes: os.totalmem() },
    profile: 'one', combine: 'AND', cold, queries, memory: { before: beforeMemory, after: afterMemory }, scroll, first, restoredFirst, dimensions, dialog, manual, errors,
    method: 'Lokalny Chromium headless, HTTP 127.0.0.1, gzip, bez ograniczeń CPU/sieci, cache HTTP wyłączony. Każda próba tworzy nowy kontekst przeglądarki i worker (pusty cache HTTP). Pomiar zewnętrznym wrapperem, brak instrumentacji w produkcji. Czas workera do wywołania postMessage; transfer obejmuje serializację i kolejkę odbiorcy. domMs: synchroniczny handler UI; dwie klatki są przybliżeniem okazji do rysowania, nie pomiarem fizycznego obrazu. Pamięć: CDP Runtime.getHeapUsage osobno dla strony i workera, przed i po wymuszonym GC; nie całkowity RSS przeglądarki. Cache systemu plików i JIT procesu nie są resetowane między trzema próbami. Wąski viewport nie jest fizycznym telefonem.',
  };
  await writeFile(output + '/pomiary.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ cold: cold.map(run => run.events), queries, memory: report.memory, finalScroll: scroll.at(-1), dimensions, dialog }, null, 2));
} finally {
  await browser?.close();
  await server.httpServer.close();
}
