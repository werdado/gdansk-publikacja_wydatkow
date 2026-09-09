import { DATE_FIELDS, LABELS } from '../search/model.ts';
import type { Entry } from '../search/model.ts';
export const TABLE_COLUMNS = ['contractDate', 'contractorName', 'contractSubject', 'contractCost', 'departmentOffice', 'contractNumber'] as const;
const DETAIL_FIELDS = [...TABLE_COLUMNS, 'contractProcedure', 'contractType', 'contractStartDate', 'contractEndDate'] as const;
const amount = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function display(entry: Entry, field: typeof DETAIL_FIELDS[number]): string {
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
  for (const field of DETAIL_FIELDS) {
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
  row.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('button')) return;
    openRecord(entry);
  });
  for (const field of TABLE_COLUMNS) {
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
