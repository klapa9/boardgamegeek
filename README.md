# boardgamegeek.be - BGG sync patch

Deze patch past de MVP aan naar de nieuwste flow:

- BGG wordt niet meer live gebruikt tijdens het aanmaken of invullen van een spelavond.
- Er is een apart scherm **Mijn spellen** op `/games`.
- Daar synchroniseer je vooraf je BGG collectie. Standaard gebruikt de app `boardgamegeek.be`.
- Bij het maken van een spelavond kies je spellen uit je lokale Postgres-lijst.
- De sessie zelf doet alleen nog: spelers joinen, beschikbaarheid kiezen, scores geven en resultaat delen.

## Uitpakken over bestaande MVP

Pak deze zip uit bovenop de bestaande map van `boardgamegeek-be-bggfix` en overschrijf bestaande bestanden.

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

De standaardcollectie opslaan in de database kan ook via:

```bash
npm run db:sync-default-collection
```

Normaal hoeft dit niet tijdens deploy. De admin kan via `/games` handmatig synchroniseren; daarna staan de spellen in de database.
Als BGG server-to-server weigert, kan je de XML uit de publieke BGG-link kopieren en op `/games` in **BGG XML plakken** importeren.

## BGG gedrag

De collectie-import gebruikt de publieke BoardGameGeek XML endpoint:

```text
https://boardgamegeek.com/xmlapi2/collection?username=boardgamegeek.be
```

Daar is geen API-token voor nodig; de sync stuurt ook geen Authorization-header mee. Je kan de standaardgebruiker aanpassen in `.env`:

```bash
DEFAULT_BGG_USERNAME="boardgamegeek.be"
```

BGG geeft soms HTTP 202 terug bij een collectie-import. Dat betekent dat BGG de collectie aan het voorbereiden is. De sync wacht automatisch langer en probeert opnieuw.
