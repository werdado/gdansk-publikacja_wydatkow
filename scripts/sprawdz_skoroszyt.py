#!/usr/bin/env python3
"""Niezależnie sprawdza zawartość wygenerowanego skoroszytu XLSX."""

import importlib.util
import json
import math
import re
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "wydatki-gdanska_2015-2026.xlsx"
DATA_DIR = ROOT / "data"


spec = importlib.util.spec_from_file_location("generator", ROOT / "scripts" / "generuj_skoroszyt.py")
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


def unescape(value):
    return value.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")


def attribute(tag, name):
    match = re.search(rf'\b{name}="([^"]*)"', tag)
    assert match is not None, ("brak atrybutu", name, tag[:200])
    return unescape(match.group(1))


def cells_from_row(row_xml):
    return re.findall(r'<c\b[^>]*/>|<c\b[^>]*>.*?</c>', row_xml, flags=re.DOTALL)


def cell_value(cell_xml):
    opening = cell_xml.split(">", 1)[0] + ">"
    if 't="inlineStr"' in opening:
        match = re.search(r'<t\b[^>]*>(.*?)</t>', cell_xml, flags=re.DOTALL)
        return "" if match is None else unescape(match.group(1))
    match = re.search(r'<v>(.*?)</v>', cell_xml, flags=re.DOTALL)
    return None if match is None else match.group(1)


def validate_sheet(archive, sheet_number, year, source):
    xml = archive.read(f"xl/worksheets/sheet{sheet_number}.xml").decode("utf-8")
    sheet_data = re.search(r'<sheetData>(.*?)</sheetData>', xml, flags=re.DOTALL)
    assert sheet_data is not None, (year, "brak sheetData")
    rows = re.findall(r'<row\b[^>]*>.*?</row>', sheet_data.group(1), flags=re.DOTALL)
    fields = list(source["columnNames"])
    headers = [source["columnNames"][field] for field in fields]
    assert len(rows) == len(source["results"]) + 1, (year, "liczba wierszy", len(rows))
    header_values = [cell_value(cell) for cell in cells_from_row(rows[0])]
    assert header_values == headers, (year, "nagłówki")
    auto_filter = re.search(r'<autoFilter\b[^>]*/>', xml)
    pane = re.search(r'<pane\b[^>]*/>', xml)
    assert auto_filter is not None and attribute(auto_filter.group(0), "ref") == f"A1:K{len(rows)}"
    assert pane is not None and attribute(pane.group(0), "state") == "frozen"

    cents_sum = 0
    corrections_seen = set()
    for entry_number, (row, record) in enumerate(zip(rows[1:], source["results"]), start=1):
        cells = cells_from_row(row)
        assert len(cells) == len(fields), (year, entry_number, "liczba komórek")
        for cell, field in zip(cells, fields):
            actual = cell_value(cell)
            source_value = record[field]
            if source_value is None:
                expected = None
            elif field in generator.DATE_FIELDS:
                correction = generator.DATE_CORRECTIONS.get((year, entry_number, field))
                serial, has_time = generator.parse_date(source_value, correction)
                expected = serial
                assert int(attribute(cell.split(">", 1)[0], "s")) == (3 if has_time else 2)
                if correction is not None:
                    corrections_seen.add((year, entry_number, field))
            elif field == generator.AMOUNT_FIELD:
                cents = generator.round_to_cents(source_value)
                cents_sum += cents
                expected = cents / 100
                assert attribute(cell.split(">", 1)[0], "s") == "4"
            elif field == generator.DISCLAIMER_FIELD:
                expected = "Tak" if source_value else "Nie"
            else:
                expected = generator.clean_text(source_value)

            if isinstance(expected, (int, float)):
                assert actual is not None and math.isclose(float(actual), expected, abs_tol=1e-9), (year, entry_number, field, actual, expected)
            else:
                assert actual == expected, (year, entry_number, field, actual, expected)

    expected_corrections = {key for key in generator.DATE_CORRECTIONS if key[0] == year}
    assert corrections_seen == expected_corrections, (year, "korekty", corrections_seen)
    return len(source["results"]), cents_sum, len(corrections_seen)


def main():
    assert WORKBOOK.exists(), f"Brak pliku {WORKBOOK}"
    assert zipfile.is_zipfile(WORKBOOK), "Plik nie jest poprawnym archiwum ZIP/XLSX"
    totals = []
    with zipfile.ZipFile(WORKBOOK) as archive:
        bad_entry = archive.testzip()
        assert bad_entry is None, f"Uszkodzony element archiwum: {bad_entry}"
        names = set(archive.namelist())
        assert "xl/workbook.xml" in names and "xl/styles.xml" in names
        workbook = archive.read("xl/workbook.xml").decode("utf-8")
        sheet_names = [attribute(tag, "name") for tag in re.findall(r'<sheet\b[^>]*/>', workbook)]
        assert sheet_names == [str(year) for year in range(2026, 2014, -1)], sheet_names

        for number, year in enumerate(range(2026, 2014, -1), start=1):
            path = DATA_DIR / f"publikacja-wydatkow-{year}.json"
            source = json.loads(path.read_text(encoding="utf-8"), parse_float=str)
            result = validate_sheet(archive, number, year, source)
            totals.append((year, *result))

        comment_files = sorted(name for name in names if re.fullmatch(r"xl/comments\d+\.xml", name))
        comments = 0
        comment_refs = []
        for name in comment_files:
            xml = archive.read(name).decode("utf-8")
            nodes = re.findall(r'<comment\b[^>]*>.*?</comment>', xml, flags=re.DOTALL)
            comments += len(nodes)
            comment_refs.extend(attribute(node.split(">", 1)[0], "ref") for node in nodes)
            assert all("Wartość źródłowa:" in unescape(node) for node in nodes)
        assert comments == 6, ("liczba komentarzy", comments)

    assert sum(row_count for _, row_count, _, _ in totals) == 66343
    assert sum(corrections for *_, corrections in totals) == 6
    print("Sprawdzenie zakończone powodzeniem.")
    print(f"Arkusze: {len(totals)}; wpisy: {sum(item[1] for item in totals)}; korekty dat: {sum(item[3] for item in totals)}; komentarze: {comments}.")
    for year, rows, cents, corrections in totals:
        print(f"{year}: {rows} wpisów; suma po zaokrągleniu {cents // 100}.{cents % 100:02d}; korekty dat {corrections}.")


if __name__ == "__main__":
    main()
