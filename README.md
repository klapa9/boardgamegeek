# Gezelschapsspelkiezer MVP - BGG sync patch

Deze patch past de MVP aan naar de nieuwste flow:

- BGG wordt niet meer live gebruikt tijdens het aanmaken of invullen van een spelavond.
- Er is een apart scherm **Mijn spellen** op `/games`.
- Daar synchroniseer je vooraf je BGG collectie.
- Bij het maken van een spelavond kies je spellen uit je lokale Postgres-lijst.
- De sessie zelf doet alleen nog: spelers joinen, beschikbaarheid kiezen, scores geven en resultaat delen.

## Uitpakken over bestaande MVP

Pak deze zip uit bovenop de bestaande map van `gezelschapsspelkiezer-mvp-bggfix` en overschrijf bestaande bestanden.

## Database migratie

Deze patch voegt nieuwe tabellen toe voor de lokale collectie. Draai daarna:

```bash
npx prisma migrate dev --name collection_sync
```

## Starten

Je bestaande setup blijft hetzelfde. Postgres draait op `localhost:5433`.

```bash
npm install
docker compose up -d
npx prisma migrate dev --name collection_sync
npm run dev
```

Open daarna:

```text
http://localhost:3000
```

Ga naar:

```text
http://localhost:3000/games
```

Daar kan je je BGG username synchroniseren.

## BGG gedrag

BGG vraagt tegenwoordig voor vrijwel alle XML API-aanroepen een geregistreerde applicatie-token. Maak op `https://boardgamegeek.com/applications` een applicatie aan, maak daar een token voor, en zet die in je `.env`:

```bash
BGG_API_TOKEN="jouw-token"
```

Herstart daarna `npm run dev`, want Next.js leest `.env` bij het starten.

BGG geeft soms HTTP 202 terug bij een collectie-import. Dat betekent dat BGG de collectie aan het voorbereiden is. Klik dan na ongeveer 30 seconden opnieuw op synchroniseren.
