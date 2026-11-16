// =====================================================================
//  MotoHurt – obsługa zwrotów
//  Cała logika aplikacji. Dane biorą się z plików w folderze "dane":
//  CZESCI, DOSTAWCY, KLIENCI, ZAMOWIENIA, FAKTURY.
// =====================================================================

// Dane naszej firmy (nadawca na dokumencie)
const FIRMA = {
  nazwa: "MotoHurt Sp. z o.o.",
  adres: "ul. Przykładowa 1, 00-950 Warszawa",
  magazyn: "Magazyn zwrotów"
};

// Ile dni przed końcem terminu faktura trafia na listę "Pilne zwroty"
const DNI_PILNE = 3;

// ---------- 1. Pomocnicze funkcje ----------

// Zamienia "2026-11-16" na liczbę dni (żeby łatwo odejmować daty)
function naDni(tekstDaty) {
  const [r, m, d] = tekstDaty.split("-").map(Number);
  return Date.UTC(r, m - 1, d) / 86400000;
}

// Zamienia liczbę dni z powrotem na "2026-11-16"
function zDni(dni) {
  return new Date(dni * 86400000).toISOString().slice(0, 10);
}

// "2026-11-16" -> "16.11.2026"
function ladnaData(tekstDaty) {
  const [r, m, d] = tekstDaty.split("-");
  return `${d}.${m}.${r}`;
}

// 1234.5 -> "1 234,50 zł"
function zl(kwota) {
  return kwota.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł";
}

// Dzisiejsza data jako "RRRR-MM-DD" (czas lokalny)
function dzisiaj() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

// Zabezpieczenie tekstu przed wstawieniem do HTML
function bezpieczny(tekst) {
  return String(tekst).replace(/[&<>"']/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[z]));
}

// Usuwa polskie znaki (do treści kodu QR – czytniki lepiej je obsługują)
function bezOgonkow(tekst) {
  return tekst.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L");
}

// Odmiana słowa "dzień"
function dni(n) {
  return Math.abs(n) === 1 ? "dzień" : "dni";
}

// Rozpoznaje, co wpisał pracownik:
//  "5", "nr 5", "005"        -> zamówienie nr 5
//  "FV00001435", "fv 1435"   -> faktura FV00001435
function rozpoznajWpis(tekst) {
  const t = tekst.trim().toUpperCase().replace(/\s+/g, "");
  const cyfry = t.replace(/\D/g, "");
  if (t.startsWith("FV")) {
    return { typ: "faktura", numer: cyfry ? "FV" + cyfry.padStart(8, "0") : null };
  }
  return { typ: "zamowienie", numer: cyfry ? Number(cyfry) : null };
}

// ---------- 2. Szukanie w bazach ----------

// Faktura od hurtowni, na której jest dane zamówienie (i pozycja z tej faktury)
function fakturaDlaZamowienia(numerZamowienia) {
  for (const f of FAKTURY) {
    const pozycja = f.pozycje.find(p => p.zamowienie === numerZamowienia);
    if (pozycja) return { faktura: f, pozycja };
  }
  return { faktura: null, pozycja: null };
}

function znajdzZamowienie(numer) {
  const z = ZAMOWIENIA.find(x => x.numer === numer);
  if (!z) return null;
  const { faktura, pozycja } = fakturaDlaZamowienia(z.numer);
  return {
    zamowienie: z,
    klient: KLIENCI.find(k => k.id === z.klientId),
    czesc: CZESCI.find(c => c.sku === z.sku),
    dostawca: DOSTAWCY.find(d => d.id === z.dostawcaId),
    faktura,
    pozycja
  };
}

function znajdzFakture(numer) {
  return FAKTURY.find(f => f.numer === numer) || null;
}

// ---------- 3. Liczenie terminu zwrotu ----------
// Termin liczymy od daty wystawienia faktury przez hurtownię.

function policzTermin(dataStartu, limitDni, dataZwrotu) {
  const minelo = naDni(dataZwrotu) - naDni(dataStartu);   // ile dni minęło od faktury
  const zostalo = limitDni - minelo;                       // ile dni jeszcze zostało
  return {
    minelo,
    zostalo,
    ostatniDzien: zDni(naDni(dataStartu) + limitDni),      // do kiedy można odesłać
    mozna: zostalo >= 0                                    // czy jeszcze można zwrócić
  };
}

// Tekst paska statusu (zielony / czerwony) – wspólny dla zamówienia i faktury
function tekstStatusu(t, nazwaHurtowni, wartosc) {
  if (t.mozna) {
    const odzysk = ` Do odzyskania od hurtowni: <b>${zl(wartosc)}</b> netto.`;
    return t.zostalo === 0
      ? `<b>Dziś ostatni dzień na zwrot!</b> Odeślij do hurtowni ${bezpieczny(nazwaHurtowni)} jeszcze dzisiaj.${odzysk}`
      : `<b>Można zwrócić do hurtowni.</b> Zostało <b>${t.zostalo} ${dni(t.zostalo)}</b> (do ${ladnaData(t.ostatniDzien)}).${odzysk}`;
  }
  return `<b>Termin zwrotu minął ${-t.zostalo} ${dni(t.zostalo)} temu</b> (był do ${ladnaData(t.ostatniDzien)}). ` +
         `Część trafia na magazyn własny. <b>Strata: ${zl(wartosc)}</b> netto (cena zakupu).`;
}

// ---------- 4. Wynik dla zamówienia ----------

let aktualne = null; // tu trzymamy ostatnio znalezione zamówienie

function pokazWynik(dane, dataZwrotu) {
  const { zamowienie: z, klient: k, czesc: c, dostawca: d, faktura: f, pozycja: p } = dane;
  const t = policzTermin(f.dataWystawienia, d.limitZwrotuDni, dataZwrotu);
  const wartoscZakupu = p.ilosc * p.cenaNetto;
  aktualne = { ...dane, termin: t, dataZwrotu, wartoscZakupu };

  // Pasek statusu (zielony / czerwony)
  const status = document.getElementById("status");
  status.className = t.mozna ? "status ok" : "status zle";
  status.innerHTML = tekstStatusu(t, d.nazwa, wartoscZakupu);

  // Karty z informacjami
  document.getElementById("info-kto").innerHTML = `
    <p class="duze">${bezpieczny(k.imie)} ${bezpieczny(k.nazwisko)}</p>
    <p>${bezpieczny(k.adres)}</p>
    <p>${bezpieczny(k.telefon)} · ${bezpieczny(k.email)}</p>`;

  document.getElementById("info-kiedy").innerHTML = `
    <p class="duze">${ladnaData(z.dataZakupu)}</p>
    <p>Data zakupu przez klienta</p>
    <p>Faktura hurtowni: ${ladnaData(f.dataWystawienia)} · minęło ${t.minelo} ${dni(t.minelo)}</p>`;

  document.getElementById("info-co").innerHTML = `
    <p class="duze">${bezpieczny(c.nazwa)}</p>
    <p>SKU: ${bezpieczny(c.sku)} · ${bezpieczny(c.producent)} · nr kat. ${bezpieczny(c.numerKatalogowy)}</p>
    <p>Ilość: <b>${z.ilosc} szt.</b> × ${zl(z.cenaBrutto)} = <b>${zl(z.ilosc * z.cenaBrutto)}</b> (cena dla klienta)</p>`;

  document.getElementById("info-dokad").innerHTML = `
    <p class="duze">${bezpieczny(d.nazwa)}</p>
    <p>${bezpieczny(d.adres)}</p>
    <p>${bezpieczny(d.email)} · tel. ${bezpieczny(d.telefon)}</p>`;

  document.getElementById("info-faktura").innerHTML = `
    <p class="duze"><a href="#" class="link-faktura" data-faktura="${f.numer}">${f.numer}</a> z ${ladnaData(f.dataWystawienia)}</p>
    <p>Cena zakupu: ${p.ilosc} szt. × ${zl(p.cenaNetto)} = <b>${zl(wartoscZakupu)}</b> netto</p>
    <p>Limit hurtowni: ${d.limitZwrotuDni} dni od daty faktury (do ${ladnaData(t.ostatniDzien)}) · pozycji na fakturze: ${f.pozycje.length}</p>`;

  // Napis na przycisku zależy od tego, czy termin minął
  document.getElementById("przycisk-dokument").textContent =
    t.mozna ? "Generuj dokument zwrotu" : "Generuj dokument przyjęcia na magazyn";
  document.getElementById("przycisk-api").hidden = !t.mozna;

  document.getElementById("wynik-faktura").hidden = true;
  document.getElementById("wynik").hidden = false;
  document.getElementById("obszar-dokumentu").hidden = true;
  document.getElementById("odpowiedz-api").hidden = true;
}

// ---------- 5. Wynik dla faktury ----------

function pokazFakture(f, dataZwrotu) {
  const d = DOSTAWCY.find(x => x.id === f.dostawcaId);
  const t = policzTermin(f.dataWystawienia, d.limitZwrotuDni, dataZwrotu);
  const wartosc = f.pozycje.reduce((suma, p) => suma + p.ilosc * p.cenaNetto, 0);

  const status = document.getElementById("status-faktura");
  status.className = t.mozna ? "status ok" : "status zle";
  status.innerHTML = t.mozna
    ? tekstStatusu(t, d.nazwa, wartosc).replace("Do odzyskania od hurtowni", "Wartość całej faktury")
    : `<b>Termin zwrotu minął ${-t.zostalo} ${dni(t.zostalo)} temu</b> (był do ${ladnaData(t.ostatniDzien)}). ` +
      `Części z tej faktury nie odeślemy już do hurtowni. Wartość faktury: <b>${zl(wartosc)}</b> netto.`;

  document.getElementById("faktura-naglowek").innerHTML = `
    <p class="duze">${f.numer}</p>
    <p>Data wystawienia: <b>${ladnaData(f.dataWystawienia)}</b></p>
    <p>Pozycji: ${f.pozycje.length} · wartość: <b>${zl(wartosc)}</b> netto</p>`;

  document.getElementById("faktura-hurtownia").innerHTML = `
    <p class="duze">${bezpieczny(d.nazwa)}</p>
    <p>Limit zwrotu: ${d.limitZwrotuDni} dni od daty faktury</p>
    <p>Termin zwrotu: do <b>${ladnaData(t.ostatniDzien)}</b></p>`;

  const wiersze = f.pozycje.map(p => {
    const z = ZAMOWIENIA.find(x => x.numer === p.zamowienie);
    const k = z && KLIENCI.find(x => x.id === z.klientId);
    const c = CZESCI.find(x => x.sku === p.sku);
    return `<tr>
      <td>${p.zamowienie}</td>
      <td>${k ? bezpieczny(k.imie + " " + k.nazwisko) : "–"}</td>
      <td>${c ? bezpieczny(c.nazwa) : bezpieczny(p.sku)}</td>
      <td>${p.ilosc} szt.</td>
      <td>${zl(p.cenaNetto)}</td>
      <td>${zl(p.ilosc * p.cenaNetto)}</td>
      <td><button class="przycisk maly" data-zamowienie="${p.zamowienie}">Szczegóły</button></td>
    </tr>`;
  }).join("");

  document.getElementById("faktura-pozycje").innerHTML = `
    <table class="tabela">
      <thead><tr><th>Zamówienie</th><th>Klient</th><th>Część</th><th>Ilość</th><th>Cena netto</th><th>Wartość netto</th><th></th></tr></thead>
      <tbody>${wiersze}</tbody>
      <tfoot><tr><td colspan="5"><b>Razem</b></td><td><b>${zl(wartosc)}</b></td><td></td></tr></tfoot>
    </table>`;

  document.getElementById("wynik").hidden = true;
  document.getElementById("wynik-faktura").hidden = false;
}

// ---------- 6. Dokument (wg wzoru) z kodem QR ----------

function generujDokument() {
  const { zamowienie: z, klient: k, czesc: c, dostawca: d, faktura: f, pozycja: p, termin: t, dataZwrotu, wartoscZakupu } = aktualne;
  const powod = document.getElementById("pole-powod").value;
  const zwrot = t.mozna;

  const typ = zwrot ? "ZW" : "PM";
  const numerDok = `${typ}/${dataZwrotu.replace(/-/g, "")}/${String(z.numer).padStart(3, "0")}`;
  const tytul = zwrot ? "Dokument zwrotu do dostawcy" : "Przyjęcie na magazyn własny";

  // Co zapisujemy w kodzie QR (pracownik / hurtownia skanuje telefonem)
  const trescQR = bezOgonkow([
    `MOTOHURT ${zwrot ? "ZWROT" : "MAGAZYN"}`,
    `DOK:${numerDok}`,
    `FAKTURA:${f.numer}`,
    `ZAM:${z.numer}`,
    `SKU:${c.sku}`,
    `ILOSC:${p.ilosc}`,
    `DOSTAWCA:${d.id} ${d.nazwa}`,
    `TERMIN:${t.ostatniDzien}`
  ].join("\n"));

  const odbiorca = zwrot
    ? `<b>${bezpieczny(d.nazwa)}</b><br>${bezpieczny(d.adres)}<br>${bezpieczny(d.email)}`
    : `<b>${FIRMA.nazwa}</b><br>${FIRMA.magazyn} – stan własny<br>${FIRMA.adres}`;

  document.getElementById("dokument").innerHTML = `
    <div class="dok-naglowek">
      <div>
        <div class="dok-firma">Moto<span>Hurt</span></div>
        <h3>${tytul}</h3>
        <p>Nr dokumentu: <b>${numerDok}</b></p>
        <p>Data wystawienia: ${ladnaData(dataZwrotu)}</p>
        <p>Dotyczy faktury: <b>${f.numer}</b> z ${ladnaData(f.dataWystawienia)}</p>
      </div>
      <div class="dok-qr">${zrobKodQR(trescQR, 140)}<small>Zeskanuj, aby odczytać dane zwrotu</small></div>
    </div>

    <div class="dok-strony">
      <div><h4>Nadawca</h4><b>${FIRMA.nazwa}</b><br>${FIRMA.magazyn}<br>${FIRMA.adres}</div>
      <div><h4>${zwrot ? "Odbiorca (hurtownia)" : "Miejsce przyjęcia"}</h4>${odbiorca}</div>
    </div>

    <table class="dok-tabela">
      <thead><tr><th>Lp.</th><th>SKU</th><th>Nazwa części</th><th>Producent / nr kat.</th><th>Ilość</th><th>Cena zakupu netto</th><th>Wartość netto</th></tr></thead>
      <tbody><tr>
        <td>1</td><td>${bezpieczny(c.sku)}</td><td>${bezpieczny(c.nazwa)}</td>
        <td>${bezpieczny(c.producent)}<br>${bezpieczny(c.numerKatalogowy)}</td>
        <td>${p.ilosc} szt.</td><td>${zl(p.cenaNetto)}</td><td>${zl(wartoscZakupu)}</td>
      </tr></tbody>
    </table>

    <div class="dok-dane">
      <p><span>Faktura dostawcy:</span> ${f.numer} z dnia ${ladnaData(f.dataWystawienia)}</p>
      <p><span>Numer zamówienia klienta:</span> ${z.numer} (zakup ${ladnaData(z.dataZakupu)})</p>
      <p><span>Klient zwracający:</span> ${bezpieczny(k.imie)} ${bezpieczny(k.nazwisko)}, ${bezpieczny(k.adres)}</p>
      <p><span>Powód zwrotu:</span> ${bezpieczny(powod)}</p>
      <p><span>Limit zwrotu u dostawcy:</span> ${d.limitZwrotuDni} dni od daty faktury (do ${ladnaData(t.ostatniDzien)})</p>
      <p><span>Status:</span> ${zwrot
        ? `w terminie – zostało ${t.zostalo} ${dni(t.zostalo)}`
        : `po terminie o ${-t.zostalo} ${dni(t.zostalo)} – zwrot do dostawcy niemożliwy`}</p>
      ${zwrot ? "" : `<p><span>Strata (wartość zakupu netto):</span> <b>${zl(wartoscZakupu)}</b></p>`}
    </div>

    <div class="dok-podpisy">
      <div>Wystawił (pracownik MotoHurt)</div>
      <div>${zwrot ? "Przyjął (hurtownia)" : "Przyjął na magazyn"}</div>
    </div>`;

  document.getElementById("obszar-dokumentu").hidden = false;
  document.getElementById("obszar-dokumentu").scrollIntoView({ behavior: "smooth" });
}

// ---------- 7. Mockup API hurtowni (symulacja wysłania powiadomienia) ----------

function powiadomHurtownie() {
  const { zamowienie: z, czesc: c, dostawca: d, faktura: f, pozycja: p, termin: t, dataZwrotu } = aktualne;
  const zapytanie = {
    metoda: "POST",
    adres: `https://api.${d.email.split("@")[1]}/zwroty`,
    dane: {
      numerFaktury: f.numer,
      numerZamowienia: z.numer,
      sku: c.sku,
      ilosc: p.ilosc,
      powod: document.getElementById("pole-powod").value,
      dataNadania: dataZwrotu
    }
  };
  // Udajemy odpowiedź serwera hurtowni
  const odpowiedz = {
    status: "200 OK",
    numerRMA: `RMA-${d.id}-${String(z.numer).padStart(3, "0")}-${dataZwrotu.replace(/-/g, "").slice(4)}`,
    komunikat: `Zgłoszenie do faktury ${f.numer} przyjęte. Prosimy o nadanie paczki do ${ladnaData(t.ostatniDzien)}.`
  };
  const pole = document.getElementById("odpowiedz-api");
  pole.textContent =
    "→ WYSŁANO (symulacja):\n" + JSON.stringify(zapytanie, null, 2) +
    "\n\n← ODPOWIEDŹ HURTOWNI (symulacja):\n" + JSON.stringify(odpowiedz, null, 2);
  pole.hidden = false;
}

// ---------- 8. Zakładka "Pilne zwroty" ----------

function pokazPilne() {
  const dzien = document.getElementById("pole-data-pilne").value || dzisiaj();
  const lista = FAKTURY.map(f => {
    const d = DOSTAWCY.find(x => x.id === f.dostawcaId);
    const t = policzTermin(f.dataWystawienia, d.limitZwrotuDni, dzien);
    const wartosc = f.pozycje.reduce((s, p) => s + p.ilosc * p.cenaNetto, 0);
    return { f, d, t, wartosc };
  })
    .filter(x => naDni(dzien) >= naDni(x.f.dataWystawienia) && x.t.zostalo >= 0 && x.t.zostalo <= DNI_PILNE)
    .sort((a, b) => a.t.zostalo - b.t.zostalo);

  const miejsce = document.getElementById("tabela-pilne");
  if (lista.length === 0) {
    miejsce.innerHTML = `<p class="pomoc">Brak faktur, którym termin kończy się w ciągu ${DNI_PILNE} dni (stan na ${ladnaData(dzien)}).</p>`;
    return;
  }
  miejsce.innerHTML = `
    <table class="tabela">
      <thead><tr><th>Zostało</th><th>Termin do</th><th>Faktura</th><th>Hurtownia</th><th>Zamówienia</th><th>Wartość netto</th></tr></thead>
      <tbody>${lista.map(x => `<tr>
        <td><span class="znacznik ${x.t.zostalo === 0 ? "dzis" : "wkrotce"}">${x.t.zostalo === 0 ? "dziś ostatni dzień" : x.t.zostalo + " " + dni(x.t.zostalo)}</span></td>
        <td>${ladnaData(x.t.ostatniDzien)}</td>
        <td><a href="#" class="link-faktura" data-faktura="${x.f.numer}">${x.f.numer}</a></td>
        <td>${bezpieczny(x.d.nazwa)}</td>
        <td>${x.f.pozycje.map(p => p.zamowienie).join(", ")}</td>
        <td>${zl(x.wartosc)}</td>
      </tr>`).join("")}</tbody>
    </table>
    <p class="pomoc maly">Faktur na liście: ${lista.length}. Kliknij numer faktury, żeby zobaczyć szczegóły.</p>`;
}

// ---------- 9. Zakładka "Bazy danych" ----------

function tabela(idElementu, naglowki, wiersze) {
  const html = `<table class="tabela">
    <thead><tr>${naglowki.map(n => `<th>${n}</th>`).join("")}</tr></thead>
    <tbody>${wiersze.map(w => `<tr>${w.map(p => `<td>${bezpieczny(p)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
  document.getElementById(idElementu).innerHTML = html;
}

function pokazBazy() {
  tabela("tabela-dostawcy", ["ID", "Nazwa", "Limit zwrotu", "Adres", "E-mail", "Telefon"],
    DOSTAWCY.map(d => [d.id, d.nazwa, d.limitZwrotuDni + " dni", d.adres, d.email, d.telefon]));
  tabela("tabela-faktury", ["Numer faktury", "Hurtownia", "Data wystawienia", "Pozycji", "Zamówienia", "Wartość netto"],
    FAKTURY.map(f => {
      const d = DOSTAWCY.find(x => x.id === f.dostawcaId);
      return [f.numer, d ? d.nazwa : f.dostawcaId, f.dataWystawienia, f.pozycje.length,
        f.pozycje.map(p => p.zamowienie).join(", "), zl(f.pozycje.reduce((s, p) => s + p.ilosc * p.cenaNetto, 0))];
    }));
  tabela("tabela-zamowienia", ["Numer", "Klient", "SKU", "Ilość", "Cena", "Data zakupu", "Dostawca", "Faktura"],
    ZAMOWIENIA.map(z => {
      const k = KLIENCI.find(x => x.id === z.klientId);
      const d = DOSTAWCY.find(x => x.id === z.dostawcaId);
      const { faktura } = fakturaDlaZamowienia(z.numer);
      return [z.numer, k ? `${k.imie} ${k.nazwisko}` : z.klientId, z.sku, z.ilosc, zl(z.cenaBrutto), z.dataZakupu,
        d ? d.nazwa : z.dostawcaId, faktura ? faktura.numer : "–"];
    }));
  tabela("tabela-klienci", ["ID", "Imię", "Nazwisko", "Adres", "E-mail", "Telefon"],
    KLIENCI.map(k => [k.id, k.imie, k.nazwisko, k.adres, k.email, k.telefon]));
  tabela("tabela-czesci", ["SKU", "Nazwa", "Producent", "Nr katalogowy"],
    CZESCI.map(c => [c.sku, c.nazwa, c.producent, c.numerKatalogowy]));
}

// ---------- 10. Wyszukiwanie ----------

function pokazBlad(tekst) {
  const blad = document.getElementById("blad");
  blad.textContent = tekst;
  blad.hidden = false;
  document.getElementById("wynik").hidden = true;
  document.getElementById("wynik-faktura").hidden = true;
}

function szukaj() {
  const wpis = rozpoznajWpis(document.getElementById("pole-numer").value);
  const dataZwrotu = document.getElementById("pole-data").value || dzisiaj();
  document.getElementById("blad").hidden = true;

  // --- numer faktury ---
  if (wpis.typ === "faktura") {
    if (!wpis.numer) return pokazBlad("Wpisz pełny numer faktury, np. FV00001435.");
    const f = znajdzFakture(wpis.numer);
    if (!f) return pokazBlad(`Nie znaleziono faktury ${wpis.numer}. Sprawdź numer na fakturze od hurtowni.`);
    if (naDni(dataZwrotu) < naDni(f.dataWystawienia))
      return pokazBlad("Data przyjęcia zwrotu nie może być wcześniejsza niż data wystawienia faktury.");
    document.getElementById("pole-numer").value = f.numer;
    return pokazFakture(f, dataZwrotu);
  }

  // --- numer zamówienia ---
  const numer = wpis.numer;
  if (!numer) return pokazBlad(`Wpisz numer zamówienia (liczba od 1 do ${ZAMOWIENIA.length}) albo numer faktury (np. FV00001435).`);
  const dane = znajdzZamowienie(numer);
  if (!dane) return pokazBlad(`Nie znaleziono zamówienia nr ${numer}. Numery zamówień są od 1 do ${ZAMOWIENIA.length}.`);
  if (!dane.klient || !dane.czesc || !dane.dostawca)
    return pokazBlad(`Zamówienie nr ${numer} ma błędne dane w bazie (brak klienta, części albo dostawcy).`);
  if (!dane.faktura)
    return pokazBlad(`Zamówienie nr ${numer} nie ma faktury od hurtowni w bazie faktur.`);
  if (naDni(dataZwrotu) < naDni(dane.zamowienie.dataZakupu))
    return pokazBlad("Data przyjęcia zwrotu nie może być wcześniejsza niż data zakupu.");
  document.getElementById("pole-numer").value = numer;
  pokazWynik(dane, dataZwrotu);
}

// Przejście do zakładki (używane też przez linki do faktur)
function otworzZakladke(idWidoku) {
  document.querySelectorAll(".zakladka").forEach(p => p.classList.toggle("aktywna", p.dataset.widok === idWidoku));
  document.querySelectorAll(".widok").forEach(w => (w.hidden = w.id !== idWidoku));
  if (idWidoku === "widok-pilne") pokazPilne();
}

// Wpisuje numer do wyszukiwarki i od razu szuka
function szukajNumeru(tekst) {
  document.getElementById("pole-numer").value = tekst;
  otworzZakladke("widok-zwroty");
  szukaj();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- 11. Start aplikacji: podpinamy przyciski ----------

document.getElementById("pole-data").value = dzisiaj();
document.getElementById("pole-data-pilne").value = dzisiaj();
document.getElementById("lista-numerow").innerHTML =
  ZAMOWIENIA.map(z => `<option value="${z.numer}">`).join("") +
  FAKTURY.map(f => `<option value="${f.numer}">`).join("");
pokazBazy();

document.getElementById("formularz").addEventListener("submit", e => { e.preventDefault(); szukaj(); });
document.getElementById("formularz-pilne").addEventListener("submit", e => e.preventDefault());
document.getElementById("pole-data-pilne").addEventListener("change", pokazPilne);
document.getElementById("przycisk-dokument").addEventListener("click", generujDokument);
document.getElementById("przycisk-api").addEventListener("click", powiadomHurtownie);
document.getElementById("przycisk-drukuj").addEventListener("click", () => window.print());

// Kliknięcia w linki do faktur i przyciski "Szczegóły" (działają w każdej zakładce)
document.addEventListener("click", e => {
  const link = e.target.closest("[data-faktura]");
  if (link) { e.preventDefault(); szukajNumeru(link.dataset.faktura); return; }
  const przycisk = e.target.closest("[data-zamowienie]");
  if (przycisk) { szukajNumeru(przycisk.dataset.zamowienie); }
});

// Przełączanie zakładek
document.querySelectorAll(".zakladka").forEach(przycisk => {
  przycisk.addEventListener("click", () => {
    // Pilne zwroty: domyślnie ta sama data, co w wyszukiwarce
    if (przycisk.dataset.widok === "widok-pilne")
      document.getElementById("pole-data-pilne").value = document.getElementById("pole-data").value || dzisiaj();
    otworzZakladke(przycisk.dataset.widok);
  });
});
