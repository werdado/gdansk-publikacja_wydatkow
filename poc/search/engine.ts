import MiniSearch from 'minisearch';
import { DATE_FIELDS, FUZZY_FIELDS, normalize, tokenize } from './model.ts';
import type { Entry, Hit, Profile, Query, Result } from './model.ts';

export const INDEX_OPTIONS = { fields: [...FUZZY_FIELDS], tokenize, processTerm: normalize };

export function fuzzyLimit(profile: Profile, term: string): number | false {
  if (profile === 'control' || term.length < 4 || /^\d+$/.test(term)) return false;
  if (profile === 'one') return 1;
  if (profile === 'two') return 2;
  return Math.min(2, Math.round(term.length * 0.25));
}

export class SearchEngine {
  readonly rows: Entry[];
  readonly byId: Map<string, Entry>;
  readonly index: MiniSearch<Entry>;
  readonly literals: { id: string; departmentOffice: string; contractNumber: string }[];
  readonly departments: string[];
  readonly collator = new Intl.Collator('pl', { numeric: true, sensitivity: 'base' });

  constructor(rows: Entry[], index?: MiniSearch<Entry>) {
    this.rows = rows;
    this.byId = new Map(rows.map(row => [row.id, row]));
    if (this.byId.size !== rows.length) throw new Error('Powtarzające się identyfikatory wpisów.');
    this.index = index ?? new MiniSearch<Entry>(INDEX_OPTIONS);
    if (!index) this.index.addAll(rows);
    if (this.index.documentCount !== rows.length) throw new Error('Indeks nie obejmuje wszystkich wpisów.');
    this.literals = rows.map(row => ({ id: row.id, departmentOffice: normalize(row.departmentOffice ?? ''), contractNumber: normalize(row.contractNumber) }));
    this.departments = [...new Set(rows.map(row => row.departmentOffice ?? ''))].sort(this.collator.compare);
  }

  candidates(query: Query): Hit[] {
    const text = normalize(query.text.trim());
    if (!text) return this.rows.map(row => ({ id: row.id, match: {} }));
    const literalField = query.scope === 'contractNumber' || query.scope === 'departmentOffice' ? query.scope : null;
    // A complete agreement-number fragment keeps its punctuation also in global search.
    if (literalField || (query.scope === 'global' && /\d/.test(text) && text.includes('/') && !/\s/.test(text))) {
      const field = literalField ?? 'contractNumber';
      return this.literals.filter(row => row[field].includes(text)).map(row => ({ id: row.id, match: { [text]: [field] } }));
    }
    const terms = [...new Set(tokenize(text))];
    if (!terms.length) return [];
    const options = {
      fuzzy: (term: string) => fuzzyLimit(query.profile, term),
      prefix: (term: string) => term.length >= 3 && !/^\d+$/.test(term),
      combineWith: query.combine,
    };
    if (query.scope !== 'global') {
      return this.index.search(text, { ...options, fields: [query.scope] }).map(hit => ({ id: String(hit.id), match: hit.match }));
    }
    let combined: Map<string, Hit> | undefined;
    for (const term of terms) {
      const matches = new Map<string, Hit>(this.index.search(term, options).map(hit => [String(hit.id), { id: String(hit.id), match: hit.match }]));
      for (const row of this.literals) {
        const fields = (['departmentOffice', 'contractNumber'] as const).filter(field => row[field].includes(term));
        if (fields.length) {
          const previous = matches.get(row.id);
          matches.set(row.id, { id: row.id, match: mergeMatches(previous?.match ?? {}, { [term]: fields }) });
        }
      }
      if (!combined) combined = matches;
      else if (query.combine === 'AND') {
        for (const [id, hit] of combined) {
          const next = matches.get(id);
          if (next) hit.match = mergeMatches(hit.match, next.match);
          else combined.delete(id);
        }
      } else {
        for (const [id, hit] of matches) {
          const previous = combined.get(id);
          combined.set(id, { id, match: mergeMatches(previous?.match ?? {}, hit.match) });
        }
      }
    }
    return [...(combined?.values() ?? [])];
  }

  search(query: Query): Result {
    const start = performance.now();
    const filters = query.filters ?? {};
    const counts = new Map(this.departments.map(name => [name, 0]));
    const selected = new Set(filters.departments ?? []);
    const hits = this.candidates(query).filter(hit => {
      const row = this.byId.get(hit.id)!;
      if (filters.amount && !(filters.amount.operator === '>' ? row.contractCost > filters.amount.value : row.contractCost < filters.amount.value)) return false;
      for (const field of DATE_FIELDS) {
        const range = filters.dates?.[field];
        const day = row[field].slice(0, 10);
        if (range?.from && day < range.from) return false;
        if (range?.to && day > range.to) return false;
      }
      const department = row.departmentOffice ?? '';
      counts.set(department, counts.get(department)! + 1);
      return !selected.size || selected.has(department);
    });
    const sort = query.sort ?? { field: 'contractDate', direction: 'desc' };
    const sign = sort.direction === 'asc' ? 1 : -1;
    hits.sort((a, b) => {
      const left = this.byId.get(a.id)!;
      const right = this.byId.get(b.id)!;
      const valueA = left[sort.field];
      const valueB = right[sort.field];
      const comparison = typeof valueA === 'number' && typeof valueB === 'number'
        ? valueA - valueB
        : DATE_FIELDS.includes(sort.field as typeof DATE_FIELDS[number])
          ? String(valueA).slice(0, 19).localeCompare(String(valueB).slice(0, 19))
          : this.collator.compare(String(valueA ?? ''), String(valueB ?? ''));
      return sign * comparison || right.sourceYear - left.sourceYear || left.sourcePosition - right.sourcePosition;
    });
    return { hits, facets: [...counts].map(([name, count]) => ({ name, count })), elapsedMs: performance.now() - start };
  }
}

function mergeMatches(a: Hit['match'], b: Hit['match']): Hit['match'] {
  const result = { ...a };
  for (const [term, fields] of Object.entries(b)) result[term] = [...new Set([...(result[term] ?? []), ...fields])];
  return result;
}
