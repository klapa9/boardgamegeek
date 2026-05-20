export type LandingPagePath =
  | '/bordspelavond-plannen'
  | '/boardgamegeek-collectie-beheren'
  | '/spelavond-met-vrienden-organiseren';

type LandingScreenshot = {
  src: string;
  alt: string;
  caption: string;
  imageClassName?: string;
};

type LandingSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  exampleTitle?: string;
  exampleBody?: string[];
};

type LandingFaq = {
  question: string;
  answer: string;
};

export type LandingPageContent = {
  path: LandingPagePath;
  seoTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  description: string;
  intro: string[];
  highlights: string[];
  screenshots: LandingScreenshot[];
  sections: LandingSection[];
  faqs: LandingFaq[];
  heroCardClassName: 'page-card-sky' | 'page-card-peach' | 'page-card-lime';
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  ctaTitle: string;
  ctaDescription: string;
  homeCardTitle: string;
  homeCardDescription: string;
  homeCardEyebrow: string;
  homeCardImageSrc: string;
  homeCardImageAlt: string;
  homeLinkText: string;
};

export const landingPages = {
  bordspelavondPlannen: {
    path: '/bordspelavond-plannen',
    seoTitle: 'Bordspelavond plannen zonder eindeloze groepschat',
    metaDescription:
      'Praktische gids om een bordspelavond te plannen: datum kiezen, deelnemers laten reageren, spellen selecteren en een duidelijke uitnodiging sturen.',
    eyebrow: 'Planning',
    title: 'Bordspelavond plannen zonder eindeloze groepschat',
    description:
      'Een bordspelavond organiseren hoeft geen heen-en-weer van losse berichten te zijn. Met een vaste aanpak maak je sneller keuzes, krijgen deelnemers duidelijkheid en blijft de organisator niet hangen in kleine beslissingen.',
    intro: [
      `Veel spelgroepen herkennen hetzelfde patroon: iemand vraagt in een chat wie wanneer kan, drie mensen reageren meteen, twee mensen zien het te laat en daarna schuift de vraag op naar welke spellen op tafel mogen komen. Nog voor de datum vastligt, is de energie uit de planning verdwenen. Het probleem is meestal niet dat mensen geen zin hebben. Het probleem is dat alle informatie verspreid raakt.`,
      `Als je makkelijk een bordspelavond wilt plannen, helpt het om planning, spelkeuze en uitnodiging in een vaste volgorde te zetten. Eerst zorg je dat iedereen op dezelfde informatie reageert, daarna verklein je de opties en pas op het einde hak je knopen door. Dat klinkt simpel, maar juist die volgorde voorkomt keuzestress en voorkomt dat jij als organisator alles handmatig moet samenvatten.`
    ],
    highlights: [
      `Geef spelers 3 tot 5 datumopties in plaats van een open vraag als "wanneer kan iedereen?".`,
      `Zet spelkeuze pas na de planning centraal, zodat mensen niet tegelijk over datum, locatie en titel hoeven nadenken.`,
      `Werk met een duidelijke deadline, zodat de groep weet wanneer je de knoop doorhakt.`,
      `Verzamel uitnodiging, reacties en voorkeuren op een plek zodat niemand moet zoeken in oude berichten.`
    ],
    screenshots: [
      {
        src: '/marketing/planning.png',
        alt: 'Planningsoverzicht met verschillende datumopties en deelnemers.',
        caption: 'Datumopties bij elkaar maakt meteen zichtbaar wie al reageerde en welke avonden kans maken.'
      },
      {
        src: '/marketing/score.png',
        alt: 'Scorekaart voor spellen in een spelavond.',
        caption: 'Door spellen vooraf te laten scoren, kies je sneller en eerlijker dan met een losse chatdiscussie.'
      },
      {
        src: '/marketing/delen.png',
        alt: 'Deelvenster met een uitnodiging voor een spelavond.',
        caption: 'Een duidelijke uitnodiging met alle info verlaagt de kans dat mensen afhaken of nog extra vragen moeten stellen.'
      }
    ],
    sections: [
      {
        title: 'Begin met een helder kader',
        paragraphs: [
          `Een bordspelavond wordt makkelijker planbaar zodra je eerst het kader afbakent. Spreek voor jezelf af wat vaststaat en wat nog open ligt. Gaat het om een korte weekavond of een lange zaterdag? Nodig je alleen je vaste groep uit of ook nieuwe spelers? En wil je vooral iets lichts spelen of mag het juist een langere expertgame worden? Zodra jij dat kader kent, kunnen anderen veel gerichter reageren.`,
          `Het grote voordeel van zo'n start is dat je meteen realistische keuzes maakt. Als je weet dat de avond op een werkdag valt, heeft het weinig zin om een lijst van zes spellen van drie uur rond te sturen. En als je merkt dat de groep deze keer vooral sociaal wil samenkomen, hoeft niet elk detail perfect geoptimaliseerd te zijn. Goede planning begint dus niet met meer opties, maar met betere randvoorwaarden.`
        ],
        bullets: [
          `Bepaal vooraf of datum, locatie of spelduur het belangrijkst is voor deze avond.`,
          `Houd de groep klein genoeg om echte consensus te krijgen, zeker als je met langere spellen werkt.`,
          `Formuleer in een zin wat voor avond je wilt: relaxed, competitief, lang, kort of toegankelijk voor nieuwe spelers.`
        ]
      },
      {
        title: 'Laat mensen kiezen uit echte datumopties',
        paragraphs: [
          `De makkelijkste manier om een bordspelavond te plannen is mensen niet te vragen wanneer ze ooit allemaal kunnen, maar ze te laten reageren op een kleine set concrete opties. Drie tot vijf data is meestal genoeg. Dan voelen antwoorden licht aan en krijg je sneller een bruikbaar overzicht. Bij een open vraag blijven mensen vaak wachten, omdat ze eerst hun hele agenda willen bekijken of denken dat ze later nog wel reageren.`,
          `Zet ook een korte deadline op die datumkeuze. Niet om streng te doen, maar om ritme te houden. Als iedereen weet dat je bijvoorbeeld donderdagavond de datum vastlegt, is het veel duidelijker wanneer hun reactie nodig is. Zo voorkom je dat jij drie dagen later individueel mensen moet najagen en ondertussen niets kunt beslissen.`
        ],
        exampleTitle: 'Praktisch voorbeeld',
        exampleBody: [
          `Stuur niet "Wanneer kan iedereen in juni?", maar liever: "We plannen een spelavond in de tweede helft van juni. Kies even uit woensdag 12, vrijdag 14, zaterdag 15 of zondag 16."`,
          `Voeg meteen toe wanneer je beslist: "Ik leg de datum donderdagavond vast op basis van wie reageerde."`
        ]
      },
      {
        title: 'Houd de spellenlijst bewust klein',
        paragraphs: [
          `Zodra de datumopties lopen, kun je nadenken over spellen. Ook daar geldt: minder opties geeft beter gedrag. Als je iedereen zomaar laat roepen wat er mee mag, krijg je snel een lange lijst waar niemand nog echt naar kijkt. Beter is om een voorselectie te maken van titels die passen bij het aantal spelers, de beschikbare tijd en het ervaringsniveau van de groep.`,
          `Een korte lijst helpt ook tegen keuzestress. De meeste mensen kiezen makkelijker uit vijf goede opties dan uit vijftien middelmatige. En als iemand later toch nog een sterk alternatief heeft, kun je dat nog toevoegen. Het doel is niet om alles van tevoren dicht te timmeren, maar om de groep te helpen sneller tot een keuze te komen zonder eindeloos vergelijken.`
        ],
        bullets: [
          `Filter op speeltijd en spelersaantal voor je spellen deelt.`,
          `Verwijder titels waarvan je al weet dat de helft van de groep ze niet wil spelen.`,
          `Voeg liever een korte scorevraag toe dan een lange discussie over elk afzonderlijk spel.`
        ]
      },
      {
        title: 'Maak de uitnodiging concreet en volledig',
        paragraphs: [
          `Een goede uitnodiging is meer dan alleen een link of een datum. Mensen reageren sneller wanneer ze direct zien wat van hen verwacht wordt. Vermeld daarom altijd de mogelijke data, het beoogde tijdstip, de locatie of plaats, en of er ook al een spellenlijst of extra vraag klaarstaat. Hoe minder mensen moeten terugvragen, hoe groter de kans dat ze echt invullen in plaats van alleen "lijkt me leuk" te zeggen.`,
          `Voor spelgroepen is het bovendien handig om aanvullende afspraken mee te nemen. Denk aan eten vooraf, carpoolen, wie een extra tafel meebrengt of of er nieuwe spelers aansluiten. Zulke details lijken klein, maar ze zorgen vaak voor de meeste losse berichten. Door ze meteen bij dezelfde spelavond te zetten, houd je het overzichtelijk en voorkom je verrassingen op de dag zelf.`
        ]
      },
      {
        title: 'Hak de knoop door en bevestig de avond',
        paragraphs: [
          `Op een bepaald moment moet een bordspelavond niet meer "in bespreking" zijn maar gewoon vastliggen. Dat is het moment waarop veel organisatoren te lang blijven twijfelen. Ze hopen nog op die ene reactie of willen nog een betere datum vinden. In de praktijk levert dat zelden iets op. Beter is om op het afgesproken moment de beste optie te kiezen en dat meteen te bevestigen.`,
          `Na die bevestiging verandert de toon van de planning. Mensen hoeven niet meer te vergelijken, maar weten waar ze aan toe zijn. Dat maakt het ook makkelijker om het spel vast te zetten of de laatste details te regelen. Een vlotte organisator is niet degene die iedereen perfect tevreden houdt, maar degene die het besluitvormingsmoment duidelijk maakt en daarna rust brengt.`
        ]
      },
      {
        title: 'Waarom een centrale app hier zoveel scheelt',
        paragraphs: [
          `Wanneer planning, spelkeuze en delen bij elkaar staan, hoef je niet langer te switchen tussen chat, notities en losse polls. Je ziet meteen wie reageerde, welke datum het sterkst scoort en welke spellen nog openstaan. Dat scheelt vooral mentale belasting. Niet omdat de avond inhoudelijk eenvoudiger wordt, maar omdat de organisator geen menselijke spreadsheet meer hoeft te zijn.`,
          `Mensen zoeken naar "bordspelavond plannen" omdat ze genoeg hebben van verwarrende groepsapps en half ingevulde plannen. Als je die frictie wegneemt met duidelijke stappen, wordt plannen weer iets waar de groep naar uitkijkt in plaats van iets wat iedereen uitstelt.`
        ]
      }
    ],
    faqs: [
      {
        question: 'Hoe plan je makkelijk een bordspelavond?',
        answer:
          'Begin met 3 tot 5 concrete datumopties, zet een korte reactiedeadline en laat mensen op een plek reageren. Pas daarna beperk je de spellenlijst en stuur je een duidelijke bevestiging.'
      },
      {
        question: 'Hoeveel datumopties geef je best door?',
        answer:
          'Meestal zijn 3 tot 5 opties ideaal. Minder voelt beperkend, meer maakt reageren zwaarder en vertraagt de beslissing.'
      },
      {
        question: 'Hoe kies je een spel voor meerdere spelers?',
        answer:
          'Werk met een korte voorselectie op basis van spelersaantal, duur en moeilijkheid. Laat spelers daarna scoren of stemmen in plaats van alles open te bespreken.'
      },
      {
        question: 'Hoe voorkom je keuzestress bij spelavonden?',
        answer:
          'Beperk tegelijk het aantal data en het aantal spellen. Mensen kiezen makkelijker uit een korte, relevante lijst dan uit een grote verzameling losse ideeën.'
      },
      {
        question: 'Wanneer leg je de datum definitief vast?',
        answer:
          'Zodra je deadline voorbij is. Wachten op nog een reactie levert meestal minder op dan duidelijke zekerheid geven aan de groep.'
      },
      {
        question: 'Moet alles al vastliggen voor je uitnodigt?',
        answer:
          'Nee. Het helpt juist om te tonen wat al vaststaat en wat nog open is. Dan kunnen mensen gericht reageren zonder dat jij eerst alles volledig hoeft uit te werken.'
      }
    ],
    heroCardClassName: 'page-card-lime',
    primaryCtaLabel: 'Plan je volgende spelavond',
    primaryCtaHref: '/sign-in',
    secondaryCtaLabel: 'Bekijk de startpagina',
    secondaryCtaHref: '/',
    ctaTitle: 'Maak van plannen weer iets lichts',
    ctaDescription:
      'Zet datumopties, spelkeuze en delen bij elkaar. Zo hoeft niemand oude berichten terug te zoeken en kun jij sneller een echte spelavond vastleggen.',
    homeCardTitle: 'Bordspelavond plannen',
    homeCardDescription:
      'Hoe je datumopties, uitnodiging en spelkeuze rustig regelt, zonder dat alles verdwijnt in de groepschat.',
    homeCardEyebrow: 'Gids',
    homeCardImageSrc: '/marketing/planning.png',
    homeCardImageAlt: 'Planningsoverzicht van een bordspelavond met datumopties.',
    homeLinkText: 'Lees hoe je sneller een bordspelavond plant'
  },
  boardgamegeekCollectieBeheren: {
    path: '/boardgamegeek-collectie-beheren',
    seoTitle: 'Je bordspellenverzameling beheren voor spelavonden',
    metaDescription:
      'Leer hoe je je bordspellenverzameling handig organiseert: spellen ordenen, sneller terugvinden en makkelijker afspreken wat jullie gaan spelen.',
    eyebrow: 'Verzameling',
    title: 'Je bordspellenverzameling beheren voor spelavonden',
    description:
      'Een lijst met spellen is pas echt handig als je er snel iets uit kunt kiezen. Door je verzameling slim te ordenen, wordt een spelavond organiseren meteen een stuk makkelijker.',
    intro: [
      `Veel bordspelliefhebbers hebben meer spellen dan ze op een gewone avond kunnen overzien. De titels staan in de kast, in een lijst of in een online profiel, maar op het moment zelf blijft de vraag hetzelfde: wat past vanavond bij deze groep? Een verzameling bezitten is iets anders dan een verzameling makkelijk kunnen gebruiken.`,
      `Je bordspellenverzameling goed beheren betekent dat je je spellen zo organiseert dat ze helpen bij afspreken en kiezen. Welke spellen zijn geschikt voor een korte weekavond? Wat werkt goed met twee spelers? Welke gezelschapsspellen zijn handig met nieuwe mensen erbij? Zodra je daar wat structuur in brengt, bespaar je tijd en voorkom je dat steeds dezelfde bekende spellen automatisch winnen.`
    ],
    highlights: [
      `Orden je spellen op manieren die je echt gebruikt, zoals korte spellen, 2 spelers, favorieten of makkelijk uit te leggen.`,
      `Gebruik je verzameling niet als lange inventaris, maar als hulpmiddel om sneller een passend spel te vinden.`,
      `Een duidelijke spellenlijst maakt afspreken met vrienden eenvoudiger, zeker als iedereen vooraf mee mag kiezen.`,
      `Als je al een online lijst hebt, kun je die als startpunt gebruiken en daarna zelf bijsturen.`
    ],
    screenshots: [
      {
        src: '/marketing/collectie.png',
        alt: 'Overzicht van een bordspellenverzameling met verschillende spelgroepen in de app.',
        caption: 'Door je spellen te ordenen in groepen zie je sneller wat geschikt is voor een specifieke avond.'
      },
      {
        src: '/marketing/game-sync.png',
        alt: 'Synchronisatieoverzicht voor een spellenverzameling.',
        caption: 'Een bestaande spellenlijst is handig als startpunt, maar je eigen indeling bepaalt hoe bruikbaar ze echt wordt.',
        imageClassName: 'object-left-top'
      },
      {
        src: '/marketing/scoretabel.png',
        alt: 'Resultatenoverzicht van spelkeuze tijdens een spelavond.',
        caption: 'Een duidelijke verzameling zorgt ervoor dat je later bij spelkeuze al met relevante kandidaten vertrekt.'
      }
    ],
    sections: [
      {
        title: 'Waarom een lange spellenlijst niet genoeg is',
        paragraphs: [
          `Een ruwe lijst is zelden de beste basis voor een concrete avond. Je verzameling bevat misschien uitbreidingen, zware spellen, titels die je graag bewaart maar zelden voorstelt, of spellen die alleen werken met een specifieke groep. Als je alles tegelijk toont, schuif je het denkwerk door naar het moment waarop je eigenlijk al wilt kiezen.`,
          `Daarom is beheren meer dan bijhouden wat je bezit. Het gaat om context toevoegen. Niet elk bordspel verdient dezelfde zichtbaarheid in elke situatie. Door te bepalen wat relevant is voor jouw groep, voorkom je dat de spelavond begint met een enorme lijst waar niemand in wil zoeken.`
        ]
      },
      {
        title: 'Maak van je verzameling een handige spellenlijst',
        paragraphs: [
          `Een bruikbare verzameling begint met ordening die je zelf logisch vindt. Denk aan groepen zoals snelle fillers, favorieten, 2 spelers, familieproof of spellen die je nog wilt ontdekken. Zulke groepen hoeven niet perfect te zijn. Ze moeten vooral helpen om sneller te denken. Het doel is dat je bij het plannen meteen een passende selectie kunt oproepen in plaats van opnieuw door alles te bladeren.`,
          `Ook simpele metadata wordt waardevoller zodra je er actief mee werkt. Spelduur, spelersaantal en complexiteit zijn geen losse cijfers meer, maar filters voor echte keuzes. Een spel dat je geweldig vindt, blijft misschien uit de lijst voor een korte weekavond. Dat is geen verlies, maar juist goed beheer: je kiest zichtbaarheid op basis van bruikbaarheid.`
        ],
        bullets: [
          `Maak groepen aan die passen bij hoe jouw groep beslist, niet alleen bij officiële genres.`,
          `Gebruik favorieten voor spellen die je makkelijk opnieuw op tafel krijgt.`,
          `Houd ook een groep bij voor titels die je bewust nog een keer wilt testen.`
        ]
      },
      {
        title: 'Denk vanuit de volgende avond, niet vanuit je hele kast',
        paragraphs: [
          `Een verzameling wordt pas echt nuttig wanneer je ze bekijkt vanuit het concrete moment waarop je gaat spelen. Wie komt er? Hoeveel tijd is er? Zijn er nieuwe spelers bij? Wil je vandaag vooral iets gezelligs of juist iets strategisch? Door je spellenlijst aan die vragen te koppelen, wordt zoeken veel lichter. Je lijst werkt dan als voorbereiding in plaats van als opslag.`,
          `Dat helpt ook tegen routine. In veel groepen keren automatisch dezelfde twee of drie titels terug, simpelweg omdat niemand tijd heeft om verder te zoeken. Met een goede indeling kun je bewust alternatieven tonen die ook passen, maar normaal onder de radar blijven. Zo krijgt je verzameling meer speelkansen en voelt ze levender.`
        ],
        exampleTitle: 'Praktisch voorbeeld',
        exampleBody: [
          `Voor een vrijdagavond met vijf ervaren spelers gebruik je misschien de groepen "favorieten", "4-5 spelers" en "90+ minuten".`,
          `Voor een spontane zondagmiddag met twee vrienden heb je meer aan "2 spelers", "uitlegbaar in 10 minuten" en "max 60 minuten".`
        ]
      },
      {
        title: 'Gebruik je online lijst als startpunt',
        paragraphs: [
          `Als je je spellen al online bijhoudt, is dat een handig startpunt. Door zo'n lijst in te laden, hoef je titels en basisgegevens niet opnieuw over te typen. Daarna wil je nog steeds ruimte houden om spellen te verbergen, groepen toe te voegen of eigen accenten te leggen.`,
          `Dat lokale beheer is belangrijk omdat je gebruikssituatie verschilt van je volledige verzameling. Misschien staat iets in je lijst omdat je het ooit kreeg, maar wil je het niet voorstellen voor deze groep. Of misschien voeg je net een extra label toe omdat je groep een spel bijzonder goed vindt voor vier spelers. Zulke nuances maken het verschil tussen een mooie lijst en een bruikbare lijst.`
        ]
      },
      {
        title: 'Laat je werkelijke speelgroep mee bepalen',
        paragraphs: [
          `Een verzameling is persoonlijk, maar een spelavond is sociaal. Wat jij graag speelt, is niet altijd wat vandaag het beste past bij de groep. Daarom is het handig om je lijst praktisch te maken: sommige spellen geef je meer zichtbaarheid, andere laat je even achterwege.`,
          `Door zo te werken, hou je meer rust. Je hoeft niet je hele verzameling perfect te maken voordat je iets kunt organiseren. Je hebt gewoon een bruikbare lijst voor deze groep, deze avond en deze afspraak.`
        ]
      },
      {
        title: 'Gebruik je verzameling als voorbereiding op spelkeuze',
        paragraphs: [
          `Een goed bijgehouden verzameling betaalt zich vooral uit voordat de avond begint. Als je later met een groep wilt stemmen of scoren, wil je niet nog eerst de juiste titels verzamelen. Idealiter heb je dan al een bruikbare shortlist klaar. Dat scheelt tijd, voorkomt discussies over irrelevante spellen en maakt de uiteindelijke keuze eerlijker omdat iedereen naar dezelfde kanshebbers kijkt.`,
          `Dat is ook waarom je spellen beheren geen losstaand klusje is. Het is voorbereiding op een betere ervaring voor je groep. Minder zoeken, minder ruis en meer aandacht voor wat je echt wilt spelen.`
        ]
      }
    ],
    faqs: [
      {
        question: 'Kan ik mijn eigen spellenverzameling gebruiken voor spelavonden?',
        answer:
          'Ja. Het werkt het best als je je verzameling ordent in bruikbare groepen en filters. Een lange ruwe lijst is vaak te breed om meteen mee te kiezen.'
      },
      {
        question: 'Wat is het voordeel van eigen groepen maken?',
        answer:
          'Eigen groepen laten je denken vanuit je spelgroep. Je kunt sneller filteren op situaties zoals 2 spelers, weekavond, makkelijke uitleg of favorieten.'
      },
      {
        question: 'Moet mijn spellenlijst volledig zijn?',
        answer:
          'Nee. Voor organiseren is een bruikbare lijst belangrijker dan een perfecte lijst. Je kunt spellen verbergen, anders groeperen of alleen tonen wat past bij je groep.'
      },
      {
        question: 'Hoe beheer je een grote spellenverzameling zonder chaos?',
        answer:
          'Werk met duidelijke groepen en simpele filters. Korte spellen, 2 spelers, favorieten en makkelijk uit te leggen zijn vaak nuttiger dan ingewikkelde categorieen.'
      },
      {
        question: 'Welke info is het belangrijkst bij je spellen beheren?',
        answer:
          'Spelduur, spelersaantal, moeilijkheid en je eigen labels geven meestal het meeste praktische voordeel bij het voorbereiden van spelavonden.'
      },
      {
        question: 'Wanneer is handmatig toevoegen nog zinvol?',
        answer:
          'Als je spellen mist, eigen categorieen wilt gebruiken of bewust een aangepaste lijst wilt tonen aan je groep.'
      }
    ],
    heroCardClassName: 'page-card-sky',
    primaryCtaLabel: 'Beheer je spellen in de app',
    primaryCtaHref: '/sign-in',
    secondaryCtaLabel: 'Ga naar de startpagina',
    secondaryCtaHref: '/',
    ctaTitle: 'Maak van je verzameling een hulpmiddel',
    ctaDescription:
      'Groepeer je bordspellen op jouw manier en vertrek voor elke spelavond vanuit een lijst die echt bij de groep past.',
    homeCardTitle: 'Bordspellenverzameling beheren',
    homeCardDescription:
      'Maak van je verzameling gezelschapsspellen een handige lijst voor je volgende bordspelavond.',
    homeCardEyebrow: 'Gids',
    homeCardImageSrc: '/marketing/collectie.png',
    homeCardImageAlt: 'Bordspellenverzameling met verschillende spelgroepen in de app.',
    homeLinkText: 'Lees hoe je je bordspellenverzameling makkelijker beheert'
  },
  spelavondMetVriendenOrganiseren: {
    path: '/spelavond-met-vrienden-organiseren',
    seoTitle: 'Spelavond met vrienden organiseren zonder keuzestress',
    metaDescription:
      'Lees hoe je een spelavond met vrienden organiseert: verwachtingen afstemmen, beschikbaarheid verzamelen, spellen kiezen en details delen zonder chaos.',
    eyebrow: 'Organiseren',
    title: 'Spelavond met vrienden organiseren zonder keuzestress',
    description:
      'Een gezellige spelavond ontstaat niet vanzelf uit een groepschat. Als je verwachtingen, planning en spelkeuze slim opbouwt, voelt de organisatie lichter en krijgt de groep sneller zin om echt samen te spelen.',
    intro: [
      `Een spelavond met vrienden organiseren lijkt simpel, maar loopt vaak vast op kleine keuzes. Iemand heeft zin in een zware strategy game, iemand anders komt laat van het werk, een derde wil vooral iets luchtigs spelen en ondertussen is nog niet duidelijk wie eten regelt of wanneer iedereen er kan zijn. Het zijn niet grote problemen, maar samen maken ze de avond stroef nog voor die begonnen is.`,
      `De oplossing zit zelden in nog meer discussieren. Wat helpt, is een volgorde waarin je eerst verwachtingen scherp zet, dan beschikbaarheid verzamelt en pas daarna naar concrete spellen en praktische details gaat. Zo hoeft niemand alles tegelijk te beslissen. Voor vriendengroepen is dat meestal het verschil tussen een avond die blijft zweven en een avond die echt in de agenda landt.`
    ],
    highlights: [
      `Zet eerst neer wat voor soort avond je wilt organiseren: sociaal, competitief, lang of juist laagdrempelig.`,
      `Laat vrienden reageren op dezelfde datumopties en dezelfde spellenlijst, zodat keuzes vergelijkbaar blijven.`,
      `Gebruik extra vragen voor eten, locatie of materiaal zodat praktische details niet versnipperen.`,
      `Verklein keuzestress door op het juiste moment te stemmen in plaats van alles open te laten.`
    ],
    screenshots: [
      {
        src: '/marketing/planning.png',
        alt: 'Beschikbaarheidsplanning voor een spelavond met meerdere deelnemers.',
        caption: 'Beschikbaarheid eerst centraal verzamelen voorkomt dat de planning blijft hangen in losse chatreacties.'
      },
      {
        src: '/marketing/score.png',
        alt: 'Spelkeuze laten scoren door deelnemers van een spelavond.',
        caption: 'Een simpele scorelijst geeft vrienden inspraak zonder dat de groep moet verzanden in eindeloze discussie.'
      },
      {
        src: '/marketing/frieten.png',
        alt: 'Extra vraag over eten tijdens een spelavond.',
        caption: 'Praktische details zoals eten of wie iets meebrengt kun je beter mee organiseren dan apart in een chat lossen.',
        imageClassName: 'object-left-top'
      }
    ],
    sections: [
      {
        title: 'Bepaal eerst wat voor avond je wilt',
        paragraphs: [
          `Niet elke spelavond heeft hetzelfde doel. Soms wil je vooral gezellig bijpraten en past een luchtig spel beter. Soms wil je eindelijk die langere titel op tafel krijgen waarvoor iedereen focus moet meebrengen. Door dat vooraf helder te maken, geef je de groep context. Mensen reageren dan niet alleen op een datum, maar ook op een verwachting. Dat helpt enorm bij beschikbaarheid, spelkeuze en zelfs de starttijd.`,
          `Voor vriendengroepen is die verwachting vaak belangrijker dan de exacte titel. Als iemand weet dat het een losse, korte avond wordt, zal die persoon minder snel afhaken omdat een bepaald spel niet favoriet is. Omgekeerd geldt hetzelfde voor een fanatiekere groep. Een duidelijke insteek schept vertrouwen: mensen weten waarvoor ze ja zeggen.`
        ]
      },
      {
        title: 'Verzamel beschikbaarheid vroeg en op een plek',
        paragraphs: [
          `Een spelavond met vrienden organiseren lukt het best als je beschikbaarheid niet versnippert. Zodra reacties verspreid zitten over verschillende momenten in een chat, moet jij alles onthouden of samenvatten. Dat kost energie en vergroot de kans op fouten. Beter is om iedereen expliciet op dezelfde datumopties te laten reageren, zodat het overzicht vanzelf ontstaat.`,
          `Timing speelt ook mee. Wacht je te lang, dan lopen agenda's vol en wordt plannen moeilijker. Vraag je te vroeg zonder context, dan vergeten mensen te antwoorden. Een concreet voorstel met datumopties en een beknopte omschrijving van de avond werkt meestal het best. Je maakt reageren klein en duidelijk, en precies dat verhoogt de kans dat mensen echt invullen.`
        ]
      },
      {
        title: 'Maak spelkeuze eerlijker en lichter',
        paragraphs: [
          `Veel vriendengroepen verliezen tijd doordat spelkeuze voelt als een discussie die gewonnen moet worden. De luidste stem of degene met de grootste kast bepaalt dan al snel wat er gebeurt. Dat hoeft niet. Door vooraf een shortlist te tonen en mensen die spellen te laten scoren, geef je iedereen dezelfde kans om voorkeuren uit te spreken zonder dat een chatgesprek uit de hand loopt.`,
          `Zo'n aanpak is vooral prettig bij gemengde groepen. Ervaren spelers kunnen aangeven waar ze echt zin in hebben, terwijl minder ervaren spelers ook veilig kunnen tonen welke titels toegankelijker voelen. Het resultaat is vaak niet het theoretisch beste spel, maar wel een keuze waar de groep achter staat. Dat is voor de sfeer van de avond meestal belangrijker.`
        ],
        bullets: [
          `Beperk de shortlist tot spellen die echt passen bij spelersaantal en tijd.`,
          `Laat deelnemers liever scoren dan alleen een favoriet roepen.`,
          `Zet een gekozen spel vast zodra er voldoende draagvlak is, zodat de rust terugkeert.`
        ]
      },
      {
        title: 'Voorkom keuzestress door details mee te nemen',
        paragraphs: [
          `Keuzestress ontstaat niet alleen door spellen. Vaak gaat ze net zo goed over praktische zaken: eten we eerst, wie brengt snacks mee, starten we om acht of later, is er iemand die iets moet meenemen? Als je die vragen apart behandelt, krijg je opnieuw versnippering. Door ze bij dezelfde avond te zetten, blijft de organisatie compact en voorkom je dat mensen afhaken op onduidelijkheid.`,
          `Dat betekent niet dat je van elke spelavond een projectplan moet maken. Integendeel. Het doel is net om kleine twijfels vroeg weg te nemen. Een simpele extra vraag over eten of timing kan genoeg zijn om vijf losse vervolgberichten te besparen. Voor vrienden voelt dat minder formeel dan telkens nieuwe beslisrondes te moeten openen.`
        ],
        exampleTitle: 'Praktisch voorbeeld',
        exampleBody: [
          `Vraag naast de datumopties ook meteen: "Eerst eten?" of "Wie kan een extra spel meenemen?"`,
          `Zo blijven kleine afspraken gekoppeld aan dezelfde avond en moet niemand later nog terugzoeken wat precies beslist was.`
        ]
      },
      {
        title: 'Stuur een uitnodiging waar mensen echt iets mee kunnen',
        paragraphs: [
          `Een goede uitnodiging voor vrienden bevat genoeg informatie om meteen te beslissen. Dat betekent: datumopties of vaste datum, startuur, locatie, en kort wat er al bekend is over spelkeuze of extra afspraken. Niet elke uitnodiging hoeft lang te zijn, maar ze moet wel bruikbaar zijn. Hoe completer de context, hoe kleiner de kans op vage antwoorden als "ik denk van wel".`,
          `De beste uitnodiging voelt ook niet als administratief gedoe. Ze maakt het juist makkelijk om ja te zeggen. Als mensen zien dat de organisator alles overzichtelijk heeft klaargezet, reageren ze sneller omdat het weinig moeite kost. Dat is een onderschat voordeel: niet alleen jij wint tijd, ook je vrienden hoeven minder na te denken over hoe ze moeten antwoorden.`
        ]
      },
      {
        title: 'Gebruik de avond zelf als input voor de volgende keer',
        paragraphs: [
          `Een spelavond organiseren stopt niet zodra iedereen aan tafel zit. Let na afloop ook op wat de groep prettig vond. Was de gekozen starttijd goed? Werkte het scoresysteem? Waren er te veel spellen op de shortlist of net te weinig? Zulke kleine observaties maken de volgende organisatiebeurt veel makkelijker, omdat je niet telkens vanaf nul hoeft te beginnen.`,
          `Voor vaste vriendengroepen bouw je zo een ritme op. Niet in de zin van strakke regels, maar in de zin van minder frictie. Mensen weten wat ze kunnen verwachten, reageren sneller en voelen dat de avond goed voorbereid is. Daardoor verschuift de aandacht opnieuw naar wat echt telt: samen spelen, lachen, ontdekken en niet blijven hangen in losse regelzaken.`
        ]
      }
    ],
    faqs: [
      {
        question: 'Hoe organiseer je een spelavond met vrienden zonder chaos?',
        answer:
          'Werk in volgorde: bepaal het type avond, verzamel beschikbaarheid, beperk de spellenlijst en zet praktische vragen bij dezelfde spelavond.'
      },
      {
        question: 'Hoe kies je een spel voor meerdere vrienden met verschillende smaken?',
        answer:
          'Maak een shortlist die past bij tijd en spelersaantal en laat iedereen die spellen scoren. Dat geeft inspraak zonder lange discussie.'
      },
      {
        question: 'Hoe voorkom je keuzestress bij spelavonden?',
        answer:
          'Beperk het aantal keuzes per stap. Eerst datum, dan spellen, dan details. Als alles tegelijk openstaat, vertraagt de groep vanzelf.'
      },
      {
        question: 'Moet je eten en praktische afspraken apart regelen?',
        answer:
          'Liever niet. Kleine extra vragen over eten, locatie of materiaal kun je beter meteen aan dezelfde avond koppelen.'
      },
      {
        question: 'Wanneer stuur je de uitnodiging best uit?',
        answer:
          `Vroeg genoeg om agenda's vrij te houden, maar concreet genoeg om op te reageren. Een paar duidelijke datumopties werkt meestal beter dan een heel open vraag.`
      },
      {
        question: 'Kan een app helpen als de groep vooral via chat communiceert?',
        answer:
          'Ja. Een vaste plek voor planning en spelkeuze voorkomt dat reacties verloren gaan tussen andere berichten en maakt beslissen voor iedereen lichter.'
      }
    ],
    heroCardClassName: 'page-card-peach',
    primaryCtaLabel: 'Organiseer je volgende spelavond',
    primaryCtaHref: '/sign-in',
    secondaryCtaLabel: 'Bekijk de startpagina',
    secondaryCtaHref: '/',
    ctaTitle: 'Maak organiseren weer gezellig',
    ctaDescription:
      'Gebruik een rustige aanpak voor datum, spelkeuze en praktische vragen, zodat jij minder hoeft te coordineren en je vrienden sneller kunnen aanhaken.',
    homeCardTitle: 'Spelavond met vrienden organiseren',
    homeCardDescription:
      'Een normale aanpak voor datum, spelkeuze, eten en uitnodigingen, zonder dat jij alles hoeft te blijven najagen.',
    homeCardEyebrow: 'Gids',
    homeCardImageSrc: '/marketing/delen.png',
    homeCardImageAlt: 'Uitnodiging voor een spelavond delen met vrienden.',
    homeLinkText: 'Lees hoe je een spelavond met vrienden organiseert'
  }
} satisfies Record<string, LandingPageContent>;

export const landingPageCards = Object.values(landingPages).map((page) => ({
  path: page.path,
  eyebrow: page.homeCardEyebrow,
  title: page.homeCardTitle,
  description: page.homeCardDescription,
  imageSrc: page.homeCardImageSrc,
  imageAlt: page.homeCardImageAlt,
  linkText: page.homeLinkText
}));
