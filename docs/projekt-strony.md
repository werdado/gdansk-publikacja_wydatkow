# Projekt przeglądarki rejestru wydatków Gdańska

Status: po ocenie POC użytkownik zatwierdził łączenie słów przez AND i tolerancję jednej edycji. Przygotowano [plan implementacji strony](plans/0001-przegladarka-wydatkow.md).

## Cel i założenia użytkownika

- Strona pozwalająca przeglądać dostarczone pliki JSON z rejestrem wydatków Gdańska.
- Zbiór jest zamknięty: użytkownik nie przewiduje dodawania kolejnych danych. Nie oznacza to pełnego pokrycia roku kalendarzowego 2026; zakres kopii opisano w [analizie danych](analiza-danych.md).
- Publikacja jako statyczna strona, na przykład w GitHub Pages.
- Dopuszczalny proces budowania strony, obejmujący przygotowanie i optymalizację danych.
- Dokumentacja w języku polskim; rozmowa projektowa może odbywać się po angielsku.

## Propozycja użytkownika do doprecyzowania

- Jedna strona wczytująca cały zbiór danych do przeglądarki.
- Początkowo 100 wierszy; kolejne ujawniane podczas przewijania.
- Sortowanie kolumn i wyszukiwanie tekstowe z prostym dopasowaniem podobieństwa.

Ustawienia wyszukiwania rozstrzygnięto po POC. Plan zachowuje włączne granice dat przyjęte w POC jako proste założenie wykonawcze.

## Uzgodnione decyzje

- Pełne przeglądanie i wyszukiwanie ma być wygodne zarówno na komputerach, jak i na telefonach. Wymaganie dotyczy również wydajności, a nie wyłącznie dopasowania układu do szerokości ekranu.
- Jedna wyszukiwarka globalna obejmuje wszystkie pola tekstowe. Użytkownik może dodatkowo stosować filtry poszczególnych kolumn.
- Wyszukiwanie globalne i aktywne filtry kolumn obowiązują jednocześnie: wpis musi spełniać wszystkie warunki. Przykład: wyszukiwanie tekstu `remont` w dowolnym polu tekstowym oraz ograniczenie kontrahenta do `Budimex`.
- Wyszukiwanie tekstowe zawsze pomija wielkość liter i polskie znaki diakrytyczne, np. `gdansk` pasuje do `Gdańsk`.
- W polach objętych wyszukiwaniem przybliżonym tolerancja literówek jest stale włączona, bez przełącznika „Uwzględnij literówki”. Po ocenie POC użytkownik wybrał jedną edycję Levenshteina.
- Każde słowo zapytania musi pasować (AND), w dowolnej kolejności. Globalnie słowa mogą pasować w różnych polach tego samego wpisu; w filtrze kolumny muszą pasować w tej kolumnie.
- Wybrano profil `one` z POC: słowa krótsze niż cztery znaki i same liczby pozostają bez przybliżania; prefiksy są dopuszczone od trzech znaków, poza samymi liczbami. Priorytetem są jakość wyników i prostota implementacji, z akceptacją ograniczeń przy zamianie sąsiednich liter.
- Prostota rozwiązania jest priorytetem również przy projektowaniu interfejsu.

### Wybrany kierunek wizualny

Użytkownik wybrał **03 — Otwarty notatnik**. Wzorcem jest [makieta HTML](../designs/03-notatnik.html): kremowe tło, ceglasty akcent, szeryfowe nagłówki, cienkie linie podziału i redakcyjny układ bez panelu bocznego. Zachować ten charakter w docelowej przeglądarce oraz jej widoku mobilnym.

Makieta określa wygląd; produkcyjne wyszukiwanie, pełny zbiór danych i obsługę tabeli nadal określa plan implementacji.

### Prezentacja wpisów

- Ten sam układ tabeli na komputerach i telefonach, z przewijaniem poziomym.
- Długie opisy są początkowo skrócone; użytkownik może rozwinąć pełną treść na żądanie.

### Sortowanie i filtrowanie

- Domyślna kolejność: malejąco według daty zawarcia, od najnowszych wpisów.
- Jedna aktywna kolumna sortowania naraz; kliknięcie nagłówka zmienia kolumnę lub kierunek sortowania.
- Zmiana sortowania zachowuje wyszukiwanie globalne i wszystkie aktywne filtry.
- Wyszukiwanie i zmiana filtrów zachowują wybraną kolumnę oraz kierunek sortowania.

### Filtry kolumn

Użytkownik wskazał następujące typy filtrów:

| Pole źródłowe | Etykieta | Typ filtra |
| --- | --- | --- |
| `contractSubject` | przedmiot umowy | Wyszukiwanie przybliżone z tolerancją literówek |
| `contractProcedure` | tryb zawarcia | Wyszukiwanie przybliżone z tolerancją literówek |
| `contractType` | rodzaj umowy | Wyszukiwanie przybliżone z tolerancją literówek |
| `contractorName` | kontrahent | Wyszukiwanie przybliżone z tolerancją literówek |
| `departmentOffice` | wydział urzędu | Lista rozwijana z wyborem wielu wydziałów, liczebnościami i wyszukiwaniem fragmentu nazwy bez tolerancji literówek |
| `contractDate` | data zawarcia | Zakres dat od–do |
| `contractStartDate` | obowiązuje od dnia | Zakres dat od–do |
| `contractEndDate` | obowiązuje do dnia | Zakres dat od–do |
| `contractNumber` | numer umowy | Wyszukiwanie fragmentu tekstu, bez tolerancji literówek |
| `contractCost` | poniesione wydatki | Proste porównanie kwoty: większa niż (`>`) lub mniejsza niż (`<`) podana wartość |

Użytkownik polecił pominąć `contractDisclaimer` przy określaniu filtrów. Przypisanie obejmuje zatem 10 pól podlegających filtrowaniu. Porównania kwoty są ścisłe: kwota równa progowi nie spełnia warunku `>` ani `<`. Plan zachowuje włączne granice zakresów dat według lokalnego dnia, tak jak POC.

### Lista wydziałów

- Lista rozwijana umożliwia wybór wielu wydziałów. Wybór dwóch wydziałów obejmuje wpisy z dowolnego z nich; wyszukiwanie globalne i pozostałe filtry nadal obowiązują.
- Obok nazw widoczne są liczby pasujących wpisów. Liczebności uwzględniają wyszukiwanie globalne i wszystkie filtry poza bieżącym wyborem wydziałów.
- Pole tekstowe wewnątrz listy służy do wyszukiwania fragmentu nazwy wydziału. Pomija wielkość liter i polskie znaki diakrytyczne, bez tolerancji literówek.
- Tekst wpisany w tym polu zawęża widoczne opcje; filtrowanie wpisów według wydziału wynika z zaznaczonych opcji.

## Pomiary lokalnego zbioru

Pomiar wykonano 9 września 2026 r. na plikach znajdujących się w katalogu `data/`. Jednostki MB poniżej oznaczają milion bajtów.

| Wielkość | Wynik |
| --- | ---: |
| Pliki roczne | 12 |
| Wpisy w rejestrze | 66 343 |
| Różne niepuste wartości `departmentOffice` | 41 |
| Wpisy z `departmentOffice` równym `null` | 1 |
| Wszystkie źródłowe pliki JSON | 41 894 884 bajty (41,89 MB) |
| Same tablice `results`, po usunięciu zbędnych odstępów | 33 395 737 bajtów (33,40 MB) |
| Suma rozmiarów tych tablic po kompresji gzip | 4 640 128 bajtów (4,64 MB) |

Pomiar kompresji wykonano osobno dla każdego roku przy użyciu `node:zlib.gzipSync` z ustawieniami domyślnymi. Nie obejmuje kodu strony ani indeksu wyszukiwania. Nie potwierdza sposobu kompresji na docelowym hostingu, zużycia pamięci po odczycie danych ani szybkości działania w przeglądarce.

## Rozstrzygnięcia po POC

- AND i profil jednej edycji stanowią zatwierdzoną podstawę implementacji.
- Profile porównawcze pozostają narzędziem laboratorium; docelowa strona nie udostępnia przełączników algorytmu ani AND/OR.
- Plan wykorzystuje wyniki POC oraz istniejące testy; nie zakłada ponownego doboru algorytmu.

## Zatwierdzone podejście do implementacji

Użytkownik zatwierdził HTML/CSS/TypeScript, Vite, MiniSearch i jeden Web Worker. POC wykonano, a po ocenie jego wyników wybrano AND i jedną edycję. [Plan implementacji](plans/0001-przegladarka-wydatkow.md) opisuje realizację docelowej strony.

- Interfejs w HTML, CSS i TypeScript; Vite do pracy lokalnej i przygotowania plików statycznych. Vite dokumentuje publikację wyniku w GitHub Pages. [Dokumentacja Vite](https://vite.dev/guide/static-deploy.html).
- Przygotowanie danych podczas budowania strony, zgodnie z dopuszczonym przez użytkownika procesem optymalizacji.
- MiniSearch do wyszukiwania przybliżonego. Biblioteka obsługuje tolerancję literówek, ograniczanie wyszukiwania do wskazanych pól, konfigurowalne łączenie słów oraz zapis i odczyt indeksu. Dopasowanie możliwości biblioteki do potrzeb projektu było podstawą wyboru; wydajność i jakość wyników wymagają pomiaru. [Dokumentacja MiniSearch](https://lucaong.github.io/minisearch/classes/MiniSearch.MiniSearch.html).
- Jeden Web Worker do wczytywania i przetwarzania danych, wyszukiwania, filtrowania i sortowania. Worker wykonuje kod poza głównym wątkiem interfejsu. Proponowany podział ma ograniczyć blokowanie interfejsu przez te obliczenia; sam w sobie nie gwarantuje szybkich odpowiedzi ani małego zużycia pamięci. [Dokumentacja Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).

Wcześniejsze doświadczenie na pełnym zbiorze porównało cztery profile i dwa sposoby łączenia słów. Użytkownik zaakceptował kompromis profilu jednej edycji. Wersje przypięte w plikach pakietów: MiniSearch 7.2.0, Vite 8.2.2, TypeScript 7.0.2. Fizyczne telefony i docelowy hosting nie zostały jeszcze zmierzone.

## Powiązane dokumenty

- [Trzy propozycje wyglądu](../designs/index.html) i [zakres makiet](../designs/README.md). Wybrano wariant 03 — Otwarty notatnik; makiety nie zmieniają zatwierdzonych zasad wyszukiwania.
- [Słownik pojęć](../CONTEXT.md).
- [Analiza danych i dotychczasowe ustalenia dotyczące skoroszytu](analiza-danych.md).
