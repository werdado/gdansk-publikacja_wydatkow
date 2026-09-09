# Wyniki automatycznej oceny wyszukiwania

Pomiar: 2026-09-09T16:35:25.604Z. Node v24.21.0, linux/arm64, unknown.

66 343 wpisy; 32 zapytania; 4 profile × 2 sposoby łączenia słów; po 3 wykonania każdego zapytania.

## Znaczenie miar

Referencja powstaje przez niezależny przegląd wszystkich wpisów dla poprawnie zapisanych słów zapytania, z uwzględnieniem prefiksów i warunku AND. Nie jest oceną znaczenia przez człowieka. Odzyskanie oznacza odsetek wpisów referencyjnych znalezionych przez badane zapytanie. Zgodność oznacza udział wpisów referencyjnych w wynikach. Dodatkowy wynik może być trafnym wariantem słowa albo szumem; wymaga obejrzenia.

Podane procenty są średnimi po zapytaniach. Odzyskanie pomija przypadki z pustą referencją, zgodność pomija zapytania bez wyników. Osobno pokazano poprawne puste wyniki. Czasy obejmują wyszukiwanie, filtry, fasety i sortowanie; nie obejmują sieci, przesyłania do interfejsu ani renderowania. Są to pomiary lokalne, bez izolowania obciążenia systemu.

| Profil | Łączenie | Odzyskanie referencji | Zgodność z referencją | Poprawne puste | Mediana ms | p95 ms | Maks. ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Kontrola: bez literówek | AND | 64.3% | 94.7% | 4/4 | 0.9 | 24.9 | 31.4 |
| Kontrola: bez literówek | OR | 78.6% | 54.5% | 3/4 | 2.4 | 55.9 | 65.2 |
| Maks. 1 edycja | AND | 85.7% | 96.6% | 4/4 | 3.0 | 23.6 | 32.1 |
| Maks. 1 edycja | OR | 92.8% | 61.7% | 3/4 | 3.2 | 55.9 | 64.3 |
| Próg 25%, maks. 2 edycje | AND | 93.7% | 92.6% | 4/4 | 3.4 | 26.7 | 29.9 |
| Próg 25%, maks. 2 edycje | OR | 97.2% | 61.2% | 3/4 | 3.5 | 61.0 | 66.5 |
| Maks. 2 edycje | AND | 93.7% | 92.6% | 4/4 | 3.3 | 28.4 | 34.8 |
| Maks. 2 edycje | OR | 97.2% | 61.1% | 3/4 | 3.4 | 63.5 | 70.6 |

## Rozmiar i przygotowanie

- Utworzenie indeksu w pamięci: 1466 ms; odtworzenie z JSON: 344 ms.
- Sterta po utworzeniu silnika i GC: 177.9 MB; przyrost względem samych wczytanych danych: 119.3 MB. To nie jest szczyt pamięci ani pomiar telefonu.
- Rekordy: 37.15 MB; gzip 5.21 MB.
- Indeks: 14.63 MB; gzip 3.94 MB.
- Gzip opisuje wynik lokalnej kompresji. POC udostępnia zwykłe JSON; kompresja HTTP zależy od hostingu.
- Sprawdzono zgodność wyników 32 zapytań po serializacji indeksu oraz sumy kontrolne wszystkich źródeł.

## Wyniki poszczególnych zapytań — AND

| Zapytanie | Pole | Referencja | Kontrola | 1 edycja | Próg 25% | 2 edycje |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| pReSsCoM | contractorName | 174 | 174 (0 dodatk.) | 174 (0 dodatk.) | 174 (0 dodatk.) | 174 (0 dodatk.) |
| prescom | contractorName | 174 | 0 (0 dodatk.) | 174 (0 dodatk.) | 180 (6 dodatk.) | 180 (6 dodatk.) |
| presscmo | contractorName | 174 | 0 (0 dodatk.) | 0 (0 dodatk.) | 174 (0 dodatk.) | 174 (0 dodatk.) |
| pressscom | contractorName | 174 | 0 (0 dodatk.) | 174 (0 dodatk.) | 174 (0 dodatk.) | 174 (0 dodatk.) |
| pressxom | contractorName | 174 | 0 (0 dodatk.) | 174 (0 dodatk.) | 174 (0 dodatk.) | 174 (0 dodatk.) |
| MUZEUM GDANSKA | contractorName | 196 | 196 (0 dodatk.) | 230 (34 dodatk.) | 231 (35 dodatk.) | 231 (35 dodatk.) |
| gdanska muzeum | contractorName | 196 | 196 (0 dodatk.) | 230 (34 dodatk.) | 231 (35 dodatk.) | 231 (35 dodatk.) |
| muzeun gdanska | contractorName | 196 | 0 (0 dodatk.) | 230 (34 dodatk.) | 231 (35 dodatk.) | 231 (35 dodatk.) |
| radius | contractorName | 354 | 354 (0 dodatk.) | 354 (0 dodatk.) | 577 (223 dodatk.) | 577 (223 dodatk.) |
| konkurs ofert | contractProcedure | 5152 | 5152 (0 dodatk.) | 5152 (0 dodatk.) | 5152 (0 dodatk.) | 5152 (0 dodatk.) |
| konkrs ofert | contractProcedure | 5152 | 0 (0 dodatk.) | 5152 (0 dodatk.) | 5152 (0 dodatk.) | 5152 (0 dodatk.) |
| zwykly | contractProcedure | 20631 | 20631 (0 dodatk.) | 20631 (0 dodatk.) | 20631 (0 dodatk.) | 20631 (0 dodatk.) |
| umowa dotacja | contractType | 11842 | 11842 (0 dodatk.) | 11842 (0 dodatk.) | 11842 (0 dodatk.) | 11842 (0 dodatk.) |
| umowa dotacaj | contractType | 11842 | 0 (0 dodatk.) | 0 (0 dodatk.) | 11842 (0 dodatk.) | 11842 (0 dodatk.) |
| remont | contractSubject | 242 | 242 (0 dodatk.) | 242 (0 dodatk.) | 287 (45 dodatk.) | 287 (45 dodatk.) |
| remnot | contractSubject | 242 | 0 (0 dodatk.) | 0 (0 dodatk.) | 56 (2 dodatk.) | 56 (2 dodatk.) |
| remont szkoly | contractSubject | 1 | 1 (0 dodatk.) | 1 (0 dodatk.) | 1 (0 dodatk.) | 1 (0 dodatk.) |
| remnot szkoly | contractSubject | 1 | 0 (0 dodatk.) | 0 (0 dodatk.) | 0 (0 dodatk.) | 0 (0 dodatk.) |
| szkolenie | contractSubject | 2715 | 2715 (0 dodatk.) | 3317 (602 dodatk.) | 3425 (710 dodatk.) | 3425 (710 dodatk.) |
| szkolnie | contractSubject | 2715 | 1 (1 dodatk.) | 2709 (7 dodatk.) | 3503 (789 dodatk.) | 3503 (789 dodatk.) |
| wywoz odpadow | contractSubject | 62 | 62 (0 dodatk.) | 62 (0 dodatk.) | 62 (0 dodatk.) | 62 (0 dodatk.) |
| robaKOWSKI | contractSubject | 1 | 1 (0 dodatk.) | 1 (0 dodatk.) | 1 (0 dodatk.) | 1 (0 dodatk.) |
| presscom szkolenie | global | 132 | 132 (0 dodatk.) | 132 (0 dodatk.) | 133 (1 dodatk.) | 133 (1 dodatk.) |
| sportu koszykowki | global | 41 | 41 (0 dodatk.) | 51 (10 dodatk.) | 82 (41 dodatk.) | 82 (41 dodatk.) |
| kadr i organ | departmentOffice | 7288 | 7288 (0 dodatk.) | 7288 (0 dodatk.) | 7288 (0 dodatk.) | 7288 (0 dodatk.) |
| kadr i oragn | departmentOffice | 0 | 0 (0 dodatk.) | 0 (0 dodatk.) | 0 (0 dodatk.) | 0 (0 dodatk.) |
| /2766/WKIO/215/ | contractNumber | 1 | 1 (0 dodatk.) | 1 (0 dodatk.) | 1 (0 dodatk.) | 1 (0 dodatk.) |
| /2766/WKIO/215/ | global | 1 | 1 (0 dodatk.) | 1 (0 dodatk.) | 1 (0 dodatk.) | 1 (0 dodatk.) |
| /2766/WKIO/999/ | contractNumber | 0 | 0 (0 dodatk.) | 0 (0 dodatk.) | 0 (0 dodatk.) | 0 (0 dodatk.) |
| UM | contractorName | 2098 | 2098 (0 dodatk.) | 2098 (0 dodatk.) | 2098 (0 dodatk.) | 2098 (0 dodatk.) |
| qzxvjkqzxv | contractSubject | 0 | 0 (0 dodatk.) | 0 (0 dodatk.) | 0 (0 dodatk.) | 0 (0 dodatk.) |
| remont qzxvjkqzxv | contractSubject | 0 | 0 (0 dodatk.) | 0 (0 dodatk.) | 0 (0 dodatk.) | 0 (0 dodatk.) |

Pełne wyniki, dopasowane słowa, przykłady dodatkowych trafień i identyfikatory źródeł: [wyszukiwanie.json](wyszukiwanie.json).
