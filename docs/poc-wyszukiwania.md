# POC jakości wyszukiwania

## Zakres doświadczenia

Zatwierdzony stos: HTML/CSS/TypeScript, Vite, MiniSearch i jeden Web Worker. POC służy do oceny wyszukiwania na wszystkich 66 343 wpisach, zanim powstanie plan docelowej strony.

Prace obejmują przygotowanie niezmiennych danych, wspólny silnik dla przeglądarki i pomiarów, zestaw zapytań kontrolnych, interaktywny podgląd wyników oraz raport porównawczy. Po ocenie wyników użytkownik wybrał AND i profil jednej edycji. Pozostałe ustawienia pozostają wariantami porównawczymi laboratorium.

## Metoda

- Ta sama normalizacja wielkości liter i polskich znaków, w tym osobna zamiana `ł` na `l`, dla wszystkich wariantów.
- Porównanie wariantu bez literówek (kontrola), jednej literówki, progu zależnego od długości słowa i dwóch literówek. Kontrola bez literówek występuje wyłącznie w POC.
- Porównanie łączenia słów przez AND i OR. To eksperyment, a nie wcześniejsze rozstrzygnięcie odroczonej decyzji.
- Oddzielne sprawdzenie numerów umów i wyszukiwania nazw wydziałów: fragment tekstu bez tolerancji literówek.
- Zapytania o rzeczywistych kontrahentów, tryby i rodzaje umów, opisy, polskie znaki, literówki i kolejność słów.
- Jawne odróżnienie zgodności z referencją tekstową od trafności znaczeniowej. Sama obecność słowa „remont” nie dowodzi, że wpis dotyczy bezpośrednio robót remontowych.
- Pomiar czasu przygotowania indeksu, rozmiaru plików i odpowiedzi na zapytania. Pomiary Node.js i lokalnej przeglądarki nie są pomiarami fizycznego telefonu ani docelowego hostingu.

## Podstawa techniczna

MiniSearch umożliwia ustawienie odległości Levenshteina, progu zależnego od długości słowa oraz łączenia słów AND/OR. Levenshtein wymaga dwóch edycji przy zamianie sąsiadujących liter. [Opcje MiniSearch](https://lucaong.github.io/minisearch/types/MiniSearch.SearchOptions.html).

## Uruchomienie

Wymagane Node.js 24 lub nowsze. W katalogu repozytorium:

```sh
npm ci
npm run dev:poc
```

Vite podaje adres strony, domyślnie `http://localhost:5173`. Polecenie przygotowuje komplet danych i indeks przed uruchomieniem. W kontenerze należy otworzyć przekierowany port.

Odtworzenie doświadczenia i kontrola wyniku:

```sh
npm run prepare:poc
npm run evaluate:search
npm test
npm run build:poc
npx playwright install --with-deps chromium
npm run test:browser
```

Gotowe pliki statyczne znajdują się w `dist-poc/`. Lokalny podgląd tej wersji uruchamia `npm run preview:poc`, domyślnie na porcie 4173. Pliki wygenerowane i zależności są pomijane przez Git; wyniki oceny oraz zrzuty ekranów znajdują się w `docs/wyniki-poc/`.

## Przypięte wersje

| Narzędzie | Wersja |
| --- | --- |
| MiniSearch | 7.2.0 |
| Vite | 8.2.2 |
| TypeScript | 7.0.2 |
| Playwright | 1.63.0 |
| Typy Node.js | 24.13.3 |

Wersje są zapisane dokładnie w `package.json` i `package-lock.json`. Pomiary wykonano na Node.js 24.21.0 oraz Chromium 153.0.8010.12 w środowisku Linux ARM64.

## Obsługa laboratorium

1. Wpisz tekst albo wybierz gotowy przykład. Określ przeszukiwane pole lub wyszukiwanie globalne.
2. Porównaj profile oraz AND/OR. Domyślnie ustawiono zatwierdzony profil jednej edycji i AND. Historyczne pomiary dziewięciu zapytań w przeglądarce dotyczą jawnie profilu 25%.
3. Obejrzyj wyniki i kolumnę „Dopasowanie”, która pokazuje znalezione słowa i pola. Kolejność jest zgodna z wybraną kolumną sortowania, początkowo od najnowszych dat zawarcia.
4. W razie potrzeby zawęź dane według wydziałów, kwoty lub trzech zakresów dat. Zmiana sortowania zachowuje filtry. Wpisy pojawiają się po 100, podczas przewijania tabeli lub po kliknięciu przycisku kolejnej partii.
5. W kolumnie „Ocena wyniku” oznacz wpis jako trafny, nietrafny lub niepewny. Przycisk „Eksportuj oceny” zapisuje lokalny JSON z zapytaniem, ustawieniami i identyfikatorem wpisu. Oceny są przechowywane tylko do odświeżenia strony, dlatego należy je wcześniej wyeksportować.

Pole tekstowe w liście wydziałów zawęża wyłącznie widoczne opcje. Zaznaczenie wydziałów uruchamia właściwy filtr. Opcja „Brak danych” reprezentuje jeden wpis bez wydziału.

## Reguły badanych profili

| Profil | Maksymalna odległość Levenshteina |
| --- | --- |
| Kontrola | 0 |
| 1 edycja | 1 |
| Próg 25% | `min(2, round(0.25 × długość słowa))` |
| 2 edycje | 2 |

We wszystkich wariantach słowa krótsze niż cztery znaki i same liczby nie są przybliżane. Prefiks jest dopuszczony dla słów liczących co najmniej trzy znaki, poza samymi liczbami. Te reguły towarzyszą wybranemu profilowi `one`.

Przybliżanie dotyczy czterech uzgodnionych pól. Wyszukiwanie globalne łączy dopasowania słów z tych pól z literalnym wyszukiwaniem fragmentów w wydziale i numerze umowy. Zapytanie bez spacji, zawierające cyfrę i ukośnik, jest w POC interpretowane globalnie jako fragment numeru umowy. Plan zachowuje tę regułę jako proste założenie wykonawcze.

## Wyniki i wnioski

Pełna tabela, definicje miar i dane maszynowe: [raport automatyczny](wyniki-poc/wyszukiwanie.md) i [wyniki JSON](wyniki-poc/wyszukiwanie.json). Zbadano 32 zapytania, osiem kombinacji ustawień, po trzy wykonania: 768 pomiarów.

| Obserwacja | Znaczenie dla projektu |
| --- | --- |
| `remont szkoly`: 1 wynik przy AND, 1 130 przy OR z progiem 25% | AND pozwala rzeczywiście zawężać temat przez dopisanie kolejnego słowa. |
| `prescom`: 174 wyniki przy jednej edycji, wszystkie zgodne z referencją PRESSCOM; próg 25% daje dodatkowo 6 wyników | Jedna edycja obsługuje prostą literówkę bez tych dodatkowych trafień. |
| `radius`: 354 wyniki przy jednej edycji, 577 przy dwóch | Szerszy próg dopasowuje również m.in. „LADIES”, co miesza różne nazwy kontrahentów. |
| `presscmo`: 0 wyników przy jednej edycji, 174 przy dwóch | Zamiana sąsiednich liter wymaga dwóch edycji; bardziej rygorystyczny próg ma widoczną cenę. |
| `remnot`: szerszy próg odzyskuje 54 z 242 wpisów referencyjnych dla `remont` | Literówka połączona z odmianą, np. `remontem`, może przekroczyć limit. Prefiks i fuzzy w MiniSearch nie oznaczają pełnego przybliżania dowolnego fragmentu słowa. |
| `remnot szkoly`: 0 wyników nawet przy dwóch edycjach | Ta metoda nie rozwiązuje wszystkich kombinacji literówki i polskiej odmiany. |
| `muzeum gdanska` zwraca też inne muzea w Gdańsku | Tolerancja literówek nie rozpoznaje tożsamości instytucji; nawet jedna edycja może pomieszać nazwy. |

W zestawie kontrolnym jedna edycja z AND odzyskała średnio 85,7% referencji leksykalnej, przy zgodności wyników z tą referencją 96,6%. Próg 25% z AND podniósł odzyskanie do 93,7%, a zgodność wyniosła 92,6%. Nie są to procenty trafności znaczeniowej ocenionej przez użytkowników: referencja jest zbudowana z poprawnych słów i prefiksów, nie z oceny intencji.

Decyzja użytkownika po ocenie POC: AND oraz jedna edycja. Wybrano mniejszą liczbę dodatkowych trafień, akceptując brak części dopasowań przy zamianie liter. Szerszy profil pozostaje dostępny do porównania w POC.

### Wydajność

- Node.js: mediana odpowiedzi profili z literówkami i AND około 3 ms, p95 około 24–28 ms w tym zestawie. Pomiar obejmuje również fasety i sortowanie.
- Przygotowanie indeksu: około 1,5 s. Odtworzenie zapisanego indeksu w Node.js: około 0,34 s.
- Lokalny Chromium: wczytanie danych i przygotowanie silnika około 0,83 s. W ostatnim uruchomieniu dziewięciu zapytań porównawczych z profilem `adaptive` i AND worker potrzebował 0,5–18,6 ms, a czas od wysłania zapytania do zmian DOM wyniósł 3,5–87,6 ms. To pojedyncze lokalne pomiary, bez ograniczenia CPU i sieci; nie obejmują gwarancji zakończenia rysowania. Domyślny profil interfejsu to obecnie `one`, natomiast pomiar zachowuje jawnie wybrany profil porównawczy. [Pomiary przeglądarki](wyniki-poc/przegladarka-zapytania.json).
- Rekordy i indeks: łącznie 51,78 MB JSON, lokalnie około 9,15 MB po gzip. POC wysyła zwykłe JSON; o kompresji HTTP decyduje hosting. Wysyłanie gotowego indeksu oszczędza pracę przeglądarki, ale zwiększa transfer o około 3,94 MB po gzip.
- Sterta Node.js po utworzeniu silnika i GC: około 178 MB, w tym około 119 MB przyrostu ponad wczytane dane. Nie jest to szczyt zużycia pamięci ani wynik na fizycznym telefonie.

Wyniki wspierają dalszą pracę nad wybranym podejściem. Komfort pracy na fizycznych telefonach, koszt rzeczywistego pobrania oraz przewijanie dziesiątek tysięcy już wyświetlonych wierszy wymagają osobnej oceny przed uznaniem strony za gotową.

### Znaczenie opisów i jakość źródeł

Wpis `2026:183` zawiera słowo „Remont” w nazwie zespołu „Remont Pomp”. Wpis `2026:164` opisuje wydruk ulotek o remoncie torowisk. Oba są poprawnymi dopasowaniami tekstowymi, ale nie powinny być automatycznie interpretowane jako bezpośredni koszt wykonania remontu.

W 14 opisach znaleziono wzorzec nowego wiersza, litery `T` lub `N` i daty rozdzielanych tyldą. Wyglądają one na fragmenty innych wpisów wklejone do pola opisu; jest to wniosek z treści źródeł, a nie potwierdzona historia ich powstania. Przykład `2015:2614` zaczyna się od naprawy drukarki, zawiera 22 wystąpienia `RWB-W/`, a kończy nazwą restauracji. Wyszukiwanie może więc znaleźć fragment niezwiązany z początkiem opisu.

Wykryte identyfikatory: `2015:816`, `2015:1250`, `2015:2614`, `2015:4407`, `2015:4992`, `2015:6123`, `2016:2823`, `2018:1161`, `2018:5461`, `2018:6507`, `2019:1423`, `2020:1238`, `2023:4734`, `2024:2595`. Reguła wykrywania nie gwarantuje znalezienia wszystkich problemów źródłowych. POC zachowuje pełne opisy i odrębność każdego wpisu źródłowego.

## Sprawdzenie i granice POC

- 12 testów obejmuje normalizację, literówki, zakres pól, porównania kwot, daty, fasety, sortowanie, serializację indeksu i zachowanie wszystkich wpisów.
- Pięć testów Chromium obejmuje pełne uruchomienie, zmianę profili, sortowanie z zachowaniem filtrów, eksport ocen, dokładny numer umowy, kolejne wiersze, wąski ekran oraz błąd pobrania danych.
- Zapisane widoki: [komputer](wyniki-poc/poc-desktop.png) i [wąski ekran](wyniki-poc/poc-telefon.png). Wąski ekran emuluje rozmiar, nie sprzęt telefonu.
- POC ma jedno zapytanie tekstowe z wyborem pola oraz dodatkowe filtry strukturalne. Równoczesne, niezależne zapytania tekstowe w wielu kolumnach pozostają elementem docelowej strony.
- Daty mają na potrzeby POC granice włączne, według lokalnego dnia. To założenie doświadczenia do uwzględnienia w późniejszym planie.
- Nie dodano analizy semantycznej, automatycznego rozpoznawania tożsamości kontrahentów ani polskiego lematyzatora. Wynik jest oceną prostego wyszukiwania tekstowego.

## Podstawa planu docelowego

Użytkownik zatwierdził kompromis AND i jednej edycji. [Gotowy plan implementacji](plans/0001-przegladarka-wydatkow.md) wykorzystuje ten profil, zatwierdzony stos technologiczny i pomiary POC. Obejmuje wspólne działanie wszystkich filtrów kolumn oraz sprawdzenie kosztów długiego przewijania i pracy na telefonach.
