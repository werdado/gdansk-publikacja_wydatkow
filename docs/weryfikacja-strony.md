# Weryfikacja publicznej przeglądarki wydatków

Pomiar: 2026-09-09T18:41:21.829Z. Pełny zbiór: **66 343 wpisy**. Profil **`one`**, łączenie **AND**. Surowe wyniki: [pomiary.json](wyniki-strony/pomiary.json).

## Środowisko i odtworzenie

Chromium 153.0.8010.12 headless, Playwright 1.63.0, Node.js v24.21.0, Linux 7.0.12-linuxkit, ARM64. Kontener widzi 12 CPU i 7.75 GiB RAM; `lscpu` wskazuje producenta Apple, dokładny model procesora nie jest udostępniony. Lokalny HTTP na 127.0.0.1:4174, produkcyjny build Vite, pliki danych i indeksu gzip. Bez ograniczania CPU i sieci.

```sh
npm ci
npx playwright install chromium
npm test
npm run test:site:unit
npm run build
npm run test:site:browser
npm run build:poc
npm run measure:site
```

Port 4174 musi być wolny. Konfiguracja testów nie przejmuje istniejącego serwera; POC ma odrębną konfigurację. Skrypt `scripts/zmierz-strone.mjs` uruchamia i zamyka własny podgląd. Pomiary nadpisują plik JSON i pięć zrzutów w `docs/wyniki-strony/`.

## Zimne uruchomienie

Trzy próby w nowych kontekstach przeglądarki z pustym cache HTTP i nowymi workerami. Cache systemu plików serwera i JIT wspólnego procesu przeglądarki nie były resetowane. To zimny start danych aplikacji w lokalnym środowisku, nie symulacja pobierania przez internet.

| Próba | Inicjalizacja workera (ms) | Transfer ready (ms) | Pierwsze wyszukiwanie w workerze (ms) | Transfer wyników (ms) | DOM wyników (ms) | Nawigacja → gotowy DOM (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 513.70 | 0.30 | 65.90 | 0.20 | 3.30 | 644.70 |
| 2 | 523.70 | 0.30 | 64.90 | 0.20 | 3.90 | 646.30 |
| 3 | 544.80 | 0.40 | 72.20 | 0.20 | 3.40 | 671.00 |

Inicjalizacja workera obejmuje pobranie manifestu, danych i indeksu, dekompresję, parsowanie i odtworzenie silnika. Pierwsze wyszukiwanie oblicza pełny wynik, kolejność i liczebności wydziałów. Czasy przesłania nie obejmują pobierania plików HTTP — to przesłanie odpowiedzi workera do głównego wątku.

## Dziewięć zapytań POC na stronie z profilem one

| ID | Zapytanie | Pole | Wyniki | Worker (ms) | Transfer odpowiedzi (ms) | DOM (ms) | Wysłanie → DOM (ms) | Odbiór → dwie klatki (ms) |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| case | `pReSsCoM` | `contractorName` | 174 | 12.20 | 42.50 | 5.60 | 60.30 | 24.30 |
| delete | `prescom` | `contractorName` | 174 | 8.50 | 38.00 | 6.40 | 53.10 | 29.50 |
| topic | `remont` | `contractSubject` | 242 | 7.80 | 35.50 | 7.60 | 50.90 | 25.10 |
| topic-swap | `remnot` | `contractSubject` | 0 | 6.00 | 36.60 | 1.70 | 44.40 | 20.60 |
| school | `remont szkoly` | `contractSubject` | 1 | 6.90 | 7.80 | 0.50 | 15.30 | 35.20 |
| training | `szkolenie` | `contractSubject` | 3317 | 13.70 | 0.20 | 3.50 | 17.50 | 30.60 |
| global | `presscom szkolenie` | `global` | 132 | 16.30 | 31.20 | 5.80 | 53.30 | 32.00 |
| global-cross | `sportu koszykowki` | `global` | 51 | 16.40 | 25.70 | 4.30 | 46.40 | 19.70 |
| none | `qzxvjkqzxv` | `contractSubject` | 0 | 7.30 | 14.50 | 1.00 | 22.90 | 26.80 |

Każde zapytanie wykonano raz przez publiczne pola i przycisk „Szukaj”, po usunięciu poprzedniego zapytania. Profile i pola pochodzą z `poc/search/cases.ts`; parametrów `one` i AND nie można zmienić w produkcyjnej stronie. Liczba 131 dla jednoczesnych filtrów `prescom` (kontrahent) i `szkolenie` (przedmiot) jest osobnym oczekiwaniem regresji z POC, sprawdzanym w teście przeglądarkowym. Nie jest niezależną oceną trafności znaczeniowej.

Pomiar zewnętrzny zastępuje konstruktor Worker wyłącznie w kontrolowanej sesji przeglądarki. Uruchamia ten sam produkcyjny moduł i dodaje znaczniki do odpowiedzi. `workerMs` obejmuje obsługę zapytania do wywołania `postMessage`, w tym przygotowanie strony wyników. `responseTransferMs` obejmuje klonowanie danych, przesłanie i oczekiwanie głównego wątku. `domMs` to synchroniczne wykonanie handlera strony (wiersze, licznik, lista wydziałów). Suma od wysłania obejmuje też kolejkę wejściową workera. Znaczniki obu wątków używają `performance.timeOrigin + performance.now()`; wartości bliskie zeru podlegają zaokrągleniu zegara.

Dwie klatki `requestAnimationFrame` mierzą czas do kolejnej okazji rysowania po zmianie DOM; nie dowodzą czasu zakończenia kompozycji ani wyświetlenia obrazu na fizycznym ekranie. Instrumentacja i sterowanie przeglądarką dokładają narzut. Są to pojedyncze obserwacje, bez percentyli i bez deklaracji limitu wydajności.

Poprzedni plik [przegladarka-zapytania.json](wyniki-poc/przegladarka-zapytania.json) był mierzony z profilem **adaptive**. Nowe wyniki dotyczą **one**: np. `remnot` daje 0 zamiast dawnych 56, a `szkolenie` 3317 zamiast 3425. Różne profile oraz zakres mierzonej obsługi workera wykluczają bezpośredni wniosek o przyspieszeniu lub spowolnieniu. Profil one nie toleruje dwóch edycji w zamianie sąsiednich liter.

## Długie przewijanie i pamięć

| Etap | JS strony (MiB) | JS workera (MiB) | Pamięć obiektów przeglądarki dla strony (MiB) |
| --- | ---: | ---: | ---: |
| Przed przewijaniem, 100 wierszy, przed GC | 8.66 | 130.13 | 15.56 |
| Przed przewijaniem, 100 wierszy, po wymuszonym GC | 2.25 | 97.13 | 6.85 |
| Po 35 przewinięciach, 300 wierszy, przed GC | 3.08 | 97.24 | 19.74 |
| Po 35 przewinięciach, 300 wierszy, po wymuszonym GC | 3.00 | 97.13 | 18.76 |

Źródło: CDP `Runtime.getHeapUsage` dla strony i osobno dla workera; `HeapProfiler.collectGarbage` wymusza GC obu kontekstów. Kolumna JS to `usedSize`, obiekty przeglądarki to `embedderHeapUsedSize` (m.in. DOM). Nie jest to całkowita pamięć procesu, RSS, GPU ani koszt systemu. Pierwsze wymuszenie GC następuje przed przewijaniem, co wpływa na późniejszy pomiar bez dodatkowego GC.

35 przewinięć zwiększyło zakres do pozycji **3600**. Ostatnie okno zawierało pozycje **3301–3600**, wysokość przewijanej zawartości **460980 px**. Maksimum wyniosło **300 wierszy `tr.entry-row`**; w każdym kroku sprawdzano wzrost wysokości oraz limit DOM. Po powrocie na początek odtworzono wpis **2026:5**, a licznik nadal wskazywał 66 343. Test jednostkowy `windowFor()` osobno obejmuje granicę ostatniego wpisu 66 343.

Stały koszt utrzymywanego zbioru i indeksu pozostaje w workerze; po GC jego użyta pamięć JS nie zmieniła się w tym przebiegu. Wzrost kosztu strony odpowiada przejściu ze 100 do maksymalnie 300 wierszy. To potwierdzenie badanego zakresu, nie dowód braku każdego możliwego wycieku przy dowolnej długości sesji.

| Szerokość viewportu | Szerokość dokumentu | Widoczna szerokość tabeli | Pełna szerokość tabeli | Rzeczywista wysokość wiersza |
| ---: | ---: | ---: | ---: | ---: |
| 1440 px | 1440 px | 1344 px | 2200 px | 128 px |
| 390 px | 390 px | 354 px | 2200 px | 128 px |

Wysokości wszystkich aktualnych wierszy są zgodne z `ROW_HEIGHT = 128`, także po zmianie szerokości. Dokument nie przewija się poziomo; poziome przewijanie występuje wewnątrz tabeli.

## Kontrole interfejsu i porównanie projektu

Kontrole wykonywał agent przez zdarzenia klawiatury Playwright i ocenę zrzutów. Nie przeprowadzono badania z użytkownikiem ani fizyczną klawiaturą podłączoną do urządzenia.

- Dropdown wydziałów: Enter otwiera i zamyka, Tab przechodzi do wyszukiwania i checkboxu, Spacja zaznacza. Wybrano „WYDZIAŁ KADR I ORGANIZACJI”: 7288 wpisów. Wpisanie niepasującej nazwy ukrywa opcję, ale zachowuje licznik zaznaczeń `(1)`; powrót do `kadr` przywraca zaznaczony checkbox.
- Kwota `> 1000`: liczebność wybranego wydziału i główny licznik wskazują **3479**. Test sprawdza też, że widoczne kwoty spełniają warunek. [Zrzut wydziałów](wyniki-strony/wydzialy-klawiatura.png).
- Kolejne naciśnięcia Tab osiągają wszystkie dziesięć nagłówków; przeglądarka automatycznie przesuwa tabelę do aktywnego nagłówka. Ostatnia kolumna „Obowiązuje do dnia” jest widoczna i ma obrys fokusu. [Zrzut ostatnich kolumn](wyniki-strony/ostatnie-kolumny.png).
- Wpis `2015:2614`: pełny długi opis zawiera „MIECZYSŁAW ROBAKOWSKI”, dialog ma dziesięć pól i przewijaną treść (715 px obszaru, 3741 px zawartości). Test zamyka go Escape, skrypt pomiarowy przyciskiem „Zamknij”. [Dialog przy 390 px](wyniki-strony/dialog-mobile-viewport.png).
- Symulowane HTTP 503 manifestu: komunikat „Nie udało się wczytać danych.”, wyłączone wyszukiwanie, pusta tabela i przycisk ponowienia. Usunięcie błędu i ponowienie przywracają 66 343 wpisy. Brak błędów `pageerror` w przebiegu pomiarowym.

Porównano [produkcyjny desktop](wyniki-strony/strona-desktop.png) z [makietą desktop](../designs/previews/03-notatnik-desktop.png) oraz [viewport 390 px](wyniki-strony/strona-mobile-viewport.png) z [makietą mobile](../designs/previews/03-notatnik-mobile.png). Zachowano kremowe tło, ciemne szeryfowe nagłówki, ceglasty akcent, znak „G.”, cienkie linie, układ hero i licznika oraz wskazówkę przewijania tabeli. Na wąskim ekranie licznik i lata przechodzą pod opis, a tekst i przyciski mieszczą się w dokumencie.

Różnice: produkcja nie ma paska wyboru makiet ani przykładów szybkiego wyszukiwania, ma przycisk „Szukaj” i pełny licznik 66 343. Kolejność jest zgodna z publiczną tabelą (kontrahent przed przedmiotem); kolumny mają po 220 px, wiersze stałe 128 px. Dlatego pierwszy widok mobilny pokazuje datę i fragment kontrahenta, a przedmiot wymaga przewinięcia w prawo. Nagłówek filtrów i wyższe wiersze pozostawiają mniej wpisów jednocześnie niż makieta. To zauważalny kompromis gęstości tabeli; dostęp do wszystkich kolumn został sprawdzony. Natywne pola dat w tym Chromium pokazują format placeholdera przeglądarki `mm/dd/yyyy`, mimo polskich etykiet strony.

## Telefon fizyczny — niewykonane

**Kontrola na fizycznym telefonie nie została wykonana: w środowisku nie ma dostępnego urządzenia.** Model, przeglądarka telefonu i warunki sieci: nie dotyczy / brak pomiaru. Viewport 390 × 844 px pochodzi z desktopowego Chromium headless i nie stanowi pomiaru telefonu. Pozostaje kontrola odbioru wersji mobilnej na urządzeniu; brak telefonu nie blokuje ukończenia kodu i plików statycznych.

## Testy i czułość regresji

Osiem testów przeglądarkowych obejmuje wymagane pięć scenariuszy oraz wysokość wierszy, klawiaturę i liczebności wydziałów, a także skuteczne ponowienie pobrania. Testy korzystają z publicznych kontrolek, `tr.entry-row`, `data-id`, `#count[data-total]`, natywnego dialogu i istniejących atrybutów gotowości. Nie dodano kontrolek debugowania ani zmian w kodzie produkcyjnym.

Wymagane pięć testów było zielonych od pierwszego uruchomienia na istniejącym buildzie (8,1 s); po rozszerzeniu osiem testów także przeszło (11,4 s). Nie wykryto rzeczywistej rozbieżności wymagającej poprawki. Dodatkowo kontrolowana, tymczasowa mutacja CSS wysokości wiersza z 128 na 129 px dała RED: test zgłosił oczekiwane `[128]`, otrzymane `[129]`. Przywrócono plik i ponownie zbudowano stronę przed końcową weryfikacją GREEN. To dowód czułości testu, nie opis naprawy istniejącego błędu.

Końcowa weryfikacja po przywróceniu CSS:

| Polecenie | Wynik |
| --- | --- |
| `npm test` | 13 testów, 13 zaliczonych, 0 błędów; 338,73 ms |
| `npm run test:site:unit` | 2 testy, 2 zaliczone, 0 błędów; 75,81 ms |
| `npm run build` | przygotowano 66 343 wpisy; TypeScript i build poprawne; Vite 105 ms |
| `npm run test:site:browser` | 8 testów zaliczonych; 11,2 s |
| `npm run build:poc` | TypeScript i build POC poprawne; Vite 85 ms |
| `npm run measure:site` | zapisano trzy zimne starty, dziewięć zapytań, 35 kroków przewijania, pamięć obu wątków i pięć zrzutów |

Czasy Vite oznaczają tylko etap bundlowania, nie całe przygotowanie danych i kontrolę typów. Ostrzeżenie środowiska o jednoczesnych `NO_COLOR` i `FORCE_COLOR` nie wpływało na wynik testów.
