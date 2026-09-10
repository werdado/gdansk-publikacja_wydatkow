import './style.css';
import { PAGE_SIZE } from '../src/pagination.ts';
import { LABELS, normalize } from '../src/search/model.ts';
import type { Entry, Filters, Result } from '../src/search/model.ts';
import type { PublicQuery } from '../src/search/public-query.ts';
import type { Request, Response } from '../src/search/protocol.ts';
import { TABLE_COLUMNS, openRecord, renderRow } from '../src/ui/record.ts';
import { windowFor } from '../src/ui/window.ts';

function get<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error('Brak elementu: ' + id);
  return element as T;
}
const input = (id: string) => get<HTMLInputElement>(id);
const select = (id: string) => get<HTMLSelectElement>(id);
const form = get<HTMLFormElement>('search-form');
const controls = get<HTMLFieldSetElement>('controls');
const body = get('results');
const status = get('status');
const more = get<HTMLButtonElement>('more');
const tableScroll = document.querySelector<HTMLElement>('.table-scroll')!;
const dialog = get<HTMLDialogElement>('record-dialog');
const recordLink = get<HTMLAnchorElement>('record-link');
const integer = new Intl.NumberFormat('pl-PL');
const textFields = ['contractorName', 'contractSubject', 'contractNumber'] as const;
const dateFields = ['contractDate'] as const;
const departments = new Set<string>();
let facets: Result['facets'] = [];
let sort: NonNullable<PublicQuery['sort']> = { field: 'contractDate', direction: 'desc' };
let worker: Worker | undefined;
let ready = false, waiting = false, queryPending = true;
let requestId = 0, windowId = 0, total = 0;
let linkId = 0, closingFromNavigation = false;
let bounds = { start: 0, end: 0, visible: 0, top: 0, bottom: 0 };
let timer: ReturnType<typeof setTimeout> | undefined;
const send = (message: Request) => worker!.postMessage(message);

function linkedRecordId(): string | null {
  return new URLSearchParams(location.hash.slice(1)).get('wpis');
}
function recordUrl(id: string): URL {
  const url = new URL(location.href);
  url.hash = new URLSearchParams({ wpis: id }).toString();
  return url;
}
function closeRecordFromNavigation() {
  if (!dialog.open) return;
  closingFromNavigation = true;
  dialog.close();
  closingFromNavigation = false;
}
function showRecord(entry: Entry, addHistory = true) {
  linkId++;
  const url = recordUrl(entry.id);
  recordLink.href = url.href;
  if (addHistory && linkedRecordId() !== entry.id) {
    history.pushState({ ...history.state, recordDialog: true }, '', url);
  }
  openRecord(entry);
}
function syncRecordFromUrl() {
  const id = linkedRecordId();
  linkId++;
  if (!id) { closeRecordFromNavigation(); return; }
  if (ready) send({ type: 'record', linkId, id });
}

function textControl(id: string, label: string, type = 'search') {
  const control = document.createElement('input');
  control.id = id; control.type = type; control.setAttribute('aria-label', label);
  return control;
}
function dateValue(control: HTMLInputElement): string {
  const value = control.value.trim();
  if (!value) { control.setCustomValidity(''); return ''; }
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) { control.setCustomValidity('Wpisz datę w formacie dd/mm/rrrr.'); return ''; }
  const [, day, month, year] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const valid = parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() === Number(month) - 1
    && parsed.getUTCDate() === Number(day);
  control.setCustomValidity(valid ? '' : 'Wpisz prawidłową datę.');
  return valid ? `${year}-${month}-${day}` : '';
}
function displayDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
}
for (const field of TABLE_COLUMNS) {
  const heading = document.createElement('th'); heading.scope = 'col'; heading.dataset.field = field;
  const button = document.createElement('button'); button.type = 'button'; button.textContent = LABELS[field];
  button.addEventListener('click', () => {
    sort = { field, direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc' };
    run();
  });
  heading.append(button); get('headings').append(heading);
  const cell = document.createElement('td'); get('filter-head').append(cell);
  if (textFields.includes(field as typeof textFields[number])) {
    const control = textControl('filter-' + field, 'Filtr: ' + LABELS[field]);
    control.placeholder = field === 'contractNumber' ? 'Fragment numeru' : 'Szukaj…';
    cell.append(control);
  } else if (dateFields.includes(field as typeof dateFields[number])) {
    for (const [key, label] of [['from', 'Od'], ['to', 'Do']]) {
      const id = field + '-' + key;
      const wrapper = document.createElement('div'); wrapper.className = 'date-bound';
      const caption = document.createElement('label'); caption.htmlFor = id; caption.textContent = label;
      const entry = document.createElement('span'); entry.className = 'date-entry';
      const control = textControl(id, LABELS[field] + ': ' + label, 'text');
      control.placeholder = 'dd/mm/yyyy'; control.inputMode = 'numeric'; control.maxLength = 10;
      control.pattern = '\\d{2}/\\d{2}/\\d{4}'; control.autocomplete = 'off';
      const picker = textControl(id + '-picker', 'Wybierz datę: ' + LABELS[field] + ', ' + label, 'date');
      picker.className = 'native-date-picker'; picker.tabIndex = -1; picker.setAttribute('aria-hidden', 'true');
      const openPicker = document.createElement('button'); openPicker.type = 'button'; openPicker.className = 'date-picker-button';
      openPicker.textContent = '▦'; openPicker.setAttribute('aria-label', 'Otwórz kalendarz: ' + LABELS[field] + ', ' + label);
      openPicker.addEventListener('click', () => typeof picker.showPicker === 'function' ? picker.showPicker() : picker.click());
      picker.addEventListener('change', () => {
        control.value = displayDate(picker.value);
        control.dispatchEvent(new Event('input', { bubbles: true }));
      });
      control.addEventListener('input', () => { picker.value = dateValue(control); });
      entry.append(control, openPicker, picker); wrapper.append(caption, entry);
      cell.append(wrapper);
    }
  } else if (field === 'contractCost') {
    const operator = document.createElement('select'); operator.id = 'amount-op';
    operator.setAttribute('aria-label', 'Porównanie kwoty');
    for (const [value, label] of [['', 'Bez ograniczeń'], ['>', 'Większa niż'], ['<', 'Mniejsza niż']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; operator.append(option);
    }
    const amount = textControl('amount', 'Kwota', 'number'); amount.step = '0.01';
    cell.append(operator, amount);
  } else {
    const picker = document.createElement('details'); picker.className = 'department-picker';
    const summary = document.createElement('summary'); summary.textContent = 'Wybierz wydziały ';
    const count = document.createElement('span'); count.id = 'department-selected'; summary.append(count);
    const search = textControl('department-text', 'Wyszukaj fragment nazwy wydziału');
    search.placeholder = 'Fragment nazwy, bez literówek';
    const options = document.createElement('div'); options.id = 'departments';
    picker.append(summary, search, options); cell.append(picker);
  }
}
function currentQuery(): PublicQuery {
  const filters: Filters = { departments: [...departments], dates: {} };
  const amount = input('amount'), operator = select('amount-op').value;
  amount.required = Boolean(operator);
  if (operator && Number.isFinite(amount.valueAsNumber)) {
    filters.amount = { operator: operator as '>' | '<', value: amount.valueAsNumber };
  }
  for (const field of dateFields) {
    const fromControl = input(field + '-from'), toControl = input(field + '-to');
    const from = dateValue(fromControl), to = dateValue(toControl);
    if (from && to && from > to) toControl.setCustomValidity('Data końcowa nie może poprzedzać początkowej.');
    if (from || to) filters.dates![field] = { from, to };
  }
  return { text: input('query').value,
    columns: Object.fromEntries(textFields.map(field => [field, input('filter-' + field).value])),
    filters, sort: { ...sort } };
}
function invalidate() {
  clearTimeout(timer); requestId++; queryPending = true; waiting = false;
  body.setAttribute('aria-busy', 'true'); more.disabled = true;
}
function run() {
  if (!ready) return;
  invalidate();
  const query = currentQuery();
  if (!form.reportValidity()) {
    body.setAttribute('aria-busy', 'false');
    status.textContent = 'Popraw zaznaczone pola, aby zastosować filtry.';
    return;
  }
  windowId = 0; waiting = true;
  status.textContent = 'Wyszukiwanie w pełnym zbiorze…';
  for (const heading of get('headings').children) {
    const selected = (heading as HTMLElement).dataset.field === sort.field;
    heading.setAttribute('aria-sort', selected ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none');
  }
  send({ type: 'search', requestId, query });
}
function renderFacets() {
  const container = get('departments');
  const focused = container.contains(document.activeElement) ? (document.activeElement as HTMLInputElement).value : undefined;
  container.replaceChildren();
  const fragment = normalize(input('department-text').value);
  for (const facet of facets) {
    const name = facet.name || 'Brak danych';
    if (!normalize(name).includes(fragment)) continue;
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.value = facet.name; checkbox.checked = departments.has(facet.name);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) departments.add(facet.name); else departments.delete(facet.name);
      run();
    });
    label.append(checkbox, name + ' (' + integer.format(facet.count) + ')'); container.append(label);
    if (focused === facet.name) checkbox.focus();
  }
  get('department-selected').textContent = departments.size ? '(' + departments.size + ')' : '';
}
function renderWindow(rows: Entry[], offset: number) {
  const active = document.activeElement;
  const focusedId = active instanceof HTMLButtonElement && body.contains(active)
    ? active.closest<HTMLTableRowElement>('tr.entry-row')?.dataset.id : undefined;
  let focusedButton: HTMLButtonElement | null = null;
  const fragment = document.createDocumentFragment();
  function spacer(height: number) {
    const row = document.createElement('tr'); row.className = 'table-spacer'; row.setAttribute('aria-hidden', 'true');
    const cell = document.createElement('td'); cell.colSpan = TABLE_COLUMNS.length; cell.style.height = height + 'px';
    row.append(cell); fragment.append(row);
  }
  if (bounds.top) spacer(bounds.top);
  for (const [index, entry] of rows.entries()) {
    const row = renderRow(entry, offset + index, showRecord);
    if (entry.id === focusedId) focusedButton = row.querySelector('button');
    fragment.append(row);
  }
  if (bounds.bottom) spacer(bounds.bottom);
  body.replaceChildren(fragment);
  focusedButton?.focus({ preventScroll: true });
}
function updateWindow(extra = 0) {
  if (!ready || queryPending || waiting) return;
  const viewport = Math.max(0, tableScroll.clientHeight - document.querySelector('thead')!.clientHeight);
  const next = windowFor(tableScroll.scrollTop, viewport, total, Math.min(total, bounds.visible + extra));
  if (next.start === bounds.start && next.end === bounds.end && next.visible === bounds.visible) return;
  bounds = next; waiting = true; more.disabled = true; windowId++;
  body.setAttribute('aria-busy', 'true');
  send({ type: 'page', requestId, windowId, offset: next.start, limit: next.end - next.start });
}
function fail() {
  ready = false; waiting = false; queryPending = true; clearTimeout(timer);
  controls.disabled = true; get('retry').hidden = false;
  document.documentElement.dataset.ready = 'false';
  status.textContent = 'Nie udało się wczytać danych.';
  body.replaceChildren(); body.setAttribute('aria-busy', 'false');
  get('count').textContent = ''; delete get('count').dataset.total;
  get('empty').hidden = true; more.hidden = true;
}
function start() {
  worker?.terminate(); invalidate(); ready = false; controls.disabled = true;
  get('retry').hidden = true; status.textContent = 'Wczytywanie danych…';
  const active = new Worker(new URL('../src/search/worker.ts', import.meta.url), { type: 'module' });
  worker = active;
  active.onerror = () => { if (worker === active) fail(); };
  active.onmessage = (event: MessageEvent<Response>) => {
    if (worker !== active) return;
    const message = event.data;
    if (message.type === 'ready') {
      get('collection-count').textContent = integer.format(message.count);
      ready = true; controls.disabled = false; run(); syncRecordFromUrl(); return;
    }
    if (message.type === 'record') {
      if (message.linkId !== linkId) return;
      if (message.entry) showRecord(message.entry, false);
      else { closeRecordFromNavigation(); status.textContent = 'Nie znaleziono wskazanego wpisu.'; }
      return;
    }
    if (message.type === 'error' && message.linkId !== undefined) {
      if (message.linkId === linkId) status.textContent = 'Nie udało się wczytać wskazanego wpisu.';
      return;
    }
    if ('requestId' in message && message.requestId !== undefined && message.requestId !== requestId) return;
    if (message.type === 'error') { fail(); return; }
    if (message.windowId !== windowId) return;
    if (message.windowId === 0) {
      total = message.total;
      bounds = { start: 0, end: message.rows.length, visible: Math.min(PAGE_SIZE, total), top: 0, bottom: 0 };
      facets = message.facets; renderFacets(); tableScroll.scrollTop = 0; queryPending = false;
    }
    waiting = false;
    renderWindow(message.rows, message.offset);
    body.dataset.request = String(requestId); body.setAttribute('aria-busy', 'false');
    document.documentElement.dataset.ready = 'true';
    document.querySelector('table')!.setAttribute('aria-rowcount', String(total + 2));
    get('count').textContent = integer.format(total) + ' wpisów'; get('count').dataset.total = String(total);
    get('empty').hidden = total !== 0;
    more.hidden = bounds.visible >= total; more.disabled = false;
    status.textContent = '';
    requestAnimationFrame(() => updateWindow());
  };
  send({ type: 'init', baseUrl: new URL(import.meta.env.BASE_URL, document.baseURI).href });
}
form.addEventListener('submit', event => { event.preventDefault(); run(); });
form.addEventListener('input', event => {
  const target = event.target as HTMLInputElement;
  if (target.id === 'department-text') { renderFacets(); return; }
  if (target.type === 'checkbox') return;
  invalidate(); timer = setTimeout(run, 220);
});
form.addEventListener('change', event => {
  const target = event.target as HTMLInputElement;
  if (target.type === 'date' || target.type === 'number' || target.tagName === 'SELECT') run();
});
get('clear').addEventListener('click', () => { form.reset(); departments.clear(); run(); });
get('retry').addEventListener('click', start);
more.addEventListener('click', () => updateWindow(PAGE_SIZE));
tableScroll.addEventListener('scroll', () => updateWindow(), { passive: true });
window.addEventListener('resize', () => updateWindow());
window.addEventListener('hashchange', syncRecordFromUrl);
dialog.addEventListener('close', () => {
  if (closingFromNavigation || !linkedRecordId()) return;
  if (history.state?.recordDialog) history.back();
  else {
    const url = new URL(location.href); url.hash = '';
    history.replaceState(history.state, '', url);
  }
});
start();
