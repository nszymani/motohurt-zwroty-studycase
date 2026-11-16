// BAZA DOSTAWCÓW (hurtowni) – 10 hurtowni, każda ma inny limit zwrotu
// Dane przykładowe (mockup) – nazwy i adresy są zmyślone.
// limitZwrotuDni = ile dni od daty zakupu hurtownia przyjmuje zwrot.
const DOSTAWCY = [
  { id: "H1", nazwa: "Partner-Auto Sp. z o.o.", limitZwrotuDni: 14, adres: "ul. Magazynowa 5, 05-800 Pruszków", email: "zwroty@partner-auto.example", telefon: "22 100 10 01" },
  { id: "H2", nazwa: "AutoCzęści Centrum S.A.", limitZwrotuDni: 30, adres: "ul. Składowa 18, 61-001 Poznań", email: "rma@autoczesci-centrum.example", telefon: "61 200 20 02" },
  { id: "H3", nazwa: "Hurtownia Tłok", limitZwrotuDni: 21, adres: "ul. Fabryczna 7, 31-553 Kraków", email: "zwroty@tlok.example", telefon: "12 300 30 03" },
  { id: "H4", nazwa: "Elektro-Car Hurt", limitZwrotuDni: 7, adres: "ul. Kolejowa 22, 50-001 Wrocław", email: "zwroty@elektrocar.example", telefon: "71 400 40 04" },
  { id: "H5", nazwa: "Filtr-Serwis Sp. j.", limitZwrotuDni: 45, adres: "ul. Włókiennicza 3, 90-001 Łódź", email: "reklamacje@filtrserwis.example", telefon: "42 500 50 05" },
  { id: "H6", nazwa: "Hamulec-Pro Sp. z o.o.", limitZwrotuDni: 10, adres: "ul. Portowa 14, 80-001 Gdańsk", email: "zwroty@hamulecpro.example", telefon: "58 600 60 06" },
  { id: "H7", nazwa: "Iskra Hurtownia Motoryzacyjna", limitZwrotuDni: 28, adres: "ul. Górnicza 9, 40-001 Katowice", email: "rma@iskra-hurt.example", telefon: "32 700 70 07" },
  { id: "H8", nazwa: "Rozrząd24 S.A.", limitZwrotuDni: 60, adres: "ul. Zamkowa 31, 20-001 Lublin", email: "zwroty@rozrzad24.example", telefon: "81 800 80 08" },
  { id: "H9", nazwa: "Świetlik Auto-Lampy", limitZwrotuDni: 15, adres: "ul. Morska 6, 70-001 Szczecin", email: "zwroty@swietlik.example", telefon: "91 900 90 09" },
  { id: "H10", nazwa: "Akumulator-Max Sp. z o.o.", limitZwrotuDni: 90, adres: "ul. Energetyczna 2, 85-001 Bydgoszcz", email: "rma@akumulatormax.example", telefon: "52 110 11 10" }
];
