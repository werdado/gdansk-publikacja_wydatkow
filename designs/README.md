# Propozycje wyglądu przeglądarki

**Wybrany kierunek: 03 — Otwarty notatnik.** Użytkownik zaakceptował ten wariant jako podstawę wyglądu docelowej strony. Pozostałe propozycje zachowano do porównania; wcześniejsza rekomendacja wariantu 01 została zastąpiona wyborem użytkownika.

Otwórz [porównanie](index.html) bezpośrednio w przeglądarce. Pliki działają lokalnie, bez budowania i połączenia z siecią; należy zachować cały katalog `designs/`.

| Wariant | Charakter | Przeznaczenie |
| --- | --- | --- |
| [01 — Rejestr obywatelski](01-rejestr.html) | Biel, morska zieleń, przestrzeń, łagodne obramowania | Uniwersalna publiczna przeglądarka; rekomendowany punkt wyjścia |
| [02 — Pracownia danych](02-pracownia.html) | Granatowa nawigacja boczna, niebieski akcent, zwarta tabela | Częsta praca z wieloma warunkami i porównywanie wpisów |
| [03 — Otwarty notatnik](03-notatnik.html) | Kremowy papier, ceglasty akcent, szeryfowe nagłówki | Bardziej redakcyjny, wyrazisty charakter strony |

W każdym wariancie działa wyszukiwarka, dziesięć filtrów kolumn, sortowanie, usuwanie filtrów, podgląd pełnej treści oraz doładowanie kolejnych 100 wierszy przez przewijanie lub przycisk. Sortowanie zachowuje filtry, a filtrowanie zachowuje sortowanie. Na telefonie tabela przewija się poziomo. Przełączników tolerancji literówek ani AND/OR nie ma.

Makiety korzystają z tej samej próbki 300 rzeczywistych rekordów: pierwszych 25 pozycji z każdego pliku rocznego, po korektach loadera danych. Nie jest to próbka reprezentatywna. Liczba 66 343 opisuje pełny zbiór, natomiast tabela, liczniki wyników i facety opisują wyłącznie próbkę. Lista wydziałów zawiera nazwy obecne w próbce, nie wszystkie 41 nazw pełnego zbioru.

Wspólny skrypt makiet używa prostego dopasowania słów AND z tolerancją jednej edycji, prefiksami od trzech znaków i normalizacją polskich znaków. To demonstracja zachowania kontrolek; implementacja docelowa korzysta z silnika MiniSearch. Makiety nie mierzą wydajności pełnego zbioru i nie używają Workera ani wirtualizacji tabeli.

Nie dodano wykresów, sum wydatków ani nowych podstron. Znak „G.” jest roboczym znakiem typograficznym projektu, nie oficjalnym herbem lub identyfikacją urzędu. Nie użyto zewnętrznych fontów ani zasobów.

Przy wyborze warto ocenić przede wszystkim charakter (neutralny, roboczy, redakcyjny), gęstość tabeli i proporcje nagłówka do danych. Elementy można łączyć, np. kolorystykę 01 z gęstością 02.

## Weryfikacja

9 września 2026 r. sprawdzono wszystkie trzy warianty w Chromium: 100 wierszy na starcie, pusty wynik, filtr kontrahenta zachowany przy sortowaniu, szczegóły zamykane Escape, wybór wydziału i przycisk kolejnych 100 pozycji. Nie wystąpiły błędy JavaScript. Przy szerokości 390 px dokument nie wychodził poza ekran; tabela zachowuje własne przewijanie. To sprawdzenie widoku mobilnego, nie test na fizycznym telefonie.

Zrzuty początkowego widoku:

| Wariant | Komputer, 1440 px | Telefon, 390 px |
| --- | --- | --- |
| 01 | [Podgląd](previews/01-rejestr-desktop.png) | [Podgląd](previews/01-rejestr-mobile.png) |
| 02 | [Podgląd](previews/02-pracownia-desktop.png) | [Podgląd](previews/02-pracownia-mobile.png) |
| 03 | [Podgląd](previews/03-notatnik-desktop.png) | [Podgląd](previews/03-notatnik-mobile.png) |
