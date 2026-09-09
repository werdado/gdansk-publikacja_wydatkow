# Rejestr wydatków Gdańska

Repozytorium zawiera 12 rocznych publikacji JSON z lat 2015–2026, skoroszyt Excel oraz publiczną przeglądarkę danych i POC wyszukiwania. Każdy z 66 343 wpisów źródłowych pozostaje osobną pozycją. Publikacja za 2026 rok obejmuje dane do 29 lipca.

## Dokumenty i wyniki

- [Trzy propozycje wyglądu — interaktywne HTML](designs/index.html) · [opis i zakres makiet](designs/README.md).
- [Weryfikacja strony: testy, pomiary i zrzuty](docs/weryfikacja-strony.md).
- [Projekt strony i zatwierdzone decyzje](docs/projekt-strony.md).
- [Plan implementacji publicznej przeglądarki](docs/plans/0001-przegladarka-wydatkow.md).
- [POC: uruchomienie, metoda, wnioski i ograniczenia](docs/poc-wyszukiwania.md).
- [Automatyczna ocena 32 zapytań](docs/wyniki-poc/wyszukiwanie.md).
- [Analiza danych i korekty dat](docs/analiza-danych.md).
- [Słownik pojęć](CONTEXT.md).
- [Skoroszyt 2015–2026](wydatki-gdanska_2015-2026.xlsx).

## Uruchomienie strony

Wymagane Node.js 24 lub nowsze:

```sh
npm ci
npm run dev
```

Otwórz adres podany przez Vite, zwykle `http://localhost:5173`. W kontenerze skorzystaj z przekierowania portu. Strona przygotowuje pełne 66 343 wpisy i indeks do wyszukiwania w osobnym workerze.

Wersja statyczna i jej lokalny podgląd:

```sh
npm run build
npm run preview
```

Gotowe pliki są w `dist/`; publikuj cały ten katalog, łącznie z `generated/`. Podgląd zwykle działa pod `http://localhost:4173`. Wyszukiwarka wymaga HTTP lub HTTPS; nie otwieraj pliku HTML bezpośrednio z dysku.

## GitHub Pages

Workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) uruchamia się wyłącznie ręcznie (`workflow_dispatch`). Po podłączeniu repozytorium do GitHub ustaw w Pages źródło publikacji na „GitHub Actions”, a następnie uruchom workflow z karty Actions. Najpierw wykonuje on `npm ci`, testy jednostkowe, build i testy Chromium, a dopiero potem przekazuje `dist/` do Pages.

Wejściem CI są śledzone pliki `data/`, współdzielony loader `scripts/dane-poc.ts`, źródła `src/` i `site/`, konfiguracja oraz `package-lock.json`. Artefaktem jest wyłącznie `dist/`; nie zawiera on `node_modules`, laboratorium POC ani skryptów narzędziowych. W repozytorium nie ma jeszcze zdalnego adresu, dlatego workflow nie określa ani nie zakłada adresu przyszłej publikacji.

`base: './'` pozwala umieścić gotowy katalog również pod zagnieżdżoną ścieżką. Lokalna kontrola opisana w [weryfikacji strony](docs/weryfikacja-strony.md#pakiet-statyczny-w-podkatalogu) umieszcza `dist/` pod `/rejestr/` i sprawdza wejście oraz odświeżenie, wraz z workerem, manifestem i danymi gzip.

Wpisane słowa i aktywne filtry łączą się przez **AND**: wpis musi spełniać każde kryterium. Można jednocześnie szukać globalnie i w kilku kolumnach. Pomijamy wielkość liter i polskie znaki. W przedmiocie, trybie, rodzaju i nazwie kontrahenta działa tolerancja **jednej edycji od czterech znaków** (profil `one`); zamiana kolejności dwóch liter może wymagać dwóch edycji. Numery umów i nazwy wydziałów są sprawdzane jako fragmenty bez tolerancji literówek. Kilka zaznaczonych wydziałów oznacza dowolny z wybranych wydziałów. Filtry dat obejmują granice zakresu, kwota jest porównywana ściśle (`>` albo `<`). Sortowanie zachowuje filtry, a „Rozwiń wpis” pokazuje wszystkie dziesięć pól i pełny opis.

Weryfikacja lokalna (testy przeglądarkowe wymagają wcześniejszego `npm run build`):

```sh
npx playwright install chromium
npm test
npm run test:site:unit
npm run build
npm run test:site:browser
npm run measure:site
```

Testy strony i skrypt pomiarowy uruchamiają własny podgląd na porcie 4174; port musi być wolny. Pomiary i zrzuty zapisują się w `docs/wyniki-strony/`. Szczegóły metody i ograniczenia są w [dokumencie weryfikacji](docs/weryfikacja-strony.md).

## Uruchomienie POC

Wymagane Node.js 24 lub nowsze:

```sh
npm ci
npm run dev:poc
```

Otwórz adres podany przez Vite, zwykle `http://localhost:5173`. W kontenerze skorzystaj z przekierowania portu.

Strona i dokumentacja są po polsku. POC umożliwia porównanie ustawień MiniSearch, przeglądanie dopasowanych wpisów i eksport własnych ocen jakości. Domyślnie stosuje zatwierdzone AND i tolerancję jednej edycji. Publiczna strona korzysta ze stałych ustawień; POC zachowuje kontrolki porównawcze.
