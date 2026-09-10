# Wstępna analiza rocznych danych o wydatkach

Sprawdzono 12 lokalnych plików `data/publikacja-wydatkow-YYYY.json`. Ustalenia dotyczą dostarczonych kopii danych; nie weryfikowano ani nie aktualizowano publikacji zdalnych.

## Struktura i zakres

Każdy plik zawiera metadane oraz tablicę `results` z wpisami w rejestrze. Pole `sampleValues` zawiera wartości przykładowe w metadanych, a nie dodatkowe wpisy.

| Rok źródłowy | Liczba wpisów |
| --- | ---: |
| 2015 | 6 418 |
| 2016 | 6 278 |
| 2017 | 6 377 |
| 2018 | 6 687 |
| 2019 | 6 994 |
| 2020 | 4 849 |
| 2021 | 4 493 |
| 2022 | 4 929 |
| 2023 | 5 515 |
| 2024 | 5 607 |
| 2025 | 5 494 |
| 2026 | 2 702 |
| **Łącznie** | **66 343** |

Wszystkie wartości `count` odpowiadają liczbie elementów w tablicach `results`. Kopia danych za 2026 rok zawiera daty zawarcia od 1 stycznia do 29 lipca, więc nie obejmuje pełnego roku kalendarzowego.

## Pola

Każdy wpis zawiera te same 11 pól. Polskie etykiety kolumn w źródle są identyczne we wszystkich plikach.

| Klucz źródłowy | Opublikowana etykieta | Zaobserwowany typ wartości |
| --- | --- | --- |
| `departmentOffice` | wydział urzędu | Tekst lub `null` |
| `contractDate` | data zawarcia | Tekst daty z przesunięciem względem UTC |
| `contractorName` | kontrahent | Tekst |
| `contractStartDate` | obowiązuje od dnia | Tekst daty z przesunięciem względem UTC |
| `contractEndDate` | obowiązuje do dnia | Tekst daty z przesunięciem względem UTC |
| `contractCost` | poniesione wydatki | Liczba |
| `contractNumber` | numer umowy | Tekst |
| `contractProcedure` | tryb zawarcia | Tekst |
| `contractType` | rodzaj umowy | Tekst |
| `contractDisclaimer` | zastrzeżenia | Wartość logiczna |
| `contractSubject` | przedmiot umowy | Tekst lub `null` |

## Ustalenia istotne dla konwersji

- Data zawarcia każdego wpisu przypada na rok wskazany w nazwie pliku źródłowego. Daty obowiązywania i lata występujące w numerach umów mogą być inne.
- Opublikowana etykieta kwoty to „poniesione wydatki”. Dostarczone dane nie określają przypisania płatności do lat ani nie wskazują wprost waluty w metadanych pola. Konwersja powinna zachować znaczenie źródłowe.
- Nie ma identycznych wpisów ani w obrębie plików, ani między plikami. Numery umów nie są unikalne: 9 numerów powtarza się w 19 wpisach (10 wystąpień ponad pierwsze; 2015: 1; 2016: 1; 2017: 2; 2018: 2; 2019: 1; 2026: 3). Usunięcie powtórzeń według numeru umowy oznaczałoby utratę odrębnych wpisów. Stałe odnośniki strony używają dlatego jednoznacznego identyfikatora `rok:pozycja`, na przykład `#wpis=2026%3A302`.
- Jeden wydział urzędu i jeden przedmiot umowy mają wartość `null`. Nie ma brakujących kluczy ani pustych ciągów tekstowych.
- Wszystkie kwoty wydatków są liczbami dodatnimi.
- 17 413 kwot ma w zapisie źródłowym więcej niż dwa miejsca po przecinku, np. `1266.9000000000001` i `3934857.6899999999`. Największa różnica względem zaokrąglenia do dwóch miejsc wynosi `0,00000005` (wartość źródłowa: `870494833.67999995`). Zapis jest zgodny z efektem reprezentacji zmiennoprzecinkowej. Użytkownik zatwierdził zapis kwot w skoroszycie jako liczb zaokrąglonych do dwóch miejsc po przecinku.
- Najdłuższy tekst to przedmiot umowy liczący 4 375 znaków. Skoroszyt powinien zachować pełną treść, nawet jeśli wysokość wyświetlanego wiersza będzie ograniczona.
- Metadane wskazują strefę czasową `Europe/Warsaw`. Konwersja na daty arkusza musi zachować lokalną datę kalendarzową.
- Wszystkie 199 029 wartości w trzech polach dat można odczytać jako znaczniki czasu. Wśród nich 174 zawierają czas inny niż północ; konwersja wyłącznie do daty usunęłaby tę informację.
- Sześć wartości dat wskazuje rok wcześniejszy niż 1900 lub późniejszy niż 2100. Użytkownik polecił traktować te wartości jako literówki i skorygować lata według reguł zapisanych poniżej. Cztery oryginalne daty sprzed 1900 roku nie mieszczą się w standardowym zakresie domyślnego systemu dat Excela.
- Metadane `fieldTypes` zawierają literówkę `boolen` zamiast `boolean`; rzeczywiste wartości `contractDisclaimer` są wartościami logicznymi JSON.

### Uzgodnione korekty dat

Numer wpisu oznacza pozycję w tablicy `results`, liczoną od 1. Kolumna „Data po korekcie” wskazuje docelową lokalną datę kalendarzową w skoroszycie.

| Rok źródłowy | Numer wpisu | Pole | Wartość źródłowa | Data po korekcie |
| --- | ---: | --- | --- | --- |
| 2015 | 2028 | `contractEndDate` | `2915-09-20T00:00:00+0100` | `2015-09-20` |
| 2016 | 2322 | `contractStartDate` | `0216-08-26T00:00:00+0124` | `2016-08-26` |
| 2019 | 49 | `contractStartDate` | `0201-12-23T00:00:00+0124` | `2019-12-23` |
| 2019 | 5855 | `contractStartDate` | `0201-02-22T00:00:00+0124` | `2019-02-22` |
| 2020 | 4659 | `contractStartDate` | `0202-01-15T00:00:00+0124` | `2020-01-15` |
| 2024 | 183 | `contractEndDate` | `2924-12-12T00:00:00+0100` | `2024-12-12` |

Reguły wskazane przez użytkownika:

- Lata `29**` należy zmienić na `20**`, zachowując dwie ostatnie cyfry roku, miesiąc i dzień.
- Rok `0201` należy zmienić na `2019`.
- Rok `0202` należy zmienić na `2020`.
- W razie wątpliwości należy użyć roku pliku jako wskazówki. Przyjęto rok z nazwy pliku źródłowego: w ten sposób `0216` w publikacji za 2016 rok zostanie zmieniony na `2016`. Pozostałe daty tego wpisu potwierdzają taki wybór.

Korekty dotyczą wartości w skoroszycie. Powyższa tabela zachowuje oryginalne znaczniki czasu; nie należy przeliczać ich na UTC w sposób zmieniający lokalny dzień.

## Uzgodniony zakres

Dodatkowa analiza podczas POC strony wykryła 14 opisów zawierających fragmenty przypominające inne wpisy rozdzielane tyldami. Ich identyfikatory, metodę wykrycia i konsekwencje dla wyszukiwania opisano w [raporcie POC](poc-wyszukiwania.md#znaczenie-opisów-i-jakość-źródeł). Nie rozdzielano tych opisów na dodatkowe rekordy.

- Jeden skoroszyt Excel w formacie `.xlsx`.
- Osobna zakładka dla każdego roku źródłowego: od 2026 do 2015, w kolejności malejącej.
- Skoroszyt i dokumentacja w języku polskim. Rozmowa projektowa może pozostać w języku angielskim.
- Każdy wpis źródłowy pozostaje osobnym wierszem w zakładce swojego roku. Zachowane zostają wszystkie 11 pól, również dla wpisów o powtarzających się numerach umów.
- Sześć błędnych lat w datach zostanie skorygowanych zgodnie z powyższą tabelą i regułami użytkownika.
- Kwoty będą zapisywane jako liczby zaokrąglone do dwóch miejsc po przecinku, z wyświetlaniem dwóch cyfr części ułamkowej. Przykład: źródłowe `1266.9000000000001` zostanie zapisane jako `1266.90` i będzie wyświetlane w polskich ustawieniach Excela jako `1 266,90`.

## Postać skoroszytu

- Plik wynikowy: `wydatki-gdanska_2015-2026.xlsx`, zawierający 12 zakładek nazwanych latami od `2026` do `2015`, w kolejności malejącej.
- Łącznie 66 343 wiersze danych; każdy wpis zajmuje jeden wiersz w zakładce roku źródłowego. Kolejność wpisów i 11 kolumn odpowiada kolejności w źródle.
- Nagłówki zgodne z polskimi etykietami `columnNames`.
- Numery umów i pozostałe pola tekstowe jako tekst, z zachowaniem pełnej treści. Wartości `null` jako puste komórki.
- Kwoty jako liczby zaokrąglone do dwóch miejsc po przecinku.
- Daty jako wartości daty lub daty i czasu Excela, z zachowaniem lokalnego dnia oraz czasu, jeśli występuje. Format: `rrrr-mm-dd`, a przy czasie innym niż północ: `rrrr-mm-dd gg:mm:ss`.
- Sześć korekt roku zgodnie z zatwierdzoną tabelą. Przy poprawionych komórkach polskie komentarze zawierające oryginalny znacznik czasu oraz podstawę korekty.
- Pole „zastrzeżenia” jako polskie wartości tekstowe `Tak` lub `Nie`, odpowiadające źródłowym `true` i `false`.
- Filtry kolumn, zablokowany wiersz nagłówków, dopasowane szerokości kolumn i zawijanie dłuższych tekstów.
- Dokumentacja wskazuje niepełny zakres roku 2026 i opisuje zastosowane przekształcenia.

Skoroszyt został zapisany jako `wydatki-gdanska_2015-2026.xlsx`. Skrypt `scripts/generuj_skoroszyt.py` pozwala odtworzyć go z lokalnych plików JSON, a `scripts/sprawdz_skoroszyt.py` służy do niezależnego porównania wyniku ze źródłami.

## Kontrola wyniku

Po wygenerowaniu ponownie odczytano elementy skoroszytu i porównano nagłówki oraz wszystkie komórki z danymi źródłowymi po uzgodnionych przekształceniach. Kontrola potwierdziła:

- 12 zakładek nazwanych latami od 2026 do 2015, w kolejności malejącej;
- 66 343 wiersze danych i 11 kolumn w każdym wpisie;
- zgodność wszystkich wartości tekstowych, dat, wartości pola „zastrzeżenia” i kwot po zaokrągleniu;
- sześć uzgodnionych korekt dat i sześć polskich komentarzy z wartościami źródłowymi;
- filtry i zablokowany wiersz nagłówków w każdej zakładce;
- poprawność archiwum składającego się na plik `.xlsx`.
