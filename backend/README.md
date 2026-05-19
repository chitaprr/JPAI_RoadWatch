## RoadWatch — backend

### Development
Uruchom Postgresa (z root katalogu projektu):
```shell
docker compose up -d
```

Instalacja zależności i start w trybie dev:
```shell
npm i
cp example.env .env
npm run dev
```

### Prisma
Wygeneruj klienta Prisma:
```shell
npm run prisma:generate
```

Wypchnij schemat do bazy (bez migracji):
```shell
npm run prisma:push
```

Stwórz migrację:
```shell
npm run prisma:migrate
```

**Uwaga:** uzupełnij zmienne środowiskowe w pliku [`.env`](.env) na podstawie [`example.env`](example.env).
