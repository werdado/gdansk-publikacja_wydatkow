#!/usr/bin/env python3
"""Tworzy skoroszyt Excel z rocznych plików rejestru wydatków."""

import json
import os
import re
import tempfile
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT = ROOT / "wydatki-gdanska_2015-2026.xlsx"

DATE_FIELDS = {"contractDate", "contractStartDate", "contractEndDate"}
AMOUNT_FIELD = "contractCost"
DISCLAIMER_FIELD = "contractDisclaimer"

# Klucz: (rok pliku, numer wpisu liczony od 1, nazwa pola); wartość: poprawny rok.
DATE_CORRECTIONS = {
    (2015, 2028, "contractEndDate"): 2015,
    (2016, 2322, "contractStartDate"): 2016,
    (2019, 49, "contractStartDate"): 2019,
    (2019, 5855, "contractStartDate"): 2019,
    (2020, 4659, "contractStartDate"): 2020,
    (2024, 183, "contractEndDate"): 2024,
}

INVALID_XML = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
DATE_RE = re.compile(
    r"^(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})T"
    r"(?P<hour>\d{2}):(?P<minute>\d{2}):(?P<second>\d{2})(?P<offset>[+-]\d{4})$"
)


def clean_text(value):
    """Usuwa znaki niedozwolone w XML 1.0, zachowując pozostałą treść."""
    return INVALID_XML.sub("�", value)


def escape(value):
    """Koduje pięć znaków specjalnych XML bez zależności od modułu xml."""
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def column_name(number):
    result = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result


def round_to_cents(value):
    """Zaokrągla dodatnią liczbę dziesiętną do groszy metodą half-up."""
    raw = str(value)
    if "e" in raw.lower():
        raise ValueError(f"Nieobsługiwany zapis wykładniczy kwoty: {raw}")
    whole, dot, fraction = raw.partition(".")
    if whole.startswith("-"):
        raise ValueError(f"Nieobsługiwana ujemna kwota: {raw}")
    fraction = (fraction + "000")[:3]
    cents = int(whole) * 100 + int(fraction[:2])
    if int(fraction[2]) >= 5:
        cents += 1
    return cents


def cents_xml(cents):
    return f"{cents // 100}.{cents % 100:02d}"


def is_leap(year):
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def days_before_year(year):
    prior = year - 1
    return 365 * prior + prior // 4 - prior // 100 + prior // 400


def ordinal(year, month, day):
    month_days = (0, 31, 28 + is_leap(year), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
    if month < 1 or month > 12 or day < 1 or day > month_days[month]:
        raise ValueError(f"Niepoprawna data: {year:04d}-{month:02d}-{day:02d}")
    return days_before_year(year) + sum(month_days[1:month]) + day


EXCEL_EPOCH_ORDINAL = ordinal(1899, 12, 30)


def parse_date(raw, corrected_year=None):
    match = DATE_RE.match(raw)
    if not match:
        raise ValueError(f"Niepoprawny znacznik czasu: {raw}")
    parts = {key: int(value) if key != "offset" else value for key, value in match.groupdict().items()}
    if corrected_year is not None:
        parts["year"] = corrected_year
    serial = ordinal(parts["year"], parts["month"], parts["day"]) - EXCEL_EPOCH_ORDINAL
    seconds = parts["hour"] * 3600 + parts["minute"] * 60 + parts["second"]
    if seconds:
        return serial + seconds / 86400, True
    return serial, False


def inline_string_cell(reference, value, style=None):
    style_attr = f' s="{style}"' if style is not None else ""
    safe = escape(clean_text(value))
    return f'<c r="{reference}"{style_attr} t="inlineStr"><is><t xml:space="preserve">{safe}</t></is></c>'


def numeric_cell(reference, value, style):
    return f'<c r="{reference}" s="{style}"><v>{value}</v></c>'


def empty_cell(reference, style=None):
    style_attr = f' s="{style}"' if style is not None else ""
    return f'<c r="{reference}"{style_attr}/>'


def correction_comment(raw, year):
    return (
        "Skorygowano rok zgodnie z uzgodnioną regułą konwersji. "
        f"Wartość źródłowa: {raw}. Przyjęty rok: {year}; "
        "rok pliku źródłowego wykorzystano jako wskazówkę."
    )


def write_sheet(archive, sheet_number, year, source, fields, headers):
    comments = []
    row_count = len(source["results"]) + 1
    last_column = column_name(len(fields))
    path = f"xl/worksheets/sheet{sheet_number}.xml"

    with archive.open(path, "w", force_zip64=True) as raw_file:
        def write(text):
            raw_file.write(text.encode("utf-8"))

        write('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
        write('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
              'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">')
        write(f'<dimension ref="A1:{last_column}{row_count}"/>')
        write('<sheetViews><sheetView tabSelected="0" workbookViewId="0">'
              '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
              '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>'
              '</sheetView></sheetViews>')
        write('<sheetFormatPr defaultRowHeight="15"/>')
        widths = (32, 13, 38, 13, 13, 18, 34, 25, 34, 13, 80)
        write('<cols>')
        for index, width in enumerate(widths, start=1):
            write(f'<col min="{index}" max="{index}" width="{width}" customWidth="1"/>')
        write('</cols><sheetData>')
        write('<row r="1" ht="30" customHeight="1">')
        for column, header in enumerate(headers, start=1):
            write(inline_string_cell(f"{column_name(column)}1", header, style=1))
        write('</row>')

        for entry_number, record in enumerate(source["results"], start=1):
            excel_row = entry_number + 1
            write(f'<row r="{excel_row}">')
            for column, field in enumerate(fields, start=1):
                reference = f"{column_name(column)}{excel_row}"
                value = record[field]
                if value is None:
                    write(empty_cell(reference, style=5 if field == "contractSubject" else None))
                elif field in DATE_FIELDS:
                    correction = DATE_CORRECTIONS.get((year, entry_number, field))
                    date_serial, has_time = parse_date(value, correction)
                    serialized = f"{date_serial:.12f}".rstrip("0").rstrip(".")
                    write(numeric_cell(reference, serialized, style=3 if has_time else 2))
                    if correction is not None:
                        comments.append((reference, correction_comment(value, correction)))
                elif field == AMOUNT_FIELD:
                    write(numeric_cell(reference, cents_xml(round_to_cents(value)), style=4))
                elif field == DISCLAIMER_FIELD:
                    write(inline_string_cell(reference, "Tak" if value else "Nie"))
                else:
                    write(inline_string_cell(reference, value, style=5 if field == "contractSubject" else None))
            write('</row>')

        write('</sheetData>')
        write(f'<autoFilter ref="A1:{last_column}{row_count}"/>')
        write('<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>')
        if comments:
            write('<legacyDrawing r:id="rId2"/>')
        write('</worksheet>')

    if comments:
        write_comments(archive, sheet_number, comments)
    return len(source["results"]), comments


def write_comments(archive, sheet_number, comments):
    relationships = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="../comments{number}.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing" Target="../drawings/vmlDrawing{number}.vml"/>
</Relationships>'''.format(number=sheet_number)
    archive.writestr(f"xl/worksheets/_rels/sheet{sheet_number}.xml.rels", relationships)

    parts = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        '<authors><author>Konwersja danych</author></authors><commentList>',
    ]
    for reference, text in comments:
        parts.append(
            f'<comment ref="{reference}" authorId="0"><text><t xml:space="preserve">'
            f'{escape(clean_text(text))}</t></text></comment>'
        )
    parts.append('</commentList></comments>')
    archive.writestr(f"xl/comments{sheet_number}.xml", "".join(parts))

    shapes = []
    for index, (reference, _) in enumerate(comments, start=1):
        match = re.match(r"([A-Z]+)(\d+)", reference)
        row = int(match.group(2)) - 1
        column_letters = match.group(1)
        column = 0
        for char in column_letters:
            column = column * 26 + ord(char) - 64
        column -= 1
        shapes.append(f'''<v:shape id="_x0000_s{1024 + index}" type="#_x0000_t202" style="position:absolute;margin-left:59.25pt;margin-top:1.5pt;width:216pt;height:90pt;z-index:{index};visibility:hidden" fillcolor="#ffffe1" o:insetmode="auto">
<v:fill color2="#ffffe1"/><v:shadow on="t" color="black" obscured="t"/><v:path o:connecttype="none"/><v:textbox style="mso-direction-alt:auto"><div style="text-align:left"/></v:textbox><x:ClientData ObjectType="Note"><x:MoveWithCells/><x:SizeWithCells/><x:Anchor>{column + 1}, 15, {row}, 2, {column + 4}, 15, {row + 5}, 4</x:Anchor><x:AutoFill>False</x:AutoFill><x:Row>{row}</x:Row><x:Column>{column}</x:Column></x:ClientData></v:shape>''')
    vml = '''<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout>
<v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>
{shapes}</xml>'''.format(shapes="".join(shapes))
    archive.writestr(f"xl/drawings/vmlDrawing{sheet_number}.vml", vml)


def styles_xml():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm:ss"/><numFmt numFmtId="166" formatCode="#,##0.00"/></numFmts>
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9E2F3"/></left><right style="thin"><color rgb="FFD9E2F3"/></right><top style="thin"><color rgb="FFD9E2F3"/></top><bottom style="thin"><color rgb="FFD9E2F3"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normalny" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>'''


def write_package(target):
    files = sorted(DATA_DIR.glob("publikacja-wydatkow-*.json"), reverse=True)
    years = [int(path.stem.rsplit("-", 1)[1]) for path in files]
    if years != list(range(2026, 2014, -1)):
        raise ValueError(f"Oczekiwano plików dla lat 2015–2026, otrzymano: {years}")

    first = json.loads(files[0].read_text(encoding="utf-8"))
    fields = list(first["columnNames"])
    headers = [first["columnNames"][field] for field in fields]

    sheet_results = []
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for number, (year, path) in enumerate(zip(years, files), start=1):
            source = json.loads(path.read_text(encoding="utf-8"), parse_float=str)
            if list(source["columnNames"]) != fields:
                raise ValueError(f"Niezgodny układ pól w pliku {path.name}")
            if source["count"] != len(source["results"]):
                raise ValueError(f"Niezgodna liczba wpisów w pliku {path.name}")
            sheet_results.append(write_sheet(archive, number, year, source, fields, headers))

        archive.writestr("xl/styles.xml", styles_xml())
        archive.writestr("xl/workbook.xml", workbook_xml(years))
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_relationships(len(years)))
        archive.writestr("_rels/.rels", root_relationships())
        archive.writestr("docProps/core.xml", core_properties())
        archive.writestr("docProps/app.xml", app_properties(years))
        archive.writestr("[Content_Types].xml", content_types(len(years), sheet_results))
    return years, sheet_results


def workbook_xml(years):
    sheets = "".join(
        f'<sheet name="{year}" sheetId="{index}" r:id="rId{index}"/>'
        for index, year in enumerate(years, start=1)
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="xl"/><workbookPr/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews><sheets>{sheets}</sheets><calcPr calcId="191029"/></workbook>'''


def workbook_relationships(count):
    relationships = [
        f'<Relationship Id="rId{index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{index}.xml"/>'
        for index in range(1, count + 1)
    ]
    relationships.append(f'<Relationship Id="rId{count + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>')
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + "".join(relationships) + '</Relationships>'


def root_relationships():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'''


def core_properties():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Wydatki Gdańska 2015–2026</dc:title><dc:subject>Rejestr wydatków Urzędu Miejskiego w Gdańsku</dc:subject><dc:creator>Konwersja danych</dc:creator><dc:language>pl-PL</dc:language></cp:coreProperties>'''


def app_properties(years):
    names = "".join(f'<vt:lpstr>{year}</vt:lpstr>' for year in years)
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel Compatible</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Arkusze</vt:lpstr></vt:variant><vt:variant><vt:i4>{len(years)}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="{len(years)}" baseType="lpstr">{names}</vt:vector></TitlesOfParts><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>'''


def content_types(sheet_count, sheet_results):
    overrides = [
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    ]
    for number in range(1, sheet_count + 1):
        overrides.append(f'<Override PartName="/xl/worksheets/sheet{number}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
        if sheet_results[number - 1][1]:
            overrides.append(f'<Override PartName="/xl/comments{number}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"/>')
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>' + "".join(overrides) + '</Types>'


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix="wydatki-gdanska-", suffix=".xlsx", dir=OUTPUT.parent)
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        years, sheet_results = write_package(temporary)
        os.replace(temporary, OUTPUT)
    finally:
        if temporary.exists():
            temporary.unlink()
    total = sum(rows for rows, _ in sheet_results)
    comments = sum(len(notes) for _, notes in sheet_results)
    print(f"Utworzono {OUTPUT.name}: {len(years)} arkuszy, {total} wpisów, {comments} komentarzy do korekt dat.")


if __name__ == "__main__":
    main()
