export const FUZZY_FIELDS = ['contractSubject', 'contractProcedure', 'contractType', 'contractorName'] as const;
export const DATE_FIELDS = ['contractDate', 'contractStartDate', 'contractEndDate'] as const;
export type FuzzyField = typeof FUZZY_FIELDS[number];
export type DateField = typeof DATE_FIELDS[number];
export type TextField = FuzzyField | 'departmentOffice' | 'contractNumber';
export type Scope = TextField | 'global';
export type Profile = 'control' | 'one' | 'adaptive' | 'two';
export type Combine = 'AND' | 'OR';
export interface Entry {
  id: string;
  sourceYear: number;
  sourcePosition: number;
  departmentOffice: string | null;
  contractDate: string;
  contractStartDate: string;
  contractEndDate: string;
  contractorName: string;
  contractSubject: string | null;
  contractProcedure: string;
  contractType: string;
  contractNumber: string;
  contractCost: number;
  contractDisclaimer: boolean;
}
export interface Filters {
  departments?: string[];
  amount?: { operator: '>' | '<'; value: number };
  dates?: Partial<Record<DateField, { from?: string; to?: string }>>;
}
export interface Query {
  text: string;
  scope: Scope;
  profile: Profile;
  combine: Combine;
  filters?: Filters;
  sort?: { field: TextField | DateField | 'contractCost'; direction: 'asc' | 'desc' };
}
export interface Hit { id: string; match: Record<string, string[]> }
export interface Result {
  hits: Hit[];
  facets: { name: string; count: number }[];
  elapsedMs: number;
}
export const LABELS: Record<Scope | DateField | 'contractCost', string> = {
  global: 'Wszystkie pola tekstowe',
  departmentOffice: 'Wydział urzędu',
  contractDate: 'Data zawarcia',
  contractStartDate: 'Obowiązuje od dnia',
  contractEndDate: 'Obowiązuje do dnia',
  contractorName: 'Kontrahent',
  contractSubject: 'Przedmiot umowy',
  contractProcedure: 'Tryb zawarcia',
  contractType: 'Rodzaj umowy',
  contractNumber: 'Numer umowy',
  contractCost: 'Poniesione wydatki',
};
export const PROFILE_LABELS: Record<Profile, string> = {
  control: 'Kontrola: bez literówek',
  one: 'Maks. 1 edycja',
  adaptive: 'Próg 25%, maks. 2 edycje',
  two: 'Maks. 2 edycje',
};
export function normalize(text: string): string {
  return text.toLowerCase().replaceAll('ł', 'l').normalize('NFD').replace(/\p{M}/gu, '');
}
export function tokenize(text: string): string[] {
  return normalize(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}
