import assert from 'node:assert/strict';
import { test } from 'node:test';
import MiniSearch from 'minisearch';
import { SearchEngine, INDEX_OPTIONS } from '../src/search/engine.ts';
import { normalize } from '../src/search/model.ts';
import type { Entry, Query } from '../src/search/model.ts';
import { loadSource } from '../scripts/dane.ts';

const makeRow = (id: string, changes: Partial<Entry>): Entry => ({
  id, sourceYear: 2026, sourcePosition: Number(id.split(':')[1]),
  departmentOffice: 'WYDZIAŁ EDUKACJI', contractorName: 'MUZEUM GDAŃSKA',
  contractDate: '2026-01-15T12:30:00+0100', contractStartDate: '2026-01-01T00:00:00+0100', contractEndDate: '2026-12-31T00:00:00+0100',
  contractCost: 100, contractSubject: 'Remont szkoły', contractProcedure: 'ZWYKŁY', contractType: 'UMOWA', contractDisclaimer: false, contractNumber: 'ABC/123/2026', ...changes,
});
const rows = [
  makeRow('2026:1', {}),
  makeRow('2026:2', { departmentOffice: 'BIURO SPORTU', contractorName: 'PRESSCOM', contractDate: '2026-01-16T00:00:00+0100', contractCost: 200, contractSubject: 'Remont hali', contractNumber: 'ABC/124/2026' }),
  makeRow('2026:3', { departmentOffice: null, contractCost: 300, contractSubject: null, contractNumber: 'ABC/123/2025' }),
  makeRow('2026:4', { contractSubject: '<script>alert("test")</script> szkoły', contractCost: 400 }),
];
const engine = new SearchEngine(rows);
const query = (changes: Partial<Query> = {}): Query => ({ text: '', scope: 'global', profile: 'adaptive', combine: 'AND', ...changes });
const ids = (changes: Partial<Query>) => engine.search(query(changes)).hits.map(hit => hit.id);

test('polskie znaki, w tym ł, oraz wielkość liter', () => {
  assert.equal(normalize('ĄĆĘŁŃÓŚŹŻ'), 'acelnoszz');
  assert.deepEqual(ids({ text: 'szkoly', scope: 'contractSubject', profile: 'control' }), ['2026:1', '2026:4']);
});
test('zamiana sąsiadujących liter wymaga dwóch edycji', () => {
  assert.deepEqual(ids({ text: 'remnot', scope: 'contractSubject', profile: 'one' }), []);
  assert.deepEqual(ids({ text: 'remnot', scope: 'contractSubject', profile: 'adaptive' }), ['2026:2', '2026:1']);
});
test('AND, OR i różna kolejność słów dają jawnie różne zbiory', () => {
  assert.deepEqual(ids({ text: 'szkoly remont', scope: 'contractSubject', profile: 'control' }), ['2026:1']);
  assert.deepEqual(ids({ text: 'szkoly remont', scope: 'contractSubject', profile: 'control', combine: 'OR' }), ['2026:2', '2026:1', '2026:4']);
});
test('globalne zapytanie łączy wydział i opis; filtr kolumny ogranicza pole', () => {
  assert.deepEqual(ids({ text: 'sportu remont', profile: 'control' }), ['2026:2']);
  assert.deepEqual(ids({ text: 'sportu remont', scope: 'contractSubject', profile: 'control' }), []);
});
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
test('numery umów zachowują interpunkcję i literalne cyfry', () => {
  assert.deepEqual(ids({ text: '/123/2025', scope: 'contractNumber' }), ['2026:3']);
  assert.deepEqual(ids({ text: '/123/2025' }), ['2026:3']);
  assert.deepEqual(ids({ text: '/123/2024', scope: 'contractNumber' }), []);
});
test('wyszukiwanie wydziału nie toleruje literówek', () => {
  assert.deepEqual(ids({ text: 'WYDZIAL EDU', scope: 'departmentOffice' }), ['2026:1', '2026:4']);
  assert.deepEqual(ids({ text: 'wydzial edku', scope: 'departmentOffice' }), []);
});
test('progi kwot są ścisłe; sortowanie nie zmienia zbioru', () => {
  const filters = { amount: { operator: '>' as const, value: 200 } };
  assert.deepEqual(ids({ filters, sort: { field: 'contractCost', direction: 'desc' } }), ['2026:4', '2026:3']);
  assert.deepEqual(ids({ filters, sort: { field: 'contractCost', direction: 'asc' } }), ['2026:3', '2026:4']);
  assert.deepEqual(ids({ filters: { amount: { operator: '<', value: 200 } } }), ['2026:1']);
});
test('dni graniczne obejmują cały lokalny dzień, bez konwersji na UTC', () => {
  assert.deepEqual(ids({ filters: { dates: { contractDate: { from: '2026-01-15', to: '2026-01-15' } } } }), ['2026:1', '2026:3', '2026:4']);
});
test('fasety uwzględniają inne filtry, ale pomijają wybór wydziału', () => {
  const result = engine.search(query({ filters: { departments: ['BIURO SPORTU'], amount: { operator: '>', value: 100 } } }));
  assert.deepEqual(result.hits.map(hit => hit.id), ['2026:2']);
  assert.deepEqual(Object.fromEntries(result.facets.map(f => [f.name, f.count])), { '': 1, 'BIURO SPORTU': 1, 'WYDZIAŁ EDUKACJI': 1 });
});
test('wiele wydziałów łączy się przez OR, brak danych pozostaje dostępny', () => {
  assert.deepEqual(ids({ filters: { departments: ['BIURO SPORTU', ''] } }), ['2026:2', '2026:3']);
});
test('serializacja indeksu zachowuje wyniki', () => {
  const restored = new SearchEngine(rows, MiniSearch.loadJSON<Entry>(JSON.stringify(engine.index), INDEX_OPTIONS));
  const request = query({ text: 'muzeun gdanska', scope: 'contractorName' });
  assert.deepEqual(restored.search(request).hits, engine.search(request).hits);
});
test('wszystkie wpisy, powtarzające się numery i sześć korekt dat', async () => {
  const source = await loadSource();
  assert.equal(source.rows.length, 66343);
  assert.equal(new Set(source.rows.map(row => row.id)).size, 66343);
  assert.equal(source.corrections.length, 6);
  assert.equal(source.rows.find(row => row.id === '2020:4659')!.contractStartDate.slice(0, 10), '2020-01-15');
  assert.equal(source.rows.find(row => row.id === '2016:2322')!.contractStartDate.slice(0, 10), '2016-08-26');
  assert.equal(source.rows.find(row => row.id === '2015:2614')!.contractSubject!.length, 4375);
  const numberCounts = new Map<string, number>();
  for (const row of source.rows) numberCounts.set(row.contractNumber, (numberCounts.get(row.contractNumber) ?? 0) + 1);
  const repeated = [...numberCounts.values()].filter(count => count > 1);
  assert.equal(numberCounts.size, 66333);
  assert.equal(repeated.length, 9);
  assert.equal(repeated.reduce((sum, count) => sum + count, 0), 19);
});
