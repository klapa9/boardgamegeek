# BoardgameCrew

BoardgameCrew is een Next.js-app om bordspelavonden te organiseren. Je beheert je eigen collectie, maakt een spelavond aan, deelt een uitnodigingslink en laat deelnemers aangeven wanneer ze kunnen en welke spellen ze graag willen spelen.

De app is bedoeld voor vriendengroepen, spelclubs en iedereen die minder wil plannen in losse chats, spreadsheets en polls.

## Wat kun je ermee?

- Spelavonden aanmaken met titel, uur, locatie en datumopties.
- Een vaste datum kiezen of deelnemers laten stemmen op meerdere data.
- Spellen vooraf selecteren uit je eigen collectie of deelnemers laten meebeslissen.
- Deelnemers laten joinen via een gedeelde link.
- Beschikbaarheid verzamelen: ja, nee of onzeker.
- Spelvoorkeuren verzamelen met scores van 0 tot 10.
- Extra vragen toevoegen, bijvoorbeeld over eten, vervoer of praktische afspraken.
- Een winnend spel en gekozen datum vastzetten.
- Een deelbericht genereren voor de uitnodiging.
- Je collectie beheren, groeperen en synchroniseren met BoardGameGeek.
- Feedback van gebruikers verzamelen en als admin bekijken.

## Belangrijkste flows

### 1. Collectie beheren

Via `/collectie` zie je je spelcollectie en kun je eigen groepen maken, bijvoorbeeld `Favorieten`, `2 spelers`, `Korte spellen` of `Heavy games`.

Via `/games` voeg je spellen toe of verwijder je ze. De app ondersteunt bordspellen en roleplaying games. Spellen kunnen handmatig toegevoegd worden of via BoardGameGeek worden opgehaald.

### 2. BoardGameGeek synchroniseren

Via `/bgg` koppel je een publieke BoardGameGeek-gebruikersnaam. De app haalt de collectie op via de publieke XML API van BoardGameGeek en slaat de spellen lokaal op in Postgres.

Als BoardGameGeek tijdelijk `202 Accepted` teruggeeft, betekent dat dat BGG de collectie nog voorbereidt. De sync probeert dan opnieuw. Als server-to-server ophalen niet lukt, kun je XML handmatig plakken in de BGG-syncpagina.

### 3. Spelavond maken

Een nieuwe spelavond start op `/spelavond?nieuw=1`.

De aanmaakflow bestaat uit drie stappen:

1. `/spelavond` - instellingen zoals titel, planningmodus, spelkeuzemodus, uur, locatie en extra vragen.
2. `/planning` - een vaste datum of meerdere datumopties kiezen.
3. `/spelkeuze` - spellen kiezen uit je collectie of BGG-spellen toevoegen voor alleen deze sessie.

Na het aanmaken krijg je een sessielink die je met deelnemers kunt delen.

### 4. Deelnemers laten stemmen

Een gedeelde sessie draait op `/s/[id]` of `/s/[id]/[slug]`.

Deelnemers kunnen:

- zichzelf toevoegen aan de sessie;
- beschikbaarheid invullen;
- extra vragen beantwoorden;
- spellen scoren;
- resultaten bekijken.

De organisator kan daarna een datum of spel vastzetten.

## Tech stack

- Next.js 14 met App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Clerk voor login en gebruikers
- BoardGameGeek XML API voor collectie- en speldata

## Vereisten

- Node.js 20 of nieuwer
- npm
- Docker Desktop of een eigen PostgreSQL-server
- Een Clerk-project voor authenticatie

## Lokale installatie

Installeer eerst de dependencies:

```bash
npm install
```

Maak daarna een `.env` aan op basis van `.env.example`:

```bash
cp .env.example .env
```

Vul minstens deze waarden in:

```env
DATABASE_URL="postgresql://gamenight:gamenight@localhost:5433/gamenight?schema=public"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
```

Start Postgres met Docker:

```bash
docker compose up -d postgres
```

Voer de Prisma-migraties uit:

```bash
npm run db:migrate
```

Start de ontwikkelserver:

```bash
npm run dev
```

Open daarna:

```text
http://localhost:3000
```

## Docker

Voor lokale ontwikkeling is het meestal het handigst om alleen de database via Docker te starten:

```bash
docker compose up -d postgres
```

De meegeleverde `docker-compose.yml` bevat ook een `app` service. Als je de volledige stack in Docker wilt draaien, zorg dan dat `DATABASE_URL` in de container naar de Compose-service verwijst:

```env
DATABASE_URL="postgresql://gamenight:gamenight@postgres:5432/gamenight?schema=public"
```

Daarna kun je de stack bouwen en starten:

```bash
docker compose up -d --build
```

Let op: migraties moeten ook voor de database uitgevoerd zijn voordat de app volledig bruikbaar is.

## Environment variables

| Variabele | Doel |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string voor Prisma. |
| `DEFAULT_BGG_USERNAME` | Standaard BGG-gebruiker voor de optionele sync via script. |
| `BGG_API_TOKEN` | Momenteel optioneel/leeg; de publieke BGG XML API gebruikt geen token. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publieke Clerk key voor de frontend. |
| `CLERK_SECRET_KEY` | Secret Clerk key voor server-side auth. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Loginroute, standaard `/sign-in`. |
| `ADMIN_CLERK_USER_IDS` | Komma-gescheiden Clerk user IDs met adminrechten. |
| `ADMIN_EMAILS` | Komma-gescheiden e-mailadressen met adminrechten. |

Voor adminrechten mag je `ADMIN_CLERK_USER_IDS`, `ADMIN_EMAILS` of beide gebruiken.

Voorbeeld:

```env
ADMIN_CLERK_USER_IDS="user_123,user_456"
ADMIN_EMAILS="jij@example.com"
```

## Handige scripts

| Script | Beschrijving |
| --- | --- |
| `npm run dev` | Start de Next.js ontwikkelserver. |
| `npm run build` | Genereert Prisma Client en bouwt de productieversie. |
| `npm run start` | Start de productiebuild. |
| `npm run lint` | Draait Next linting. |
| `npm run db:migrate` | Draait Prisma migrations in development. |
| `npm run db:studio` | Opent Prisma Studio. |
| `npm run db:reset` | Reset de database en draait migraties opnieuw. |
| `npm run db:sync-default-collection` | Synchroniseert de standaard BGG-collectie uit `DEFAULT_BGG_USERNAME`. |

## Routes

| Route | Beschrijving |
| --- | --- |
| `/` | Startpagina en dashboard. |
| `/sign-in` | Clerk login. |
| `/collectie` | Collectieoverzicht en groepen beheren. |
| `/games` | Spellen toevoegen, verwijderen en beheren. |
| `/bgg` | BoardGameGeek-synchronisatie. |
| `/spelavond?nieuw=1` | Nieuwe spelavond starten. |
| `/planning` | Datumopties kiezen tijdens de aanmaakflow. |
| `/spelkeuze` | Spellen kiezen tijdens de aanmaakflow. |
| `/spelavonden` | Overzicht van spelavonden. |
| `/s/[id]` | Publieke sessiepagina voor deelnemers. |
| `/admin/feedback` | Adminoverzicht van feedback en feature-aanvragen. |

De meeste beheerpagina's vereisen login via Clerk. De gedeelde sessiepagina is bedoeld om makkelijk met deelnemers te delen.

## Data en database

Prisma beheert de database. De belangrijkste datamodellen zijn:

- `Session` voor spelavonden.
- `Player` voor deelnemers.
- `Availability` voor datumstemmen.
- `Rating` voor spelscores.
- `Game` voor spellen binnen een sessie.
- `CollectionGame` voor spellen in iemands collectie.
- `CollectionGroup` voor collectie-indeling.
- `UserProfile` voor de koppeling met Clerk-gebruikers.
- `FeedbackRequest` voor feedback vanuit de app.

Migraties staan in `prisma/migrations`.

## BoardGameGeek

De BGG-sync gebruikt onder andere:

```text
https://boardgamegeek.com/xmlapi2/collection
https://boardgamegeek.com/xmlapi2/thing
```

Er is geen API-token nodig voor de publieke collectie-import. De app slaat opgehaalde BGG-data lokaal op, zodat sessies niet afhankelijk zijn van live BGG-calls tijdens het invullen van een spelavond.

## Projectstructuur

```text
app/          Next.js routes en API routes
components/   React componenten voor flows en UI
lib/          Domeinlogica, API helpers, auth, BGG sync en serializers
prisma/       Prisma schema en migraties
public/       Afbeeldingen, branding en PWA-assets
scripts/      Losse onderhouds- en syncscripts
```

## Ontwikkelnotities

- De app gebruikt Clerk voor ingelogde gebruikers en organisatorrechten.
- Sessies bewaren een organisatorprofiel, zodat alleen de organisator bepaalde acties kan uitvoeren.
- De collectie is user-scoped: elke gebruiker beheert zijn eigen spellen en groepen.
- Sessiegegevens worden regelmatig ververst in de client, zodat resultaten tijdens het invullen actueel blijven.
- BGG-data wordt bewust lokaal opgeslagen om de sessieflow snel en robuust te houden.
