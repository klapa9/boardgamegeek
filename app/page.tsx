import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Gift,
  LibraryBig,
  LogIn,
  MessageSquareText,
  Star,
  UtensilsCrossed,
  type LucideIcon
} from 'lucide-react';
import FeedbackRequestForm from '@/components/FeedbackRequestForm';
import { isCurrentUserAdmin } from '@/lib/admin';
import { landingPageCards } from '@/lib/landing-pages';
import { createMetadata, getHomeStructuredData } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Bordspelavond plannen en je spellenverzameling beheren',
  description:
    'Plan bordspelavonden, verzamel beschikbaarheid, laat vrienden stemmen op spellen en houd je bordspellenverzameling overzichtelijk.',
  path: '/'
});

type MarketingFeature = {
  eyebrow: string;
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  imageClassName?: string;
  accentClassName: string;
  chipClassName: string;
  visualTitle?: string;
  visualDetail?: string;
  Icon: LucideIcon;
};

const marketingFeaturesInOrder: MarketingFeature[] = [
  {
    eyebrow: 'Verzameling',
    title: 'Orden je bordspellen in handige groepen',
    description:
      'Maak eigen lijsten zoals favorieten, korte spellen of 2 spelers zodat je sneller iets vindt voor de avond.',
    imageSrc: '/marketing/collectie.png',
    imageAlt: 'Overzicht van een bordspellenverzameling met verschillende spelgroepen.',
    accentClassName: 'bg-coral-light',
    chipClassName: 'bg-white text-navy',
    Icon: LibraryBig
  },
  {
    eyebrow: 'Planning',
    title: 'Verzamel beschikbaarheid in een paar tikken',
    description:
      'Laat spelers geschikte data kiezen en zie meteen wie al reageerde en welke avonden kans maken.',
    imageSrc: '/marketing/planning.png',
    imageAlt: 'Planningsoverzicht met meerdere data en deelnemers.',
    imageClassName: 'object-left-top',
    accentClassName: 'bg-sun-100',
    chipClassName: 'bg-white text-navy',
    Icon: CalendarDays
  },
  {
    eyebrow: 'Spelkeuze',
    title: 'Laat iedereen op voorhand spellen scoren',
    description:
      'Geef kandidaatspellen vooraf een score zodat jullie sneller kiezen wat er vanavond op tafel komt.',
    imageSrc: '/marketing/score.png',
    imageAlt: 'Scorekaart om vooraf een bordspel te beoordelen voor de spelkeuze.',
    accentClassName: 'bg-sage-100',
    chipClassName: 'bg-white text-navy',
    Icon: Star
  },
  {
    eyebrow: 'Extra vragen',
    title: 'Poll meteen over eten of andere afspraken',
    description:
      'Voeg losse vragen toe aan je sessie, van frietjes vooraf tot wie nog dobbelstenen meebrengt.',
    imageSrc: '/marketing/frieten.png',
    imageAlt: 'Extra vraag in een spelavond over wie frieten wil eten.',
    imageClassName: 'object-left-top',
    accentClassName: 'bg-coral-light',
    chipClassName: 'bg-white text-navy',
    Icon: UtensilsCrossed
  },
  {
    eyebrow: 'Delen',
    title: 'Stuur meteen een duidelijke uitnodiging',
    description:
      'Maak een deelbericht klaar, deel via jouw favoriete platform. Laat anderen deelnemen zonder in te loggen.',
    imageSrc: '/marketing/delen.png',
    imageAlt: 'Deelvenster voor een spelavond met een automatisch bericht.',
    accentClassName: 'bg-sage-100',
    chipClassName: 'bg-white text-navy',
    Icon: MessageSquareText
  },
  {
    eyebrow: 'Gratis',
    title: 'Alles gratis, zonder reclame',
    description:
      'Geen advertenties, geen betaalmuur en geen verborgen upsells. Gewoon een handige tool voor je spelavonden.',
    accentClassName: 'bg-sun-100',
    chipClassName: 'bg-white text-navy',
    visualTitle: '100% gratis',
    visualDetail: 'zonder reclame of betaalmuur',
    Icon: Gift
  }
];

// Spelavonden eerst, de collectie is een ondersteunende functie.
const marketingFeatures: MarketingFeature[] = [
  ...marketingFeaturesInOrder.filter((feature) => feature.eyebrow !== 'Verzameling'),
  ...marketingFeaturesInOrder.filter((feature) => feature.eyebrow === 'Verzameling')
];

export default async function HomePage() {
  const { userId } = await auth();
  const isAdmin = userId ? await isCurrentUserAdmin(userId) : false;
  const signInHref = '/sign-in';
  const structuredData = JSON.stringify(getHomeStructuredData());
  const structuredDataScript = (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
  );

  return (
    <main className="min-h-screen overflow-hidden">
      {structuredDataScript}

      <section className="bg-navy text-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0">
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-sun">
              {userId ? 'Welkom terug' : 'Spelavonden & collectie'}
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.3rem,7vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.02em]">
              {userId ? 'Klaar voor je volgende spelavond?' : 'Van groepschat naar spelavond.'}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-cream/85">
              {userId
                ? 'Plan een nieuwe avond, kijk wie er komt of kies een spel uit je eigen collectie.'
                : 'Kies data, nodig je vrienden uit en laat iedereen stemmen op wat er gespeeld wordt. Je vrienden hebben geen account nodig.'}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {userId ? (
                <>
                  <Link
                    href="/spelavond?nieuw=1"
                    className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full bg-sun px-6 py-3 text-center text-base font-extrabold text-navy transition hover:-translate-y-0.5 hover:bg-sun-300"
                  >
                    <CalendarDays size={20} aria-hidden="true" />
                    Nieuwe spelavond
                  </Link>
                  <Link
                    href="/spelavonden"
                    className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full border-2 border-cream px-6 py-3 text-center text-base font-extrabold text-cream transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Mijn spelavonden
                  </Link>
                  <Link
                    href="/collectie"
                    className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full border-2 border-cream/60 px-6 py-3 text-center text-base font-extrabold text-cream transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Mijn collectie
                  </Link>
                  {isAdmin ? (
                    <Link
                      href="/admin/feedback"
                      className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full border-2 border-cream/60 px-6 py-3 text-center text-base font-extrabold text-cream transition hover:-translate-y-0.5 hover:bg-white/10"
                    >
                      Admin feedback
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <Link
                    href={signInHref}
                    className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full bg-sun px-6 py-3 text-center text-base font-extrabold text-navy transition hover:-translate-y-0.5 hover:bg-sun-300"
                  >
                    <LogIn size={20} aria-hidden="true" />
                    Inloggen en plannen
                  </Link>
                  <a
                    href="#zo-werkt-het"
                    className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full border-2 border-cream px-6 py-3 text-center text-base font-extrabold text-cream transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Zo werkt het
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="overflow-hidden rounded-[1.5rem] border-2 border-cream/20 bg-cream shadow-[8px_8px_0_0_#6C9A92]">
              <Image
                src="/marketing/planning.png"
                alt="Voorbeeld van een spelavond in My Games met datumopties en deelnemers."
                width={1153}
                height={406}
                priority
                className="h-auto w-full object-cover object-left-top"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="relative mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
        {userId ? (
          <FeedbackRequestForm isAdmin={isAdmin} />
        ) : (
          <>
            <section id="zo-werkt-het" className="grid gap-4 md:grid-cols-3" aria-label="Zo werkt het">
              {[
                { step: '1', title: 'Plan', text: 'Kies een of meer data, een plek en eventueel al een spel.' },
                { step: '2', title: 'Nodig uit', text: 'Deel één link. Vrienden laten weten wanneer ze kunnen en wat ze willen spelen, zonder account.' },
                { step: '3', title: 'Speel', text: 'Leg datum en spel vast. Iedereen weet waar en wanneer het begint.' }
              ].map((item) => (
                <article key={item.step} className="page-subcard flex gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage font-extrabold text-navy">
                    {item.step}
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-extrabold text-navy">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{item.text}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="w-full min-w-0">
              <div className="max-w-3xl">
                <p className="page-chip">Wat kan je ermee?</p>
                <h2 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.6rem)] font-extrabold leading-tight text-navy">
                  Alles voor je volgende spelavond, op één plek.
                </h2>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {marketingFeatures.map((feature) => {
                  const FeatureIcon = feature.Icon;

                  return (
                    <Link
                      key={feature.title}
                      href={signInHref}
                      aria-label={`${feature.title} - ga naar login`}
                      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] border-2 border-slate-950 bg-white shadow-[0_6px_0_0_#14213D] transition hover:-translate-y-1"
                    >
                      <div className={`relative aspect-[16/10] overflow-hidden border-b-2 border-slate-950 ${feature.accentClassName}`}>
                        <div
                          className={`absolute right-4 top-4 z-10 inline-flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border-2 border-slate-950 px-3 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] ${feature.chipClassName}`}
                        >
                          <FeatureIcon size={16} className="shrink-0" aria-hidden="true" />
                          <span>{feature.eyebrow}</span>
                        </div>
                        {feature.imageSrc && feature.imageAlt ? (
                          <Image
                            src={feature.imageSrc}
                            alt={feature.imageAlt}
                            fill
                            sizes="(min-width: 1280px) 30vw, (min-width: 1024px) 46vw, 100vw"
                            className={`object-cover transition duration-300 group-hover:scale-[1.02] ${feature.imageClassName ?? 'object-top'}`}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-end p-5 sm:p-6">
                            <div className="relative w-full rounded-[1rem] border-2 border-slate-950 bg-white p-4">
                              <p className="font-display text-3xl font-extrabold leading-none text-navy sm:text-4xl">
                                {feature.visualTitle}
                              </p>
                              <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-700 sm:text-sm">
                                {feature.visualDetail}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col px-5 py-5">
                        <h3 className="font-display text-2xl font-extrabold leading-tight text-navy">{feature.title}</h3>
                        <p className="mt-3 flex-1 text-sm leading-6 text-slate-700">{feature.description}</p>
                        <div className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-navy underline decoration-2 underline-offset-4">
                          <span>Log in om dit te gebruiken</span>
                          <ArrowRight size={16} className="shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="max-w-3xl">
                <p className="page-chip">Voor wie?</p>
                <h2 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.6rem)] font-extrabold leading-tight text-navy">
                  Minder plannen in chats, meer spelen aan tafel.
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  Prik een datum, laat vrienden reageren en zet een paar spellen klaar om op te stemmen. Daarna deel je gewoon een duidelijke uitnodiging.
                </p>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  Gebruik je eigen spellenverzameling als startpunt, zodat je niet telkens titels hoeft over te typen of in je kast moet zoeken.
                </p>
              </div>

              <div className="grid gap-3 self-start">
                {[
                  {
                    title: 'Voor vriendengroepen en spelclubs',
                    text: 'Voor iedereen die regelmatig spelavonden organiseert en liever speelt dan planning bijhoudt in chats, lijstjes en losse polls.'
                  },
                  {
                    title: 'Alles bij dezelfde spelavond',
                    text: 'Data, spelers, spelvoorkeuren en extra afspraken staan samen. Dat maakt terugvinden en beslissen een stuk rustiger.'
                  },
                  {
                    title: 'Gratis, zonder reclame',
                    text: 'Geen advertenties, geen betaalmuur en geen verborgen upsells. Gewoon een handige tool voor je spelavonden.'
                  }
                ].map((item) => (
                  <article key={item.title} className="page-subcard px-4 py-4">
                    <h3 className="text-lg font-extrabold text-navy">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="w-full min-w-0">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="page-chip">
                    <BookOpenText size={16} aria-hidden="true" />
                    Verder lezen
                  </p>
                  <h2 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.6rem)] font-extrabold leading-tight text-navy">
                    Praktische hulp voor afspreken, organiseren en spellen kiezen.
                  </h2>
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    Deze gidsen gaan dieper in op vragen die veel spelgroepen herkennen: een datum vinden, je bordspellen bijhouden en samen een spel kiezen.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-3">
                {landingPageCards.map((card) => (
                  <Link
                    key={card.path}
                    href={card.path}
                    className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] border-2 border-slate-950 bg-white shadow-[0_6px_0_0_#14213D] transition hover:-translate-y-1"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-slate-950 bg-sun-100">
                      <Image
                        src={card.imageSrc}
                        alt={card.imageAlt}
                        fill
                        sizes="(min-width: 1024px) 30vw, 100vw"
                        className="object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col px-5 py-5">
                      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">{card.eyebrow}</p>
                      <h3 className="mt-3 font-display text-2xl font-extrabold leading-tight text-navy">{card.title}</h3>
                      <p className="mt-3 flex-1 text-sm leading-6 text-slate-700">{card.description}</p>
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-navy">
                        <span>{card.linkText}</span>
                        <ArrowRight size={16} className="shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] border-2 border-slate-950 bg-navy px-5 py-8 text-cream shadow-[0_6px_0_0_#6C9A92] sm:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-sun">Klaar om te beginnen?</p>
                  <h2 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.6rem)] font-extrabold leading-tight">
                    Log in en plan je volgende spelavond.
                  </h2>
                  <p className="mt-3 text-base leading-7 text-cream/85">
                    Alleen de organisator heeft een account nodig. Je vrienden doen mee via de uitnodigingslink.
                  </p>
                </div>

                <Link
                  href={signInHref}
                  className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full bg-sun px-6 py-3 text-center text-base font-extrabold text-navy transition hover:-translate-y-0.5 hover:bg-sun-300"
                >
                  <LogIn size={20} aria-hidden="true" />
                  Naar login
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
