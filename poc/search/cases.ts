import type { Scope } from './model.ts';

export interface EvaluationCase {
  id: string;
  label: string;
  text: string;
  canonical: string;
  scope: Scope;
  anchors?: string[];
}

export const CASES: EvaluationCase[] = [
  { id: 'case', label: 'Wielkość liter', text: 'pReSsCoM', canonical: 'presscom', scope: 'contractorName', anchors: ['2026:302'] },
  { id: 'delete', label: 'Usunięta litera', text: 'prescom', canonical: 'presscom', scope: 'contractorName' },
  { id: 'swap', label: 'Zamiana kolejności liter', text: 'presscmo', canonical: 'presscom', scope: 'contractorName' },
  { id: 'insert', label: 'Dodatkowa litera', text: 'pressscom', canonical: 'presscom', scope: 'contractorName' },
  { id: 'replace', label: 'Zmieniona litera', text: 'pressxom', canonical: 'presscom', scope: 'contractorName' },
  { id: 'accents', label: 'Polskie znaki i dwa słowa', text: 'MUZEUM GDANSKA', canonical: 'muzeum gdanska', scope: 'contractorName', anchors: ['2026:230'] },
  { id: 'reorder', label: 'Odwrócona kolejność słów', text: 'gdanska muzeum', canonical: 'muzeum gdanska', scope: 'contractorName' },
  { id: 'name-typo', label: 'Literówka w nazwie', text: 'muzeun gdanska', canonical: 'muzeum gdanska', scope: 'contractorName' },
  { id: 'short-name', label: 'Krótka nazwa kontrahenta', text: 'radius', canonical: 'radius', scope: 'contractorName', anchors: ['2026:301'] },
  { id: 'procedure', label: 'Tryb zawarcia', text: 'konkurs ofert', canonical: 'konkurs ofert', scope: 'contractProcedure', anchors: ['2026:77'] },
  { id: 'procedure-typo', label: 'Literówka w trybie', text: 'konkrs ofert', canonical: 'konkurs ofert', scope: 'contractProcedure' },
  { id: 'l-stroke', label: 'Litera ł', text: 'zwykly', canonical: 'zwykly', scope: 'contractProcedure' },
  { id: 'type', label: 'Rodzaj umowy', text: 'umowa dotacja', canonical: 'umowa dotacja', scope: 'contractType' },
  { id: 'type-typo', label: 'Literówka w rodzaju', text: 'umowa dotacaj', canonical: 'umowa dotacja', scope: 'contractType' },
  { id: 'topic', label: 'Temat i odmiana przez prefiks', text: 'remont', canonical: 'remont', scope: 'contractSubject', anchors: ['2026:164', '2026:183'] },
  { id: 'topic-swap', label: 'Zamienione litery w krótkim słowie', text: 'remnot', canonical: 'remont', scope: 'contractSubject' },
  { id: 'school', label: 'Dwa słowa w opisie', text: 'remont szkoly', canonical: 'remont szkoly', scope: 'contractSubject', anchors: ['2022:4386'] },
  { id: 'school-swap', label: 'Dwa słowa z literówką', text: 'remnot szkoly', canonical: 'remont szkoly', scope: 'contractSubject' },
  { id: 'training', label: 'Częsty temat', text: 'szkolenie', canonical: 'szkolenie', scope: 'contractSubject', anchors: ['2026:209'] },
  { id: 'training-typo', label: 'Literówka w częstym temacie', text: 'szkolnie', canonical: 'szkolenie', scope: 'contractSubject' },
  { id: 'waste', label: 'Polskie znaki w opisie', text: 'wywoz odpadow', canonical: 'wywoz odpadow', scope: 'contractSubject', anchors: ['2026:632'] },
  { id: 'long-description', label: 'Dopasowanie na końcu długiego opisu', text: 'robaKOWSKI', canonical: 'robakowski', scope: 'contractSubject', anchors: ['2015:2614'] },
  { id: 'global', label: 'Wyszukiwanie globalne', text: 'presscom szkolenie', canonical: 'presscom szkolenie', scope: 'global' },
  { id: 'global-cross', label: 'Słowa w wydziale i opisie', text: 'sportu koszykowki', canonical: 'sportu koszykowki', scope: 'global', anchors: ['2026:8'] },
  { id: 'department', label: 'Fragment nazwy wydziału', text: 'kadr i organ', canonical: 'kadr i organ', scope: 'departmentOffice' },
  { id: 'department-typo', label: 'Wydział bez tolerancji literówek', text: 'kadr i oragn', canonical: 'kadr i oragn', scope: 'departmentOffice' },
  { id: 'number', label: 'Fragment numeru umowy', text: '/2766/WKIO/215/', canonical: '/2766/WKIO/215/', scope: 'contractNumber', anchors: ['2026:302'] },
  { id: 'number-global', label: 'Numer umowy globalnie', text: '/2766/WKIO/215/', canonical: '/2766/WKIO/215/', scope: 'global', anchors: ['2026:302'] },
  { id: 'number-wrong', label: 'Błędna cyfra bez przybliżania', text: '/2766/WKIO/999/', canonical: '/2766/WKIO/999/', scope: 'contractNumber' },
  { id: 'short', label: 'Krótki skrót', text: 'UM', canonical: 'um', scope: 'contractorName' },
  { id: 'none', label: 'Brak pasującego słowa', text: 'qzxvjkqzxv', canonical: 'qzxvjkqzxv', scope: 'contractSubject' },
  { id: 'half-none', label: 'Jedno słowo istnieje, drugie nie', text: 'remont qzxvjkqzxv', canonical: 'remont qzxvjkqzxv', scope: 'contractSubject' },
];
