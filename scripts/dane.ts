import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DATE_FIELDS } from '../src/search/model.ts';
import type { Entry } from '../src/search/model.ts';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CORRECTIONS: Record<string, string> = {
  '2015:2028:contractEndDate': '2015',
  '2016:2322:contractStartDate': '2016',
  '2019:49:contractStartDate': '2019',
  '2019:5855:contractStartDate': '2019',
  '2020:4659:contractStartDate': '2020',
  '2024:183:contractEndDate': '2024',
};

export async function loadSource() {
  const files = (await readdir(ROOT + 'data')).filter(file => /^publikacja-wydatkow-\d{4}\.json$/.test(file)).sort().reverse();
  const rows: Entry[] = [];
  const sources: { file: string; bytes: number; sha256: string; count: number }[] = [];
  const corrections: { id: string; field: string; original: string; corrected: string }[] = [];
  for (const file of files) {
    const bytes = await readFile(ROOT + 'data/' + file);
    const source = JSON.parse(bytes.toString());
    const year = Number(file.match(/\d{4}/)![0]);
    if (source.count !== source.results.length) throw new Error('Niezgodna liczba wpisów: ' + file);
    sources.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), count: source.results.length });
    source.results.forEach((original: Entry, index: number) => {
      const row: Entry = { ...original, id: `${year}:${index + 1}`, sourceYear: year, sourcePosition: index + 1 };
      for (const field of DATE_FIELDS) {
        const correctedYear = CORRECTIONS[`${row.id}:${field}`];
        if (correctedYear) {
          const corrected = correctedYear + row[field].slice(4);
          corrections.push({ id: row.id, field, original: row[field], corrected });
          row[field] = corrected;
        }
      }
      row.contractCost = Math.round((row.contractCost + Number.EPSILON) * 100) / 100;
      rows.push(row);
    });
  }
  if (rows.length !== 66343 || files.length !== 12 || corrections.length !== 6) throw new Error('Zmienił się zakres danych wejściowych.');
  return { rows, sources, corrections };
}
