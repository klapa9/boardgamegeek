import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  CircleAlert,
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

const marketingFeatures: MarketingFeature[] = [
  {
    eyebrow: 'Verzameling',
    title: 'Orden je bordspellen in handige groepen',
    description:
      'Maak eigen lijsten zoals favorieten, korte spellen of 2 spelers zodat je sneller iets vindt voor de avond.',
    imageSrc: '/marketing/collectie.png',
    imageAlt: 'Overzicht van een bordspellenverzameling met verschillende spelgroepen.',
    accentClassName: 'from-[#ffd8cb] via-[#fff7df] to-white',
    chipClassName: 'bg-[#ffe6de] text-[#8e341c]',
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
    accentClassName: 'from-[#efffb4] via-[#fff7df] to-white',
    chipClassName: 'bg-[#f5ffc8] text-[#476007]',
    Icon: CalendarDays
  },
  {
    eyebrow: 'Spelkeuze',
    title: 'Laat iedereen op voorhand spellen scoren',
    description:
      'Geef kandidaatspellen vooraf een score zodat jullie sneller kiezen wat er vanavond op tafel komt.',
    imageSrc: '/marketing/score.png',
    imageAlt: 'Scorekaart om vooraf een bordspel te beoordelen voor de spelkeuze.',
    accentClassName: 'from-[#ffd8cb] via-[#fff7df] to-white',
    chipClassName: 'bg-[#ffe6de] text-[#8e341c]',
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
    accentClassName: 'from-[#ffe1d6] via-[#fff7df] to-white',
    chipClassName: 'bg-[#fff0d5] text-[#8a4c08]',
    Icon: UtensilsCrossed
  },
  {
    eyebrow: 'Delen',
    title: 'Stuur meteen een duidelijke uitnodiging',
    description:
      'Maak een deelbericht klaar, deel via jouw favoriete platform. Laat anderen deelnemen zonder in te loggen.',
    imageSrc: '/marketing/delen.png',
    imageAlt: 'Deelvenster voor een spelavond met een automatisch bericht.',
    accentClassName: 'from-[#cdeeff] via-[#fff7df] to-white',
    chipClassName: 'bg-[#ddf4ff] text-[#0f4f6c]',
    Icon: MessageSquareText
  },
  {
    eyebrow: 'Gratis',
    title: 'Alles gratis, zonder reclame',
    description:
      'Geen advertenties, geen betaalmuur en geen verborgen upsells. Gewoon een handige tool voor je spelavonden.',
    accentClassName: 'from-[#d8ff63] via-[#fff7df] to-white',
    chipClassName: 'bg-[#efffb8] text-[#466400]',
    visualTitle: '100% gratis',
    visualDetail: 'zonder reclame of betaalmuur',
    Icon: Gift
  }
];

export default async function HomePage() {
  const { userId } = await auth();
  const isAdmin = userId ? await isCurrentUserAdmin(userId) : false;
  const signInHref = '/sign-in';
  const structuredData = JSON.stringify(getHomeStructuredData());
  const marqueeItems = userId
    ? Array.from({ length: 8 }, () => 'boardgamecrew.nl')
    : [
        'boardgamecrew.nl',
        'plan samen',
        'stem op spellen',
        'kies je datum',
        'speel sneller',
        'boardgamecrew.nl',
        'plan samen',
        'stem op spellen'
      ];

  return (
    <main className="home-noise min-h-screen overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-4rem] top-24 h-40 w-40 rounded-full bg-[#ff5a36]/20 blur-3xl" />
        <div className="absolute right-[-3rem] top-56 h-48 w-48 rounded-full bg-[#84d7ff]/30 blur-3xl" />
        <div className="absolute bottom-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[#d8ff63]/20 blur-3xl" />
      </div>

      <div className="border-b-4 border-slate-950 bg-[#172036] py-3 text-[#fff7df]">
        <div className="mx-auto flex max-w-6xl min-w-0 items-center gap-3 px-4 sm:px-6">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="home-marquee flex min-w-max gap-6 whitespace-nowrap font-poster text-base uppercase tracking-[0.18em] sm:text-lg sm:tracking-[0.2em]">
              {marqueeItems.map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3.75rem)] w-full max-w-6xl min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-[#5c428a] px-4 py-6 text-[#fff7df] shadow-[0_18px_50px_rgba(23,32,54,0.18)] sm:px-6 sm:py-7">
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="shrink-0 rounded-[1.8rem] border-4 border-slate-950 bg-white/10 p-3 shadow-[0_12px_0_0_rgba(23,32,54,0.2)]">
              <Image
                src="/branding/boardgamecrew-mark.png"
                alt="BoardgameCrew logo"
                width={308}
                height={335}
                priority
                className="h-auto w-[110px] sm:w-[128px]"
              />
            </div>
            <div>
              <p className="font-poster text-[clamp(2rem,8vw,4rem)] leading-[0.9] text-white">boardgamecrew</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#fff7df]/88 sm:text-base">
                de beste tool om je spelavonden te organiseren.
              </p>
            </div>
          </div>
        </section>

        {userId ? (
          <>
            <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-[rgba(255,247,223,0.92)] shadow-[0_24px_80px_rgba(23,32,54,0.18)]">
              <div className="border-b-4 border-dashed border-slate-950 bg-[#fff2bd] px-4 py-3 sm:px-6">
                <div className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-slate-950 bg-white px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-700 sm:text-xs sm:tracking-[0.18em]">
                  <CircleAlert size={16} />
                  <span>ingelogd</span>
                </div>
              </div>

              <div className="px-4 py-5 sm:px-6 sm:py-8">
                <div className="max-w-3xl">
                  <h1 className="mt-4 font-poster text-[clamp(2.2rem,10vw,4.4rem)] uppercase leading-[0.92] text-slate-950">
                    Kies je
                    <br />
                    volgende zet.
                  </h1>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href="/spelavond?nieuw=1"
                      className="inline-flex items-center justify-center rounded-[1.4rem] border-4 border-slate-950 bg-[#ff5a36] px-5 py-3 text-center font-poster text-xl uppercase text-white transition hover:translate-y-[-2px] hover:bg-[#ff6d4d]"
                    >
                      Maak een nieuwe spelavond
                    </Link>
                    <Link
                      href="/collectie"
                      className="inline-flex items-center justify-center rounded-[1.4rem] border-4 border-slate-950 bg-[#84d7ff] px-5 py-3 text-center font-poster text-xl uppercase text-slate-950 transition hover:translate-y-[-2px]"
                    >
                      Mijn collectie
                    </Link>
                    <Link
                      href="/spelavonden"
                      className="inline-flex items-center justify-center rounded-[1.4rem] border-4 border-slate-950 bg-[#d8ff63] px-5 py-3 text-center font-poster text-xl uppercase text-slate-950 transition hover:translate-y-[-2px]"
                    >
                      Mijn spelavonden
                    </Link>
                    {isAdmin ? (
                      <Link
                        href="/admin/feedback"
                        className="inline-flex items-center justify-center rounded-[1.4rem] border-4 border-slate-950 bg-white px-5 py-3 text-center font-poster text-xl uppercase text-slate-950 transition hover:translate-y-[-2px]"
                      >
                        Admin feedback
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <FeedbackRequestForm isAdmin={isAdmin} />
          </>
        ) : (
          <>
            <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-[rgba(255,247,223,0.92)] shadow-[0_24px_80px_rgba(23,32,54,0.16)]">
              <div className="page-band px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="page-chip w-fit">Voor bordspellen</p>
                    <h1 className="mt-4 font-poster text-[clamp(2rem,8vw,3.7rem)] uppercase leading-[0.94] text-slate-950">
                      Plan gemakkelijk bordspelavonden.
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
                      boardgamecrew helpt je om data te prikken, vooraf te stemmen op spellen en je verzameling overzichtelijk te houden op een plek.
                    </p>
                  </div>

                  <Link
                    href={signInHref}
                    className="inline-flex items-center justify-center gap-2 rounded-[1.3rem] border-2 border-slate-950 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:translate-y-[-2px] hover:bg-[#fff7df]"
                  >
                    <span>Ga naar login</span>
                    <ArrowRight size={16} className="shrink-0" />
                  </Link>
                </div>
              </div>

              <div className="px-4 py-5 sm:px-6 sm:py-6">
                <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {marketingFeatures.map((feature) => {
                    const FeatureIcon = feature.Icon;

                    return (
                      <Link
                        key={feature.title}
                        href={signInHref}
                        aria-label={`${feature.title} - ga naar login`}
                        className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.8rem] border-4 border-slate-950 bg-white shadow-[0_12px_0_0_rgba(23,32,54,0.12)] transition hover:translate-y-[-4px]"
                      >
                        <div
                          className={`relative aspect-[16/10] overflow-hidden border-b-4 border-slate-950 bg-gradient-to-br ${feature.accentClassName}`}
                        >
                          <div
                            className={`absolute right-4 top-4 z-10 inline-flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full px-3 py-1.5 text-[0.7rem] font-black uppercase tracking-[0.16em] ${feature.chipClassName}`}
                          >
                            <FeatureIcon size={16} className="shrink-0" />
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
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.8),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(23,32,54,0.08),transparent_38%)]" />
                              <div className="relative w-full rounded-[1.5rem] border-2 border-slate-950/10 bg-white/80 p-4 shadow-[0_8px_0_rgba(23,32,54,0.08)] backdrop-blur-sm">
                                <p className="font-poster text-3xl uppercase leading-none text-slate-950 sm:text-4xl">
                                  {feature.visualTitle}
                                </p>
                                <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700 sm:text-sm">
                                  {feature.visualDetail}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col px-5 py-5">
                          <h3 className="text-2xl font-black leading-tight text-slate-950">{feature.title}</h3>
                          <p className="mt-3 flex-1 text-sm leading-6 text-slate-700">{feature.description}</p>
                          <div className="mt-4 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-slate-950">
                            <span>Log in om dit te gebruiken</span>
                            <ArrowRight size={16} className="shrink-0 transition group-hover:translate-x-1" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-[#172036] px-5 py-6 text-[#fff7df] shadow-[0_18px_50px_rgba(23,32,54,0.14)] sm:px-6 sm:py-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#84d7ff]">Klaar om te beginnen?</p>
                  <h2 className="mt-3 font-poster text-[clamp(2rem,8vw,3.5rem)] uppercase leading-[0.94] text-[#fff7df]">
                    Log in en start je volgende spelavond.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#fff7df]/85 sm:text-base">
                    Organiseer je spelavonden, beheer je spellen en plan samen met vrienden.
                  </p>
                </div>

                <Link
                  href={signInHref}
                  className="inline-flex min-h-[3.8rem] items-center justify-center gap-3 rounded-[1.7rem] border-4 border-slate-950 bg-[#ff5a36] px-6 py-3 text-center font-poster text-xl uppercase text-white shadow-[0_10px_0_0_rgba(132,215,255,0.55)] transition hover:translate-y-[-3px] hover:bg-[#ff6d4d]"
                >
                  <LogIn size={22} className="shrink-0" />
                  <span>Naar login</span>
                </Link>
              </div>
            </section>

            <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-[rgba(255,247,223,0.92)] px-5 py-6 shadow-[0_18px_50px_rgba(23,32,54,0.12)] sm:px-6 sm:py-7">
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="max-w-3xl">
                  <p className="page-chip w-fit">Zo werkt het</p>
                  <h2 className="mt-4 font-poster text-[clamp(1.9rem,7vw,3.2rem)] uppercase leading-[0.95] text-slate-950">
                    Alles bij elkaar voor je volgende spelavond.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
                    Prik een datum, laat vrienden reageren en zet een paar spellen klaar om op te stemmen. Daarna deel je gewoon een duidelijke uitnodiging.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
                    Gebruik je eigen spellenverzameling als startpunt, zodat je niet telkens titels hoeft over te typen of in je kast moet zoeken.
                  </p>
                </div>

                <div className="grid gap-3 self-start">
                  <article className="rounded-[1.5rem] border-2 border-slate-950 bg-white px-4 py-4">
                    <h3 className="text-lg font-black text-slate-950">Voor vriendengroepen en spelclubs</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Voor iedereen die regelmatig bordspelavonden organiseert en liever speelt dan planning bijhoudt in chats, lijstjes en losse polls.
                    </p>
                  </article>
                  <article className="rounded-[1.5rem] border-2 border-slate-950 bg-white px-4 py-4">
                    <h3 className="text-lg font-black text-slate-950">Minder losse berichten</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Data, spelers, spelvoorkeuren en extra afspraken staan bij dezelfde spelavond. Dat maakt terugvinden en beslissen een stuk rustiger.
                    </p>
                  </article>
                  <article className="rounded-[1.5rem] border-2 border-slate-950 bg-white px-4 py-4">
                    <h3 className="text-lg font-black text-slate-950">Je spellen staan meteen klaar</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Laad je bordspellenverzameling snel in. Daarna kies je uit je eigen spellen in plaats van alles opnieuw te zoeken.
                    </p>
                  </article>
                </div>
              </div>
            </section>
          </>
        )}

        {!userId && (
          <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-white shadow-[0_18px_50px_rgba(23,32,54,0.12)]">
            <div className="page-band px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="page-chip w-fit">Verder lezen</p>
                  <h2 className="mt-4 font-poster text-[clamp(1.9rem,7vw,3.3rem)] uppercase leading-[0.95] text-slate-950">
                    Praktische hulp voor afspreken, organiseren en spellen kiezen.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
                    Deze gidsen gaan dieper in op vragen die veel spelgroepen herkennen: een datum vinden, je bordspellen bijhouden en samen een spel kiezen.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 text-sm font-black text-slate-950">
                    {landingPageCards.map((card) => (
                      <Link
                        key={`${card.path}-text-link`}
                        href={card.path}
                        className="w-fit underline decoration-2 underline-offset-4 transition hover:text-[#ff5a36]"
                      >
                        {card.linkText}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border-2 border-slate-950 bg-[#fff7df] px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-slate-950">
                  <BookOpenText size={18} />
                  <span>Voor spelgroepen</span>
                </div>
              </div>
            </div>

            <div className="grid gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-3">
              {landingPageCards.map((card) => (
                <Link
                  key={card.path}
                  href={card.path}
                  className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.8rem] border-4 border-slate-950 bg-[rgba(255,247,223,0.92)] shadow-[0_12px_0_0_rgba(23,32,54,0.1)] transition hover:translate-y-[-4px]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden border-b-4 border-slate-950 bg-[#fff2bd]">
                    <Image
                      src={card.imageSrc}
                      alt={card.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 30vw, 100vw"
                      className="object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col px-5 py-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{card.eyebrow}</p>
                    <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">{card.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-slate-700">{card.description}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-slate-950">
                      <span>{card.linkText}</span>
                      <ArrowRight size={16} className="shrink-0 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
