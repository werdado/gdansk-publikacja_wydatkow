import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, arch } from 'node:os';
import MiniSearch from 'minisearch';
import { SearchEngine, INDEX_OPTIONS } from '../poc/search/engine.ts';
import { CASES } from '../poc/search/cases.ts';
import type { EvaluationCase } from '../poc/search/cases.ts';
import { FUZZY_FIELDS, PROFILE_LABELS } from '../poc/search/model.ts';
import type { Entry, Profile, Combine, Hit } from '../poc/search/model.ts';
import { loadSource, ROOT } from './dane-poc.ts';

// Reference is a full scan of canonical words, independent of MiniSearch or its scores.
// It measures recovery of canonical lexical matches, not semantic relevance.
const normalizeReference = (value: string) => value.toLowerCase().replace(/[ąćęłńóśźż]/g, letter => ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' })[letter]!);
function reference(rows: Entry[], fixture: EvaluationCase): Set<string> {
  const text = normalizeReference(fixture.canonical);
  const scope = fixture.scope;
  const literal = scope === 'departmentOffice' || scope === 'contractNumber' ? scope : scope === 'global' && /\d/.test(text) && text.includes('/') && !/\s/.test(text) ? 'contractNumber' : null;
  const wanted = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(rows.filter(row => {
    if (literal) return normalizeReference(row[literal] ?? '').includes(text);
    const fields = scope === 'global' ? FUZZY_FIELDS : [scope] as const;
    const words = fields.flatMap(field => normalizeReference(row[field] ?? '').match(/[\p{L}\p{N}]+/gu) ?? []);
    return wanted.every(term => words.some(word => term.length >= 3 && !/^\d+$/.test(term) ? word.startsWith(term) : word === term)
      || (scope === 'global' && [row.departmentOffice ?? '', row.contractNumber].some(value => normalizeReference(value).includes(term))));
  }).map(row => row.id));
}
const source = await loadSource();
global.gc?.();
const heapBefore = process.memoryUsage().heapUsed;
const start = performance.now();
const engine = new SearchEngine(source.rows);
const buildMs = performance.now() - start;
global.gc?.();
const heapAfter = process.memoryUsage().heapUsed;
const expected = new Map(CASES.map(fixture => [fixture.id, reference(source.rows, fixture)]));
for (const fixture of CASES) for (const id of fixture.anchors ?? []) assert(expected.get(fixture.id)!.has(id), `Brak referencyjnego wpisu ${id}: ${fixture.id}`);
const profiles: Profile[] = ['control', 'one', 'adaptive', 'two'];
const combinations: Combine[] = ['AND', 'OR'];
interface Evaluation {
  caseId: string; profile: Profile; combine: Combine; expected: number; returned: number; recovered: number;
  recall: number | null; precision: number | null; additional: number; timingsMs: number[];
  examples: { id: string; referenceMatch: boolean; matchedTerms: Hit['match']; contractor: string; subject: string | null; number: string }[];
  additionalExamples: { id: string; matchedTerms: Hit['match']; contractor: string; subject: string | null }[];
}
const evaluations: Evaluation[] = [];
for (const profile of profiles) for (const combine of combinations) {
  for (const fixture of CASES) {
    const query = { text: fixture.text, scope: fixture.scope, profile, combine };
    const result = engine.search(query);
    const timings = [result.elapsedMs];
    for (let repeat = 0; repeat < 2; repeat++) timings.push(engine.search(query).elapsedMs);
    const referenceIds = expected.get(fixture.id)!;
    const hits = result.hits.filter(hit => referenceIds.has(hit.id)).length;
    evaluations.push({ caseId: fixture.id, profile, combine, expected: referenceIds.size, returned: result.hits.length, recovered: hits,
      recall: referenceIds.size ? hits / referenceIds.size : null,
      precision: result.hits.length ? hits / result.hits.length : null,
      additional: result.hits.length - hits, timingsMs: timings,
      examples: result.hits.slice(0, 5).map(hit => {
        const row = engine.byId.get(hit.id)!;
        return { id: hit.id, referenceMatch: referenceIds.has(hit.id), matchedTerms: hit.match, contractor: row.contractorName, subject: row.contractSubject, number: row.contractNumber };
      }),
      additionalExamples: result.hits.filter(hit => !referenceIds.has(hit.id)).slice(0, 3).map(hit => {
        const row = engine.byId.get(hit.id)!;
        return { id: hit.id, matchedTerms: hit.match, contractor: row.contractorName, subject: row.contractSubject };
      }),
    });
  }
  console.log(`Zakończono ${profile}/${combine}: ${CASES.length} zapytań × 3 pomiary.`);
}
const indexJson = JSON.stringify(engine.index);
const restoreStart = performance.now();
const restored = MiniSearch.loadJSON<Entry>(indexJson, INDEX_OPTIONS);
const restoreMs = performance.now() - restoreStart;
const restoredEngine = new SearchEngine(source.rows, restored);
for (const fixture of CASES) {
  const query = { text: fixture.text, scope: fixture.scope, profile: 'adaptive' as const, combine: 'AND' as const };
  assert.deepEqual(restoredEngine.search(query).hits.map(hit => hit.id), engine.search(query).hits.map(hit => hit.id), `Niezgodny indeks po odczycie: ${fixture.id}`);
}
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const percentile = (values: number[], fraction: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1];
const summary = profiles.flatMap(profile => combinations.map(combine => {
  const cases = evaluations.filter(value => value.profile === profile && value.combine === combine);
  const timings = cases.flatMap(value => value.timingsMs);
  return { profile, combine,
    macroRecall: mean(cases.flatMap(value => value.recall === null ? [] : [value.recall])),
    macroPrecision: mean(cases.flatMap(value => value.precision === null ? [] : [value.precision])),
    medianMs: percentile(timings, 0.5), p95Ms: percentile(timings, 0.95), maxMs: Math.max(...timings),
    emptyReferenceCorrect: cases.filter(value => value.expected === 0 && value.returned === 0).length,
    emptyReferenceTotal: cases.filter(value => value.expected === 0).length,
  };
}));
const manifest = JSON.parse(await readFile(ROOT + 'poc/public/generated/manifest.json', 'utf8'));
assert.deepEqual(source.sources, manifest.sources, 'Wygenerowane dane nie odpowiadają bieżącym źródłom. Uruchom npm run prepare:poc.');
const report = {
  generatedAt: new Date().toISOString(), environment: { node: process.version, platform: platform(), arch: arch(), cpu: cpus()[0]?.model, logicalCpus: cpus().length },
  records: source.rows.length, buildMs, restoreMs, heap: { beforeBytes: heapBefore, afterBytes: heapAfter, engineIncrementBytes: heapAfter - heapBefore },
  artifacts: manifest.artifacts, sources: source.sources, corrections: source.corrections,
  fixtureCount: CASES.length, repetitions: 3, fixtures: CASES, summary, evaluations,
};
await mkdir(ROOT + 'docs/wyniki-poc', { recursive: true });
await writeFile(ROOT + 'docs/wyniki-poc/wyszukiwanie.json', JSON.stringify(report, null, 2));
const percent = (value: number) => (value * 100).toFixed(1) + '%';
const lines = [
  '# Wyniki automatycznej oceny wyszukiwania', '',
  `Pomiar: ${report.generatedAt}. Node ${process.version}, ${platform()}/${arch()}, ${cpus()[0]?.model}.`, '',
  `${source.rows.length.toLocaleString('pl-PL')} wpisy; ${CASES.length} zapytania; 4 profile × 2 sposoby łączenia słów; po 3 wykonania każdego zapytania.`, '',
  '## Znaczenie miar', '',
  'Referencja powstaje przez niezależny przegląd wszystkich wpisów dla poprawnie zapisanych słów zapytania, z uwzględnieniem prefiksów i warunku AND. Nie jest oceną znaczenia przez człowieka. Odzyskanie oznacza odsetek wpisów referencyjnych znalezionych przez badane zapytanie. Zgodność oznacza udział wpisów referencyjnych w wynikach. Dodatkowy wynik może być trafnym wariantem słowa albo szumem; wymaga obejrzenia.', '',
  'Podane procenty są średnimi po zapytaniach. Odzyskanie pomija przypadki z pustą referencją, zgodność pomija zapytania bez wyników. Osobno pokazano poprawne puste wyniki. Czasy obejmują wyszukiwanie, filtry, fasety i sortowanie; nie obejmują sieci, przesyłania do interfejsu ani renderowania. Są to pomiary lokalne, bez izolowania obciążenia systemu.', '',
  '| Profil | Łączenie | Odzyskanie referencji | Zgodność z referencją | Poprawne puste | Mediana ms | p95 ms | Maks. ms |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...summary.map(value => `| ${PROFILE_LABELS[value.profile]} | ${value.combine} | ${percent(value.macroRecall)} | ${percent(value.macroPrecision)} | ${value.emptyReferenceCorrect}/${value.emptyReferenceTotal} | ${value.medianMs.toFixed(1)} | ${value.p95Ms.toFixed(1)} | ${value.maxMs.toFixed(1)} |`), '',
  '## Rozmiar i przygotowanie', '',
  `- Utworzenie indeksu w pamięci: ${buildMs.toFixed(0)} ms; odtworzenie z JSON: ${restoreMs.toFixed(0)} ms.`,
  `- Sterta po utworzeniu silnika i GC: ${(heapAfter / 1e6).toFixed(1)} MB; przyrost względem samych wczytanych danych: ${((heapAfter - heapBefore) / 1e6).toFixed(1)} MB. To nie jest szczyt pamięci ani pomiar telefonu.`,
  `- Rekordy: ${(manifest.artifacts.records.bytes / 1e6).toFixed(2)} MB; gzip ${(manifest.artifacts.records.gzipBytes / 1e6).toFixed(2)} MB.`,
  `- Indeks: ${(manifest.artifacts.index.bytes / 1e6).toFixed(2)} MB; gzip ${(manifest.artifacts.index.gzipBytes / 1e6).toFixed(2)} MB.`,
  '- Gzip opisuje wynik lokalnej kompresji. POC udostępnia zwykłe JSON; kompresja HTTP zależy od hostingu.',
  '- Sprawdzono zgodność wyników 32 zapytań po serializacji indeksu oraz sumy kontrolne wszystkich źródeł.', '',
  '## Wyniki poszczególnych zapytań — AND', '',
  '| Zapytanie | Pole | Referencja | Kontrola | 1 edycja | Próg 25% | 2 edycje |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
  ...CASES.map(fixture => `| ${fixture.text} | ${fixture.scope} | ${expected.get(fixture.id)!.size} | ${profiles.map(profile => { const item = evaluations.find(value => value.caseId === fixture.id && value.profile === profile && value.combine === 'AND')!; return `${item.returned} (${item.additional} dodatk.)`; }).join(' | ')} |`), '',
  'Pełne wyniki, dopasowane słowa, przykłady dodatkowych trafień i identyfikatory źródeł: [wyszukiwanie.json](wyszukiwanie.json).', '',
];
await writeFile(ROOT + 'docs/wyniki-poc/wyszukiwanie.md', lines.join('\n'));
console.log(JSON.stringify({ buildMs, restoreMs, heapAfterMB: heapAfter / 1e6, summary }, null, 2));
