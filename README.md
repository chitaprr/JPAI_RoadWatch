# JPAI_RoadWatch

Platforma do zgłaszania i obsługi usterek drogowych. Mieszkańcy zgłaszają usterki
(zdjęcie + lokalizacja na mapie), urzędnicy je triażują i zlecają wykonawcom, którzy
dokumentują naprawę.

**Stack:** Backend — Node + Express + Prisma + PostgreSQL (TypeScript). Frontend —
React + Vite + Leaflet. Monorepo: `backend/` i `frontend/`.

## Szybki start (dev)

Wymagania: Node 24+, Docker (dla bazy).

```bash
# 1. Baza danych (Postgres na localhost:5432)
docker compose up -d

# 2. Backend
cd backend
cp example.env .env            # uzupełnij w razie potrzeby
npm install
npm run prisma:generate        # generuje klienta Prisma (wymagane po klonie/zmianie schematu)
npm run prisma:push            # tworzy tabele w bazie
npm run dev                    # API na http://localhost:8000

# 3. Frontend (w drugim terminalu)
cd frontend
npm install
npm run dev                    # aplikacja na http://localhost:3000
```

Dokumentacja API (dev): Swagger UI na `http://localhost:8000/docs`.

## Role i pierwsze konto

Po rejestracji konto ma rolę `MIESZKANIEC`. Aby nadać wyższe uprawnienia, ustaw je w
bazie (`npm run prisma:studio`) lub przez panel superadmina:

- **Mieszkaniec / Gość** — zgłasza usterki, śledzi status (po zalogowaniu lub jako gość
  po numerze ID + e-mail), potwierdza („+1") cudze zgłoszenia na mapie.
- **Urzędnik** (`role=URZEDNIK` + `urzednikGminaId`) — panel `/urzednik`: zgłoszenia
  swojej gminy, zmiana statusu, przypisanie wykonawcy, statystyki, eksport CSV/PDF,
  komentarze, historia zmian.
- **Wykonawca** (`role=WYKONAWCA` + `wykonawcaId`) — panel `/wykonawca`: lista zleceń,
  zmiana statusu, zapis naprawy ze zdjęciami „po".
- **Administrator gminy** (`role=ADMIN` + `adminGminaId`) — panel `/gmina`: nadawanie
  ról i CRUD wykonawców w obrębie swojej gminy.
- **Superadmin** (`isSuperadmin=true`) — panel `/admin`: pełne zarządzanie (użytkownicy,
  role, zgłoszenia, gminy, wykonawcy).

## Powiadomienia push (opcjonalne)

Web Push działa tylko z kluczami VAPID. Bez nich aplikacja działa normalnie, a push jest
wyłączony.

```bash
cd backend
npx web-push generate-vapid-keys   # wklej klucze do .env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)
```

Powiadomienia wymagają `localhost` lub HTTPS. Włącz je przyciskiem 🔔 w aplikacji.

## Przydatne komendy

| Komenda (w `backend/`)  | Opis                                          |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | start z hot-reload (nodemon)                  |
| `npm run seed`          | wypełnia bazę danymi testowymi (zob. niżej)   |
| `npm run prisma:studio` | przeglądarka bazy danych                      |
| `npm run prisma:push`   | synchronizacja schematu z bazą (bez migracji) |
| `npm run check`         | format + lint (uruchamiane przez CI)          |
| `npm test`              | testy (Vitest)                                |

W `frontend/`: `npm run dev`, `npm run build`, `npm run check`.

## Dane testowe (seed)

`npm run seed` (po `prisma:generate` + `prisma:push`) tworzy gminę **Kraków**, firmę
wykonawczą **januszpol** (NIP 1234567890) oraz po jednym koncie na rolę. Hasło dla
wszystkich: **`testtest`**.

| E-mail                      | Rola                  |
| --------------------------- | --------------------- |
| `superadmin@roadwatch.com`  | superadmin            |
| `admin@roadwatch.com`       | administrator gminy   |
| `urzednik@roadwatch.com`    | urzędnik (Kraków)     |
| `wykonawca@roadwatch.com`   | wykonawca (januszpol) |
| `mieszkaniec@roadwatch.com` | mieszkaniec           |

Skrypt jest idempotentny — można go uruchamiać wielokrotnie.

## Produkcja

`docker-compose.prod.yml` buduje backend (port 8000) i frontend (port 3000) oraz bazę.
Konfiguracja przez zmienne środowiskowe — zob. `example.env.prod`.
