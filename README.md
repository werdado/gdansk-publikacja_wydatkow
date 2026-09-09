# Rejestr wydatków Gdańska

Repozytorium zawiera 12 rocznych publikacji JSON z lat 2015–2026, skoroszyt Excel oraz POC przeglądarki danych. Każdy z 66 343 wpisów źródłowych pozostaje osobną pozycją. Publikacja za 2026 rok obejmuje dane do 29 lipca.

## Dokumenty i wyniki

- [Trzy propozycje wyglądu — interaktywne HTML](designs/index.html) · [opis i zakres makiet](designs/README.md).
- [Projekt strony i zatwierdzone decyzje](docs/projekt-strony.md).
- [Plan implementacji publicznej przeglądarki](docs/plans/0001-przegladarka-wydatkow.md).
- [POC: uruchomienie, metoda, wnioski i ograniczenia](docs/poc-wyszukiwania.md).
- [Automatyczna ocena 32 zapytań](docs/wyniki-poc/wyszukiwanie.md).
- [Analiza danych i korekty dat](docs/analiza-danych.md).
- [Słownik pojęć](CONTEXT.md).
- [Skoroszyt 2015–2026](wydatki-gdanska_2015-2026.xlsx).

## Uruchomienie POC

Wymagane Node.js 24 lub nowsze:

```sh
npm ci
npm run dev:poc
```

Otwórz adres podany przez Vite, zwykle `http://localhost:5173`. W kontenerze skorzystaj z przekierowania portu.

Strona i dokumentacja są po polsku. POC umożliwia porównanie ustawień MiniSearch, przeglądanie dopasowanych wpisów i eksport własnych ocen jakości. Domyślnie stosuje zatwierdzone AND i tolerancję jednej edycji. Plan docelowej strony jest gotowy; jego zadania pozostają do wykonania.
