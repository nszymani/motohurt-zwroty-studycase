# MotoHurt – obsługa zwrotów (MVP)

Lokalna aplikacja WEB dla działu zwrotów sklepu z częściami samochodowymi MotoHurt.

Pracownik wpisuje numer zamówienia z paczki (od `1` do `100`) albo numer faktury od hurtowni (np. `FV00001435`) i widzi:
- **kto** zamówił (klient),
- **kiedy** (data zakupu),
- **co i ile** (część, ilość, cena),
- **dokąd** odesłać (hurtownia/dostawca),
- **ile dni zostało** na zwrot do hurtowni – liczone od daty faktury hurtowni (każda hurtownia ma inny limit),
- **fakturę od hurtowni** i cenę zakupu – a przy przeterminowanym zwrocie, ile firma traci.

Zakładka **Pilne zwroty** pokazuje faktury, którym termin kończy się w ciągu 3 dni.

Aplikacja generuje dokument **zwrotu do dostawcy** (albo **przyjęcia na magazyn własny**, gdy termin minął) z kodem QR, gotowy do wydruku lub zapisania jako PDF. Przycisk „Powiadom hurtownię” symuluje wysłanie zgłoszenia przez API hurtowni (mockup).

## Jak uruchomić
- Lokalnie: pobierz pliki i kliknij dwa razy `index.html`.
- Online: GitHub Pages (Settings → Pages → Deploy from a branch → `main`).

## Struktura
| Plik | Co zawiera |
| --- | --- |
| `index.html` | wygląd strony (układ) |
| `style.css` | kolory i style, także wygląd wydruku |
| `app.js` | logika: szukanie zamówienia, liczenie dni, dokument, QR, symulacja API |
| `dane/czesci.js` | baza części (50 produktów) |
| `dane/dostawcy.js` | baza 10 hurtowni, każda z innym limitem zwrotu |
| `dane/klienci.js` | baza 100 klientów |
| `dane/zamowienia.js` | baza 100 zamówień o numerach 1–100 (łączy klienta, część i hurtownię) |
| `dane/faktury.js` | baza faktur od hurtowni (numer FV…, data wystawienia, pozycje z ceną zakupu) |
| `biblioteki/qrcode.js` | generator kodów QR (Kazuhiko Arase, licencja MIT) |

Wszystkie dane są przykładowe (mockup), osoby i firmy są zmyślone.
