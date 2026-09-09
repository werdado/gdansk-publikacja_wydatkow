import './style.css';
import { CASES } from './search/cases.ts';
import { DATE_FIELDS, FUZZY_FIELDS, LABELS, PROFILE_LABELS, normalize } from './search/model.ts';
import type { Combine, Entry, Filters, Profile, Query, Scope } from './search/model.ts';
import type { WorkerRequest, WorkerResponse } from './search/protocol.ts';

function get<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Brak elementu: ${id}`);
  return element as T;
}
const input = (id: string) => get<HTMLInputElement>(id);
const select = (id: string) => get<HTMLSelectElement>(id);
const status = get('status');
const controls = get<HTMLFieldSetElement>('controls');
const body = get('results');
const more = get<HTMLButtonElement>('more');
const tableScroll = document.querySelector<HTMLElement>('.table-scroll')!;
const worker = new Worker(new URL('./search/worker.ts', import.meta.url), { type: 'module' });
const send = (message: WorkerRequest) => worker.postMessage(message);
let ready = false;
let requestId = 0;
let shown = 0;
let total = 0;
let waiting = false;
let requestedAt = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let activeQuery: Query | undefined;
let facets: { name: string; count: number }[] = [];
let departments = new Set<string>();
let sort: NonNullable<Query['sort']> = { field: 'contractDate', direction: 'desc' };
const judgments = new Map<string, { query: Query; id: string; verdict: string }>();
const numberFormat = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat('pl-PL');

function option(value: string, label: string) {
  const element = document.createElement('option'); element.value = value; element.textContent = label; return element;
}
for (const field of ['global', ...FUZZY_FIELDS, 'departmentOffice', 'contractNumber'] as const) select('scope').append(option(field, LABELS[field]));
for (const [value, label] of Object.entries(PROFILE_LABELS)) select('profile').append(option(value, label));
select('profile').value = 'one';
for (const fixture of CASES) select('example').append(option(fixture.id, `${fixture.text} — ${fixture.label}`));
for (const field of DATE_FIELDS) {
  const group = document.createElement('fieldset'); group.className = 'date-range';
  const legend = document.createElement('legend'); legend.textContent = LABELS[field]; group.append(legend);
  const inputs = document.createElement('div'); inputs.className = 'date-inputs';
  for (const [key, text] of [['from', 'Od'], ['to', 'Do']]) {
    const label = document.createElement('label'); label.textContent = text;
    const date = document.createElement('input'); date.type = 'date'; date.id = `${field}-${key}`; label.append(date); inputs.append(label);
  }
  group.append(inputs); get('date-filters').append(group);
}
const columns = ['contractDate', 'contractorName', 'contractSubject', 'contractCost', 'departmentOffice', 'contractNumber', 'contractProcedure', 'contractType', 'contractStartDate', 'contractEndDate'] as const;
const sortButtons = new Map<string, HTMLButtonElement>();
for (const field of columns) {
  const cell = document.createElement('th'); cell.scope = 'col';
  const button = document.createElement('button'); button.type = 'button'; button.textContent = LABELS[field];
  button.addEventListener('click', () => {
    sort = { field, direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc' };
    run();
  });
  cell.append(button); get('headings').append(cell); sortButtons.set(field, button);
}
for (const title of ['Dopasowanie', 'Ocena wyniku']) {
  const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = title; get('headings').append(cell);
}
const exportButton = document.createElement('button'); exportButton.type = 'button'; exportButton.className = 'secondary'; exportButton.textContent = 'Eksportuj oceny (0)'; exportButton.disabled = true;
get('clear').after(exportButton);
exportButton.style.marginLeft = '8px';
exportButton.addEventListener('click', () => {
  const content = JSON.stringify({ data: new Date().toISOString(), oceny: [...judgments.values()] }, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'oceny-wyszukiwania.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

function updateProfileNote() {
  const profile = select('profile').value;
  const limit = profile === 'control' ? 'Brak tolerancji literówek — wariant kontrolny.' : profile === 'one' ? 'Maksymalnie jedna edycja słowa.' : profile === 'two' ? 'Maksymalnie dwie edycje słowa.' : 'Limit to 25% długości słowa, zaokrąglone do najbliższej liczby całkowitej, maksymalnie dwie edycje.';
  get('profile-note').textContent = `${limit} Wszystkie profile pomijają wielkość liter i polskie znaki. Prefiksy od 3 znaków. Słowa krótsze niż 4 znaki i liczby bez literówek. Numery umów i nazwy wydziałów: fragment tekstu bez literówek. Zakresy dat w POC obejmują oba dni graniczne.`;
}
function currentQuery(): Query {
  const filters: Filters = { departments: [...departments], dates: {} };
  const amount = input('amount');
  const operator = select('amount-op').value;
  amount.required = !!operator;
  if (operator && amount.value !== '' && Number.isFinite(amount.valueAsNumber)) filters.amount = { operator: operator as '>' | '<', value: amount.valueAsNumber };
  for (const field of DATE_FIELDS) {
    const from = input(`${field}-from`).value; const to = input(`${field}-to`).value;
    input(`${field}-to`).setCustomValidity(from && to && from > to ? 'Data końcowa nie może poprzedzać początkowej.' : '');
    if (from || to) filters.dates![field] = { from, to };
  }
  return { text: input('query').value, scope: select('scope').value as Scope, profile: select('profile').value as Profile, combine: select('combine').value as Combine, filters, sort: { ...sort } };
}
function run() {
  if (!ready) return;
  clearTimeout(timer);
  const query = currentQuery();
  if (!get<HTMLFormElement>('search-form').reportValidity()) return;
  activeQuery = query;
  requestId++;
  waiting = true; more.disabled = true;
  body.setAttribute('aria-busy', 'true');
  status.textContent = 'Wyszukiwanie w pełnym zbiorze…';
  updateProfileNote();
  for (const [field, button] of sortButtons) {
    const selected = field === sort.field;
    button.parentElement!.setAttribute('aria-sort', selected ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none');
    button.textContent = LABELS[field as keyof typeof LABELS] + (selected ? sort.direction === 'asc' ? ' ↑' : ' ↓' : '');
  }
  requestedAt = performance.now();
  send({ type: 'search', requestId, query });
}
function renderFacets() {
  const container = get('departments'); container.replaceChildren();
  const text = normalize(input('department-text').value);
  for (const facet of facets) {
    const labelText = facet.name || 'Brak danych';
    if (!normalize(labelText).includes(text)) continue;
    const label = document.createElement('label');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = departments.has(facet.name);
    checkbox.addEventListener('change', () => { if (checkbox.checked) departments.add(facet.name); else departments.delete(facet.name); run(); });
    label.append(checkbox, `${labelText} (${integer.format(facet.count)})`); container.append(label);
  }
  get('department-selected').textContent = departments.size ? `(${departments.size})` : '';
}
function appendRow(entry: Entry, match: Record<string, string[]>) {
  const row = document.createElement('tr'); row.dataset.id = entry.id;
  for (const field of columns) {
    const cell = document.createElement('td'); const raw = entry[field];
    if (field === 'contractSubject' && raw && String(raw).length > 160) {
      cell.className = 'subject'; const details = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = String(raw).slice(0, 160) + '…';
      const full = document.createElement('p'); full.textContent = String(raw); details.append(summary, full); cell.append(details);
    } else {
      cell.textContent = field === 'contractCost' ? numberFormat.format(raw as number) : DATE_FIELDS.includes(field as typeof DATE_FIELDS[number])
        ? String(raw).slice(0, 10) + (String(raw).slice(11, 19) === '00:00:00' ? '' : ' ' + String(raw).slice(11, 19)) : String(raw ?? '—');
    }
    if (field === 'contractCost') cell.className = 'number';
    if (field === 'contractDate') { const id = document.createElement('small'); id.textContent = entry.id; cell.append(id); }
    row.append(cell);
  }
  const explanation = document.createElement('td'); explanation.className = 'match';
  for (const [term, fields] of Object.entries(match)) {
    const line = document.createElement('div'); const strong = document.createElement('strong'); strong.textContent = term;
    line.append(strong, ': ' + fields.map(field => LABELS[field as Scope]).join(', ')); explanation.append(line);
  }
  if (!Object.keys(match).length) explanation.textContent = '—';
  row.append(explanation);
  const ratingCell = document.createElement('td');
  const rating = document.createElement('select'); rating.setAttribute('aria-label', `Ocena wpisu ${entry.id}`);
  for (const [value, label] of [['', 'Nie oceniono'], ['trafny', 'Trafny'], ['nietrafny', 'Nietrafny'], ['niepewny', 'Nie mam pewności']]) rating.append(option(value, label));
  const ratedQuery = activeQuery!; const key = JSON.stringify([ratedQuery, entry.id]);
  rating.value = judgments.get(key)?.verdict ?? '';
  rating.addEventListener('change', () => {
    if (rating.value) judgments.set(key, { query: ratedQuery, id: entry.id, verdict: rating.value }); else judgments.delete(key);
    exportButton.textContent = `Eksportuj oceny (${judgments.size})`; exportButton.disabled = judgments.size === 0;
  });
  ratingCell.append(rating); row.append(ratingCell); body.append(row);
}
function loadMore() {
  if (waiting || shown >= total) return;
  waiting = true; more.disabled = true; send({ type: 'page', requestId, offset: shown });
}
worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
  const message = event.data;
  if (message.type === 'ready') {
    ready = true; controls.disabled = false;
    get('metrics').textContent = `Pełny zbiór: ${integer.format(message.count)} wpisy. Pobranie i odczyt danych: ${message.timings.loadMs.toFixed(0)} ms; odtworzenie indeksu i przygotowanie silnika: ${message.timings.restoreMs.toFixed(0)} ms.`;
    document.documentElement.dataset.ready = 'true';
    get('metrics').dataset.timings = JSON.stringify(message.timings);
    run();
  } else if (message.type === 'error') {
    if (message.requestId !== undefined && message.requestId !== requestId) return;
    status.textContent = `Błąd: ${message.message}`; body.setAttribute('aria-busy', 'false'); waiting = false;
  } else {
    if (message.requestId !== requestId) return;
    if (!message.offset) { body.replaceChildren(); shown = 0; tableScroll.scrollTop = 0; }
    for (const item of message.rows) appendRow(item.entry, item.match);
    shown += message.rows.length; total = message.total; facets = message.facets; waiting = false;
    body.setAttribute('aria-busy', 'false'); body.dataset.request = String(requestId);
    get('count').textContent = integer.format(total); get('count').dataset.total = String(total);
    get('timing').textContent = `${message.elapsedMs.toFixed(1)} ms · pokazano ${integer.format(shown)} z ${integer.format(total)}`;
    status.textContent = `Gotowe. Liczba pasujących wpisów: ${integer.format(total)}.`;
    more.hidden = shown >= total; more.disabled = false; get('empty').hidden = total !== 0; renderFacets();
    if (!message.offset) {
      const visibleMs = performance.now() - requestedAt;
      get('timing').dataset.measurement = JSON.stringify({ workerMs: message.elapsedMs, responseAndDomMs: visibleMs, total });
    }
  }
};
worker.onerror = event => { status.textContent = `Błąd uruchomienia wyszukiwarki: ${event.message}`; waiting = false; };
get('search-form').addEventListener('submit', event => { event.preventDefault(); run(); });
input('query').addEventListener('input', () => { requestId++; clearTimeout(timer); timer = setTimeout(run, 220); });
for (const id of ['scope', 'profile', 'combine', 'amount-op', 'amount', ...DATE_FIELDS.flatMap(field => [`${field}-from`, `${field}-to`])]) get(id).addEventListener('change', run);
input('department-text').addEventListener('input', renderFacets);
select('example').addEventListener('change', () => {
  const fixture = CASES.find(value => value.id === select('example').value);
  if (fixture) { input('query').value = fixture.text; select('scope').value = fixture.scope; run(); }
});
get('clear').addEventListener('click', () => {
  input('query').value = ''; select('example').value = ''; departments = new Set(); input('department-text').value = '';
  select('amount-op').value = ''; input('amount').value = '';
  for (const field of DATE_FIELDS) for (const part of ['from', 'to']) input(`${field}-${part}`).value = '';
  run();
});
more.addEventListener('click', loadMore);
tableScroll.addEventListener('scroll', () => { if (tableScroll.scrollTop + tableScroll.clientHeight >= tableScroll.scrollHeight - 250) loadMore(); });
updateProfileNote();
send({ type: 'init', baseUrl: new URL(import.meta.env.BASE_URL, document.baseURI).href });
