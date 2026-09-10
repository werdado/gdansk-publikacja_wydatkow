# Plan implementacji przeglądarki wydatków Gdańska

> **Dla agentów wykonawczych:** wymagany skill `subagent-driven-development` do realizacji planu zadanie po zadaniu. Kroki oznaczono polami `- [ ]`. Ten dokument jest planem; opisane niżej zmiany docelowej strony nie zostały jeszcze wykonane.

**Cel:** opublikować prostą, polskojęzyczną przeglądarkę wszystkich 66 343 wpisów, z jednoczesnym wyszukiwaniem globalnym, filtrami kolumn i sortowaniem.

**Architektura:** budowanie przygotowuje dane i indeks MiniSearch. Jeden Web Worker utrzymuje pełny zbiór, wykonuje wyszukiwanie, filtruje i sortuje; interfejs pobiera tylko potrzebne wiersze. Jedna tabela na komputerach i telefonach ujawnia kolejne partie po 100 wpisów, utrzymując ograniczoną liczbę wierszy w DOM.

**Stos technologiczny:** HTML/CSS/TypeScript 7.0.2, Vite 8.2.2, MiniSearch 7.2.0, Node.js ≥24, jeden Web Worker; Playwright 1.63.0 do kontroli przeglądarkowej. Zachować dokładne wersje i `package-lock.json`.

## Wybrany wygląd — 03 „Otwarty notatnik”

Wzorcem wizualnym jest [makieta 03](../../designs/03-notatnik.html) i wspólne style bazowe wraz z regułami `.editorial` w `designs/shared.css`. Użytkownik wybrał kremowe tło, ceglasty akcent, szeryfowe nagłówki i redakcyjny układ bez panelu bocznego.

W zadaniu 4 dostosować poniższy szkielet HTML i CSS do tego wzorca; przykładowy wygląd z POC nie jest docelowy. Zachować kontrakt kontrolek, dostępność, obsługę Workera oraz wysokość wierszy wymaganą przez wirtualizację. Przenieść wygląd nagłówka, wyszukiwarki, tabeli i dialogu, pomijając pasek propozycji i komunikaty o próbce. Korzystać z pełnego zbioru i zatwierdzonego silnika, bez przenoszenia demonstracyjnego `designs/shared.js`.

Przy odbiorze zadania 5 porównać stronę z makietą na komputerze i przy szerokości 390 px. Zrzuty wzorca są w `designs/previews/03-notatnik-desktop.png` i `designs/previews/03-notatnik-mobile.png`.

## Ograniczenia wspólne

- „Strona pozwalająca przeglądać dostarczone pliki JSON z rejestrem wydatków Gdańska.”
- „Zbiór jest zamknięty: użytkownik nie przewiduje dodawania kolejnych danych.”
- „Jedna strona wczytująca cały zbiór danych do przeglądarki.”
- „Początkowo 100 wierszy; kolejne ujawniane podczas przewijania.”
- „Ten sam układ tabeli na komputerach i telefonach, z przewijaniem poziomym.”
- „Długie opisy są początkowo skrócone; użytkownik może rozwinąć pełną treść na żądanie.”
- „Każde słowo zapytania musi pasować (AND), w dowolnej kolejności.”
- „Zmiana sortowania zachowuje wyszukiwanie globalne i wszystkie aktywne filtry.”
- „Wyszukiwanie i zmiana filtrów zachowują wybraną kolumnę oraz kierunek sortowania.”
- Docelowy profil: `one` z POC. Jedna edycja Levenshteina od czterech znaków, liczby bez przybliżania, prefiks od trzech znaków poza liczbami, normalizacja polskich znaków i wielkości liter.
- Cztery pola z fuzzy: `contractSubject`, `contractProcedure`, `contractType`, `contractorName`.
- `departmentOffice`: wielokrotny wybór, liczebności po innych filtrach, wyszukiwanie fragmentu nazwy bez literówek. Wybrane wydziały łączą się przez OR; filtry różnych kolumn przez AND.
- `contractNumber`: fragment tekstu bez literówek. `contractCost`: ścisłe `>` lub `<`.
- Trzy pola dat: niezależne zakresy od–do. Zachować włączne granice według lokalnego dnia jako założenie z POC. Pusta granica oznacza brak ograniczenia z tej strony.
- `contractDisclaimer` nie jest kontrolką ani kolumną docelowej strony; jego wartość pozostaje w danych źródłowych.
- Zachować wszystkie wpisy, pełne teksty, stabilne identyfikatory `rok:pozycja`, uzgodnione sześć korekt dat i kwoty z dwoma miejscami po przecinku. Nie rozdzielać opisów zawierających fragmenty innych wpisów.
- Interfejs i dokumentacja po polsku. Zachować znaczenie „poniesione wydatki”; nie dopisywać niepotwierdzonej waluty ani „roku płatności”.
- Wynik to zwykłe pliki statyczne. Przełączniki profili, AND/OR, pomiary i oceny nie trafiają do interfejsu publicznego.

---

## Stan początkowy i dowody

Przeczytać [projekt](../projekt-strony.md), [analizę źródeł](../analiza-danych.md) i [słownik](../../CONTEXT.md).

Docelowa implementacja zachowuje zatwierdzone ustawienia AND i jednej edycji.

POC zmierzył około 178 MB sterty Node.js po GC i 51,78 MB danych wraz z indeksem przed kompresją. Dlatego plan obejmuje kompresję plików i ograniczenie DOM. Są to środki wynikające z pomiarów; nie zastępują późniejszego sprawdzenia fizycznego telefonu.

Repozytorium nie ma skonfigurowanego zdalnego adresu; lokalna gałąź to `master`. Plan przygotowuje wynik statyczny i ręcznie uruchamiany workflow. Podłączenie konkretnego repozytorium i pierwsza publikacja są czynnościami wdrożeniowymi po ukończeniu lokalnego wyniku.

## Mapa plików i odpowiedzialności

| Plik | Odpowiedzialność |
| --- | --- |
| `src/search/model.ts`, `src/search/engine.ts` | Wspólny model i sprawdzony silnik wyszukiwania |
| `src/search/public-query.ts` | Stały profil publiczny i jednoczesne zapytania kolumn |
| `src/search/transport.ts` | Odczyt przygotowanych danych, gzip i błędy pobrania |
| `src/search/protocol.ts`, `src/search/worker.ts` | Typowane komunikaty, pełne wyniki w workerze, pobieranie okna wierszy |
| `src/ui/window.ts` | Czyste obliczenie partii widocznych wierszy |
| `src/ui/record.ts` | Wiersz o stałej wysokości i pełny wpis w natywnym dialogu |
| `site/main.ts`, `site/index.html`, `site/style.css` | Publiczny interfejs, wszystkie kontrolki kolumn, integracja workera |
| `scripts/przygotuj-strone.ts` | Przygotowanie statycznych danych oraz indeksu, z wersjonowanymi nazwami |
| `vite.site.config.ts`, `playwright.site.config.ts` | Oddzielne budowanie i testowanie publicznej strony |
| `tests/site/` | Testy nowych zachowań wspólnych i strony |
| `.github/workflows/pages.yml` | Ręczne budowanie, sprawdzenie i publikacja `dist/` |

Zależności zadań: 1 → 2 → 3 → 4 → 5 → 6. Każde zadanie kończy się sprawdzeniem własnego wyniku; nie dodawać nowej biblioteki do renderowania tabeli.

## Zadanie 1: wspólny silnik i równoczesne filtry tekstowe

**Pliki:** utworzyć `src/search/model.ts`, `src/search/engine.ts`, `src/search/public-query.ts` oraz `tests/search.test.ts`.

**Interfejsy:** istniejące `Entry`, `Query`, `Result`, `SearchEngine.search(Query): Result` pozostają dostępne. Dodać `Query.columns?: Partial<Record<FuzzyField | 'contractNumber', string>>` i `publicQuery(PublicQuery): Query`.

- [ ] Do `Query` w przeniesionym modelu dodać:

```ts
columns?: Partial<Record<FuzzyField | 'contractNumber', string>>;
```

Utworzyć `src/search/public-query.ts`:

```ts
import type { Query } from './model.ts';
export type PublicQuery = Pick<Query, 'text' | 'columns' | 'filters' | 'sort'>;
export function publicQuery(query: PublicQuery): Query {
  return { ...query, scope: 'global', profile: 'one', combine: 'AND' };
}
```

- [ ] Dopisać do `tests/search.test.ts` test wykorzystujący `engine` i funkcję `query`:

```ts
test('globalne zapytanie i dwie kolumny obowiązują jednocześnie', () => {
  const request = query({
    text: 'remont', profile: 'one', combine: 'AND',
    columns: { contractorName: 'prescom', contractSubject: 'hali' },
    filters: { amount: { operator: '>', value: 100 } },
  });
  assert.deepEqual(engine.search(request).hits.map(hit => hit.id), ['2026:2']);
  request.columns!.contractSubject = 'szkoly';
  assert.deepEqual(engine.search(request).hits, []);
});
```

Uruchomić `npm test`; drugi warunek powinien ujawnić, że istniejący silnik jeszcze nie stosuje `columns`.

- [ ] W `SearchEngine.search()` przed pobraniem kandydatów utworzyć zbiory kolumn, a na początku istniejącego callbacku `filter(hit => ...)` sprawdzić przynależność. Dodać `TextField` do importu typów:

```ts
const columnSets = Object.entries(query.columns ?? {})
  .filter(([, text]) => Boolean(text?.trim()))
  .map(([field, text]) => new Set(this.candidates({
    ...query, text: text!, scope: field as TextField,
  }).map(hit => hit.id)));
```

```ts
if (!columnSets.every(ids => ids.has(hit.id))) return false;
```

Wstawienie tego warunku przed kwotą, datami i zliczaniem wydziałów zachowuje poprawne liczebności faset. Nie wykonywać osobnego sortowania dla każdej kolumny.

- [ ] Uruchomić `npm test` i `npm run typecheck`. Nowy test ma przejść. Zapisać jeden commit obejmujący wyłącznie pliki tego zadania.

## Zadanie 2: przygotowanie i transport statycznych danych

**Pliki:** utworzyć `scripts/przygotuj-strone.ts`, `src/search/transport.ts`, `tests/site/transport.test.ts`; rozszerzyć `tsconfig.json`, `package.json` i `.gitignore`.

**Interfejsy:** wykorzystać istniejące `loadSource()` i `ROOT` z `scripts/dane.ts`. Manifest produkcyjny ma `count`, `sources`, `corrections` i `files: { records: string; index: string }`; nazwy w `files` kończą się na `.json` i mają również odpowiednik `.json.gz`.

- [ ] Utworzyć generator:

```ts
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import MiniSearch from 'minisearch';
import { INDEX_OPTIONS } from '../src/search/engine.ts';
import { loadSource, ROOT } from './dane.ts';

const { rows, sources, corrections } = await loadSource();
const index = new MiniSearch(INDEX_OPTIONS);
index.addAll(rows);
const directory = ROOT + 'site/public/generated/';
await rm(directory, { recursive: true, force: true });
await mkdir(directory, { recursive: true });
async function artifact(name: string, value: unknown) {
  const content = JSON.stringify(value);
  const digest = createHash('sha256').update(content).digest('hex').slice(0, 16);
  const file = `${name}.${digest}.json`;
  await writeFile(directory + file, content);
  await writeFile(directory + file + '.gz', gzipSync(content));
  return file;
}
const files = {
  records: await artifact('records', rows),
  index: await artifact('index', index),
};
await writeFile(directory + 'manifest.json', JSON.stringify({ count: rows.length, sources, corrections, files }, null, 2));
console.log(`Przygotowano ${rows.length} wpisy i indeks.`);
```

Wersjonowane nazwy wiążą indeks i rekordy z danym manifestem. Przed budowaniem usuwać wyłącznie wcześniejszy wygenerowany katalog `site/public/generated/`, aby poprzednie artefakty nie zwiększały paczki.

- [ ] Utworzyć `src/search/transport.ts` z kompletnym odczytem:

```ts
export async function readText(url: URL, compressed = false): Promise<string> {
  const useGzip = compressed && typeof DecompressionStream !== 'undefined';
  const target = new URL(url);
  if (useGzip) target.pathname += '.gz';
  const response = await fetch(target);
  if (!response.ok) throw new Error(`Nie udało się pobrać danych (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const body = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(body).text();
  }
  return new TextDecoder().decode(bytes);
}
```

Rozpoznanie magicznych bajtów zapobiega podwójnej dekompresji, gdy hosting sam ustawi `Content-Encoding`. Przeglądarka bez `DecompressionStream` pobiera zwykły JSON.

- [ ] Sprawdzić oba formaty i HTTP 503 w `tests/site/transport.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { readText } from '../../src/search/transport.ts';

test('transport odczytuje gzip, odkodowane JSON i odrzuca HTTP 503', async () => {
  const original = globalThis.fetch;
  try {
    for (const body of [gzipSync('{"count":66343}'), Buffer.from('{"count":66343}')]) {
      globalThis.fetch = async () => new Response(body);
      assert.equal(await readText(new URL('https://example.test/records.json'), true), '{"count":66343}');
    }
    globalThis.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(readText(new URL('https://example.test/records.json')), /503/);
  } finally { globalThis.fetch = original; }
});
```

- [ ] Dodać skrypt `"prepare:site": "node scripts/przygotuj-strone.ts"`; rozszerzyć `include` TypeScript o `src/**/*.ts`, `site/**/*.ts`, `tests/**/*.ts`, `scripts/przygotuj-strone.ts`, `vite.site.config.ts`, `playwright.site.config.ts`. Do `.gitignore` dodać `/site/public/generated/` i `/dist/`.
- [ ] Uruchomić `npm run prepare:site`, `node --test tests/site/transport.test.ts`, `npm run typecheck`. Sprawdzić 66 343 wpisy, sześć korekt i zgodność sum źródeł z raportem POC. Zapisać commit zadania.

## Zadanie 3: worker i ograniczone okno tabeli

**Pliki:** utworzyć `src/search/protocol.ts`, `src/search/worker.ts`, `src/ui/window.ts`, `tests/site/window.test.ts`.

**Interfejsy:** worker przyjmuje `PublicQuery`. Każde wyszukiwanie ma `requestId`, a każde przesunięcie okna dodatkowo `windowId`. Odpowiedzi starszych wyszukiwań lub okien nie zastępują aktualnych wyników. `windowFor()` zwraca zakres `[start, end)`, liczbę ujawnionych wpisów i wysokości pustych obszarów.

- [ ] Utworzyć `src/search/protocol.ts`:

```ts
import type { Entry, Result } from './model.ts';
import type { PublicQuery } from './public-query.ts';
export type Request =
  | { type: 'init'; baseUrl: string }
  | { type: 'search'; requestId: number; query: PublicQuery }
  | { type: 'page'; requestId: number; windowId: number; offset: number; limit: number };
export type Response =
  | { type: 'ready'; count: number }
  | { type: 'result'; requestId: number; windowId: number; offset: number; total: number; rows: Entry[]; facets: Result['facets'] }
  | { type: 'error'; requestId?: number; message: string };
```

- [ ] Utworzyć `src/search/worker.ts`:

```ts
import MiniSearch from 'minisearch';
import { SearchEngine, INDEX_OPTIONS } from './engine.ts';
import { publicQuery } from './public-query.ts';
import { readText } from './transport.ts';
import type { Entry, Result } from './model.ts';
import type { Request, Response } from './protocol.ts';

let engine: SearchEngine | undefined;
let current: { requestId: number; result: Result } | undefined;
const send = (message: Response) => postMessage(message);
function emitPage(offset: number, limit: number, windowId: number) {
  if (!engine || !current) return;
  const start = Math.max(0, Math.floor(offset));
  const size = Math.max(1, Math.min(300, Math.floor(limit)));
  send({
    type: 'result', requestId: current.requestId, windowId, offset: start,
    total: current.result.hits.length, facets: current.result.facets,
    rows: current.result.hits.slice(start, start + size).map(hit => engine!.byId.get(hit.id)!),
  });
}
onmessage = async (event: MessageEvent<Request>) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      const manifest = JSON.parse(await readText(new URL('generated/manifest.json', message.baseUrl)));
      const [recordsText, indexText] = await Promise.all([
        readText(new URL('generated/' + manifest.files.records, message.baseUrl), true),
        readText(new URL('generated/' + manifest.files.index, message.baseUrl), true),
      ]);
      const rows: Entry[] = JSON.parse(recordsText);
      if (rows.length !== manifest.count) throw new Error('Niepełny zbiór danych.');
      engine = new SearchEngine(rows, MiniSearch.loadJSON<Entry>(indexText, INDEX_OPTIONS));
      send({ type: 'ready', count: rows.length });
    } else if (message.type === 'search') {
      if (!engine) throw new Error('Dane nie są jeszcze gotowe.');
      current = { requestId: message.requestId, result: engine.search(publicQuery(message.query)) };
      emitPage(0, 100, 0);
    } else if (current?.requestId === message.requestId) {
      emitPage(message.offset, message.limit, message.windowId);
    }
  } catch (error) {
    send({ type: 'error', requestId: 'requestId' in message ? message.requestId : undefined,
      message: error instanceof Error ? error.message : String(error) });
  }
};
```

Worker nie przesyła pełnego zbioru do wątku interfejsu. Po nowym wyszukiwaniu wcześniejszy wynik jest zastępowany, nie odkładany w historii.

- [ ] Najpierw zapisać test `tests/site/window.test.ts`, uruchomić go i potwierdzić brak modułu:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { windowFor, ROW_HEIGHT } from '../../src/ui/window.ts';

test('pierwsza partia, rozwijanie i ograniczenie liczby wierszy', () => {
  assert.deepEqual(windowFor(0, 600, 66343, 100), {
    start: 0, end: 100, visible: 100, top: 0, bottom: 0,
  });
  const next = windowFor(95 * ROW_HEIGHT, 600, 66343, 100);
  assert.equal(next.visible, 200);
  const middle = windowFor(505 * ROW_HEIGHT, 600, 66343, 700);
  assert.equal(middle.start, 400);
  assert.equal(middle.end, 700);
  assert.equal(middle.top, 400 * ROW_HEIGHT);
  const last = windowFor(66340 * ROW_HEIGHT, 600, 66343, 66343);
  assert.equal(last.end, 66343);
  assert(last.end - last.start <= 300);
  assert.equal(windowFor(0, 600, 0, 0).end, 0);
});
```

- [ ] Utworzyć `src/ui/window.ts`:

```ts
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
```

Okno obejmuje najwyżej trzy partie, a nie wszystkie wcześniej obejrzane wpisy. Wysokości zastępczych obszarów zachowują możliwość powrotu do wcześniejszych wyników. `visible` nie jest liczbą dopasowań; pełną liczbę dopasowań pokazuje `total`.

- [ ] Uruchomić `node --test tests/site/window.test.ts` i `npm run typecheck`. Testy muszą przejść. Zapisać commit zadania.

## Zadanie 4: publiczna tabela, wszystkie filtry i pełny wpis

**Pliki:** utworzyć `site/index.html`, `site/main.ts`, `site/style.css`, `src/ui/record.ts` i `vite.site.config.ts`; zmienić `package.json`.

**Interfejsy:** formularz tworzy PublicQuery; windowFor() wylicza zakres, a worker dostarcza Entry[]. Kontroler rozróżnia requestId wyszukiwania i windowId partii. Poniższy kod tworzy osobny publiczny punkt wejścia; laboratorium pozostaje dostępne.

- [ ] Utworzyć site/index.html:

~~~html
<!doctype html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rejestr wydatków Gdańska</title>
</head>
<body>
<main>
  <header>
    <h1>Rejestr wydatków Gdańska</h1>
    <p>Wyszukuj i porównuj wpisy z rejestru wydatków z lat 2015–2026.</p>
  </header>
  <p id="status" role="status">Wczytywanie danych…</p>
  <button id="retry" type="button" hidden>Spróbuj ponownie</button>
  <form id="search-form">
    <fieldset id="controls" disabled>
      <legend>Wyszukiwanie i filtry</legend>
      <div class="search-line">
        <label class="grow">Szukaj we wszystkich polach tekstowych
          <input id="query" type="search" placeholder="np. remont szkoły" aria-describedby="search-note">
        </label>
        <button type="submit">Szukaj</button>
        <button id="clear" type="button" class="secondary">Wyczyść filtry</button>
      </div>
      <p id="search-note" class="note">Każde słowo musi pasować. Pomijamy wielkość liter i polskie znaki. W opisach, trybach, rodzajach i nazwach kontrahentów uwzględniamy jedną literówkę od czterech znaków.</p>
      <p id="count" aria-live="polite"></p>
      <div class="table-scroll" tabindex="0" role="region" aria-label="Wyniki — tabela przewijana pionowo i poziomo">
        <table>
          <caption class="visually-hidden">Wpisy rejestru wydatków</caption>
          <thead><tr id="headings"></tr><tr id="filter-head"></tr></thead>
          <tbody id="results" aria-busy="true"></tbody>
        </table>
      </div>
      <p id="empty" hidden>Brak wpisów spełniających wszystkie warunki.</p>
      <button id="more" type="button" hidden>Pokaż kolejne 100 wpisów</button>
    </fieldset>
  </form>
  <footer>
    <p>Każdy wiersz odpowiada jednemu wpisowi źródłowemu. Rok 2026 obejmuje publikację do 29 lipca. Kwoty opisują poniesione wydatki.</p>
    <p>Poprawiono sześć oczywistych literówek w latach dat, zgodnie z analizą plików źródłowych. Pełne opisy zachowano, również gdy zawierają fragmenty innych wpisów.</p>
  </footer>
</main>
<dialog id="record-dialog" aria-labelledby="record-title">
  <form method="dialog"><button autofocus>Zamknij</button></form>
  <h2 id="record-title">Pełny wpis</h2>
  <dl id="record-fields"></dl>
</dialog>
<script type="module" src="/main.ts"></script>
</body>
</html>
~~~

- [ ] Utworzyć src/ui/record.ts. Stała wysokość wierszy pozwala ograniczyć DOM; pełny wpis otwiera się na tej samej stronie w natywnym dialogu.

~~~ts
import { DATE_FIELDS, LABELS } from '../search/model.ts';
import type { Entry } from '../search/model.ts';
export const COLUMNS = ['contractDate', 'contractorName', 'contractSubject', 'contractCost', 'departmentOffice', 'contractNumber', 'contractProcedure', 'contractType', 'contractStartDate', 'contractEndDate'] as const;
const amount = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function display(entry: Entry, field: typeof COLUMNS[number]): string {
  if (field === 'contractCost') return amount.format(entry.contractCost);
  const value = entry[field];
  if (value === null) return 'Brak danych';
  if (DATE_FIELDS.includes(field as typeof DATE_FIELDS[number])) {
    const text = String(value);
    return text.slice(0, 10) + (text.slice(11, 19) === '00:00:00' ? '' : ' ' + text.slice(11, 19));
  }
  return String(value);
}
export function openRecord(entry: Entry) {
  const dialog = document.querySelector<HTMLDialogElement>('#record-dialog')!;
  const fields = document.querySelector('#record-fields')!;
  fields.replaceChildren();
  document.querySelector('#record-title')!.textContent = 'Pełny wpis ' + entry.id;
  for (const field of COLUMNS) {
    const label = document.createElement('dt'); label.textContent = LABELS[field];
    const value = document.createElement('dd'); value.textContent = display(entry, field);
    fields.append(label, value);
  }
  dialog.showModal();
}
export function renderRow(entry: Entry, index: number): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.className = 'entry-row'; row.dataset.id = entry.id;
  row.setAttribute('aria-rowindex', String(index + 3));
  for (const field of COLUMNS) {
    const cell = document.createElement('td');
    if (field === 'contractCost') cell.className = 'number';
    const box = document.createElement('div');
    const text = document.createElement('span'); text.textContent = display(entry, field);
    box.append(text);
    if (field === 'contractSubject') {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = 'Rozwiń wpis';
      button.setAttribute('aria-label', 'Rozwiń wpis ' + entry.id);
      button.addEventListener('click', () => openRecord(entry)); box.append(button);
    }
    cell.append(box); row.append(cell);
  }
  return row;
}
~~~

- [ ] Utworzyć site/main.ts z kompletnym połączeniem kontrolek i workera:

~~~ts
import './style.css';
import { DATE_FIELDS, FUZZY_FIELDS, LABELS, normalize } from '../src/search/model.ts';
import type { Entry, Filters, Result } from '../src/search/model.ts';
import type { PublicQuery } from '../src/search/public-query.ts';
import type { Request, Response } from '../src/search/protocol.ts';
import { COLUMNS, renderRow } from '../src/ui/record.ts';
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
const integer = new Intl.NumberFormat('pl-PL');
const textFields = [...FUZZY_FIELDS, 'contractNumber'] as const;
const departments = new Set<string>();
let facets: Result['facets'] = [];
let sort: NonNullable<PublicQuery['sort']> = { field: 'contractDate', direction: 'desc' };
let worker: Worker | undefined;
let ready = false, waiting = false, queryPending = true;
let requestId = 0, windowId = 0, total = 0;
let bounds = { start: 0, end: 0, visible: 0, top: 0, bottom: 0 };
let timer: ReturnType<typeof setTimeout> | undefined;
const send = (message: Request) => worker!.postMessage(message);

function textControl(id: string, label: string, type = 'search') {
  const control = document.createElement('input');
  control.id = id; control.type = type; control.setAttribute('aria-label', label);
  return control;
}
for (const field of COLUMNS) {
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
  } else if (DATE_FIELDS.includes(field as typeof DATE_FIELDS[number])) {
    for (const [key, label] of [['from', 'Od'], ['to', 'Do']]) {
      const wrapper = document.createElement('label'); wrapper.textContent = label;
      wrapper.append(textControl(field + '-' + key, LABELS[field] + ': ' + label, 'date'));
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
  for (const field of DATE_FIELDS) {
    const from = input(field + '-from').value, to = input(field + '-to').value;
    input(field + '-to').setCustomValidity(from && to && from > to ? 'Data końcowa nie może poprzedzać początkowej.' : '');
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
  const fragment = document.createDocumentFragment();
  function spacer(height: number) {
    const row = document.createElement('tr'); row.className = 'table-spacer'; row.setAttribute('aria-hidden', 'true');
    const cell = document.createElement('td'); cell.colSpan = COLUMNS.length; cell.style.height = height + 'px';
    row.append(cell); fragment.append(row);
  }
  if (bounds.top) spacer(bounds.top);
  rows.forEach((entry, index) => fragment.append(renderRow(entry, offset + index)));
  if (bounds.bottom) spacer(bounds.bottom);
  body.replaceChildren(fragment);
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
      ready = true; controls.disabled = false; run(); return;
    }
    if ('requestId' in message && message.requestId !== undefined && message.requestId !== requestId) return;
    if (message.type === 'error') { fail(); return; }
    if (message.windowId !== windowId) return;
    if (message.windowId === 0) {
      total = message.total;
      bounds = { start: 0, end: message.rows.length, visible: Math.min(100, total), top: 0, bottom: 0 };
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
    status.textContent = 'Wyniki obejmują cały zbiór.';
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
more.addEventListener('click', () => updateWindow(100));
tableScroll.addEventListener('scroll', () => updateWindow(), { passive: true });
window.addEventListener('resize', () => updateWindow());
start();
~~~

Odpowiedzi nie przechowują historii wpisów w interfejsie. Dane pochodzące z JSON trafiają do textContent. Kontrolki kwot i dat korzystają z walidacji formularza; zmiana lub wyczyszczenie filtrów zachowuje sortowanie.

- [ ] Utworzyć site/style.css w stylistyce wybranego wariantu 03, zgodnie z sekcją „Wybrany wygląd”. Poniższe kopiowanie stylów POC jest jedynie bazą techniczną; zastąpić ich kolorystykę i typografię wzorcem `designs/shared.css` (style bazowe i `.editorial`). Zachować poniższe reguły geometrii i dostępności:

~~~sh
mkdir -p site
cp poc/style.css site/style.css
~~~

~~~css
[hidden] { display: none !important; }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.table-scroll { overflow-anchor: none; }
table { table-layout: fixed; width: 2200px; }
th, td { width: 220px; min-width: 0; max-width: none; }
th { white-space: normal; }
th[aria-sort="ascending"] button::after { content: ' ↑'; }
th[aria-sort="descending"] button::after { content: ' ↓'; }
.entry-row { height: 128px; }
.entry-row td { padding: 15px 12px 16px; }
.entry-row td > div { height: 96px; overflow: hidden; }
.entry-row td span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.entry-row td button { display: block; margin-top: 6px; padding: 4px 8px; }
.table-spacer td { padding: 0; border: 0; }
thead input, thead select { min-width: 0; font-size: .8rem; }
thead label { font-size: .75rem; }
.department-picker { margin-top: 0; position: relative; }
#departments { max-height: 160px; }
#departments label { white-space: normal; }
dialog { width: min(800px, 94vw); max-height: 85vh; overflow: auto; border: 1px solid #99afa0; border-radius: 8px; }
dialog::backdrop { background: rgb(0 0 0 / 35%); }
dialog dd { margin: 6px 0 18px; white-space: pre-wrap; overflow-wrap: anywhere; }
dialog dt { font-weight: 650; }
~~~

128 px wynika z 96 px treści, 31 px pionowych odstępów i 1 px obramowania. Sprawdzić tę równość w przeglądarce. Pełny tekst w dialogu zachowuje nowe wiersze.

- [ ] Utworzyć vite.site.config.ts i dopisać skrypty do package.json:

~~~ts
import { defineConfig } from 'vite';
export default defineConfig({
  root: 'site', base: './',
  build: { outDir: '../dist', emptyOutDir: true },
});
~~~

~~~json
{
  "dev": "npm run prepare:site && vite --config vite.site.config.ts --host 0.0.0.0",
  "build": "npm run prepare:site && npm run typecheck && vite build --config vite.site.config.ts",
  "preview": "vite preview --config vite.site.config.ts --host 0.0.0.0",
  "test:site:unit": "node --test tests/site/*.test.ts"
}
~~~

Są to dodatkowe wpisy w scripts.

- [ ] Uruchomić npm test, npm run test:site:unit i npm run build. Otworzyć publiczny podgląd i potwierdzić 100 pierwszych wpisów bez kontrolek laboratoryjnych. Zapisać commit zadania.

## Zadanie 5: sprawdzenie całego przepływu i kosztów przewijania

**Pliki:** utworzyć `playwright.site.config.ts`, `tests/site/browser/site.spec.ts` oraz `docs/weryfikacja-strony.md`; rozszerzyć `package.json` i `README.md`.

**Interfejsy:** sprawdzać publiczne kontrolki, `tr.entry-row`, identyfikatory `data-id`, `#count[data-total]` i natywny dialog. W `site/main.ts` zachować istniejące atrybuty `html[data-ready]`, `tbody[data-request]`, `aria-busy` i licznik; nie eksponować nowych kontrolek debugowania.

- [ ] Utworzyć osobną konfigurację na porcie 4174:

```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/site/browser', timeout: 90000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4174', browserName: 'chromium', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run preview -- --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174', reuseExistingServer: false,
  },
});
```

Dodać skrypt `"test:site:browser": "playwright test --config playwright.site.config.ts"`.

- [ ] W `tests/site/browser/site.spec.ts` zapisać poniższe testy podstawowe. Uruchomić je przed ukończeniem integracji z zadania 4 i poprawić rzeczywiste rozbieżności interfejsu:

```ts
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

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
```

Liczba 131 pochodzi z przecięcia wyników: `prescom` w kolumnie kontrahenta i `szkolenie` w przedmiocie, oba z profilem `one` i AND. To oczekiwanie regresji zachowania tekstowego, nie niezależna ocena trafności znaczeniowej.

- [ ] Dopisać test ograniczenia DOM i powrotu do pierwszego wpisu:

```ts
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
```

Test ma obejrzeć kilka tysięcy pozycji bez wzrostu liczby elementów. Funkcja `windowFor()` osobno sprawdza granicę 66 343. W przeglądarce porównać faktyczną wysokość wierszy z `ROW_HEIGHT`, również po zmianie szerokości na 390 px; rozbieżność oznacza błąd przewijania, nie powód do zmiany oczekiwania testu.

- [ ] Sprawdzić ręcznie klawiaturą dropdown wydziałów, zachowanie zaznaczeń przy wyszukiwaniu nazw, liczebności po filtrze kwoty, zamykanie dialogu i dostęp do wszystkich kolumn. Następnie wykonać:

```sh
npm test
npm run test:site:unit
npm run build
npm run test:site:browser
```

- [ ] W `docs/weryfikacja-strony.md` zapisać rzeczywiste środowisko, czasy zimnego uruchomienia, dziewięć zapytań z profilem `one`, zużycie pamięci przed i po długim przewijaniu oraz liczbę wierszy DOM. Oddzielić czas workera od przesłania odpowiedzi i renderowania.
- [ ] Sprawdzić stronę na dostępnym fizycznym telefonie i zapisać model, przeglądarkę oraz warunki sieci. Jeżeli takiego urządzenia nie ma, oznaczyć tę kontrolę jako niewykonaną i nie opisywać viewportu 390 px jako pomiaru telefonu. To kontrola odbioru wersji mobilnej, nie przeszkoda w ukończeniu kodu i plików statycznych.
- [ ] Uzupełnić `README.md` o polecenia `npm run dev`, `npm run build`, `npm run preview` oraz opis filtrów AND i tolerancji jednej edycji. Zachować odnośnik do skoroszytu. Zapisać commit zadania.

## Zadanie 6: sprawdzalny pakiet statyczny i GitHub Pages

**Pliki:** utworzyć `.github/workflows/pages.yml`; uzupełnić `README.md` i `docs/weryfikacja-strony.md`.

**Interfejsy:** wejściem są śledzone źródła `data/`, kod, konfiguracja i plik lock; wyjściem jest katalog `dist/`. Na serwer nie trafiają `node_modules`, laboratorium ani pliki narzędziowe.

- [ ] Zweryfikować publikację w podkatalogu, nie tylko pod `/`. Umieścić wynik pod `podglad/rejestr/` na zwykłym lokalnym serwerze statycznym i otworzyć `/rejestr/`. Relatywne `base: './'` musi poprawnie rozwiązywać kod, workera, manifest i dane. Sprawdzić zarówno początkowe wejście, jak i odświeżenie strony. Poniższe polecenia tworzą wyłącznie katalog kontrolny:

```sh
mkdir -p /tmp/gdansk-podglad/rejestr
cp -R dist/. /tmp/gdansk-podglad/rejestr/
node --input-type=module <<'NODE'
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
const root = '/tmp/gdansk-podglad';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.gz': 'application/octet-stream' };
createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://127.0.0.1:4180').pathname;
    const file = resolve(root, '.' + decodeURIComponent(path) + (path.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + '/')) { response.writeHead(403).end(); return; }
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
}).listen(4180, '127.0.0.1', () => console.log('Podgląd: http://127.0.0.1:4180/rejestr/'));
NODE
```

Serwer nie przekierowuje brakujących zasobów na stronę główną i nie dodaje `Content-Encoding`; weryfikuje więc także samodzielny odczyt plików gzip. Nie zmieniać adresów zasobów na zakodowaną nazwę przyszłego repozytorium.

- [ ] Przygotować ręcznie uruchamiany workflow:

```yaml
name: Publikacja rejestru wydatków
on:
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: github-pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run test:site:unit
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:site:browser
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

Podstawa konfiguracji: [GitHub — własne workflow Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) i [Vite — publikacja statyczna](https://vite.dev/guide/static-deploy.html). Działanie samego workflow wymaga skonfigurowanego repozytorium GitHub i źródła publikacji „GitHub Actions”. Brak zdalnego repozytorium obecnie nie uzasadnia wymyślania adresu ani wykonywania publikacji w ramach pisania planu.

- [ ] Upewnić się, że `data/`, współdzielony loader, pliki źródłowe i lock znajdą się w repozytorium używanym przez CI. Sprawdzić finalny wynik wszystkich testów i rozmiary `dist/`, następnie zapisać commit obejmujący workflow oraz dokumentację. Publikacja uruchamia ten konkretny, sprawdzony wynik przez `workflow_dispatch`.

## Kryteria ukończenia

| Wymaganie | Dowód |
| --- | --- |
| Pełne 66 343 wpisy i sześć korekt | Test loadera, licznik w przeglądarce, manifest źródeł |
| AND i jedna edycja, bez przełączników publicznych | `publicQuery()`, regresja POC, brak kontrolek laboratoryjnych |
| Globalne wyszukiwanie i wszystkie kolumny łącznie | Test wielokolumnowy silnika i Chromium |
| Fasety, ścisłe kwoty, lokalne zakresy dat | Dotychczasowe testy silnika oraz sprawdzenie kontrolek publicznych |
| Sortowanie zachowuje filtry i odwrotnie | Test przeglądarkowy i stan `PublicQuery` |
| 100 pierwszych wpisów, kolejne przy przewijaniu | Test początkowego renderowania i test okna |
| Ograniczony DOM i powrót do wcześniejszych wyników | Maksymalnie 300 wierszy po długim przewijaniu |
| Pełne opisy i obsługa klawiatury | Test dialogu na wpisie `2015:2614`, ręczna kontrola klawiatury |
| Statyczna publikacja w podkatalogu | Odczyt strony, workera i danych z fizycznego podkatalogu |
| Wersja mobilna | Test układu 390 px oraz osobno wynik kontroli fizycznego telefonu |

## Stan planu

Plan obejmuje implementację publicznej przeglądarki na podstawie zatwierdzonych wyników POC. Zmiany produkcyjne opisane w zadaniach pozostają do wykonania. Przed rozpoczęciem realizacji przeczytać cały dokument; wykonywać zadania w podanej kolejności, z kontrolą wyników po każdym z nich.
