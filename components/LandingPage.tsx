import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Home } from 'lucide-react';
import type { LandingPageContent } from '@/lib/landing-pages';

type LandingPageProps = {
  page: LandingPageContent;
};

export default function LandingPage({ page }: LandingPageProps) {
  const heroScreenshot = page.screenshots[0];

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-16">
        <header className={`page-card overflow-hidden ${page.heroCardClassName}`}>
          <div className="page-band px-5 py-4 sm:px-6">
            <Link href="/" className="neo-button neo-button-ghost text-sm">
              <Home size={16} />
              Terug naar start
            </Link>
          </div>

          <div className="grid gap-6 px-5 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className="page-chip w-fit">{page.eyebrow}</p>
              <h1 className="mt-4 font-poster text-[clamp(2.2rem,8vw,4.5rem)] uppercase leading-[0.92] text-slate-950">
                {page.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
                {page.description}
              </p>

              <div className="mt-5 space-y-4">
                {page.intro.map((paragraph) => (
                  <p key={paragraph} className="max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href={page.primaryCtaHref} className="neo-button neo-button-primary">
                  {page.primaryCtaLabel}
                  <ArrowRight size={18} />
                </Link>
                <Link href={page.secondaryCtaHref} className="neo-button neo-button-secondary">
                  {page.secondaryCtaLabel}
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {page.highlights.map((highlight) => (
                  <div key={highlight} className="page-subcard flex items-start gap-3 p-4">
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-700" />
                    <p className="text-sm leading-6 text-slate-700">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="page-subcard overflow-hidden">
              <div className="relative aspect-[4/3]">
                <Image
                  src={heroScreenshot.src}
                  alt={heroScreenshot.alt}
                  fill
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  className={`object-cover ${heroScreenshot.imageClassName ?? 'object-top'}`}
                />
              </div>
              <div className="border-t-2 border-slate-950/10 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Voorbeeld uit de app</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{heroScreenshot.caption}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="page-card p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="page-chip w-fit">Screenshots en voorbeelden</p>
              <h2 className="mt-4 font-poster text-[clamp(1.8rem,6vw,3rem)] uppercase leading-[0.94] text-slate-950">
                Zo ziet de aanpak er in de praktijk uit.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-700">
              Elke pagina hieronder gebruikt voorbeelden uit dezelfde appflow, zodat je meteen ziet hoe planning,
              verzameling en spelkeuze op elkaar aansluiten.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {page.screenshots.map((screenshot) => (
              <article key={screenshot.src} className="page-subcard overflow-hidden">
                <div className="relative aspect-[16/10]">
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    fill
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className={`object-cover ${screenshot.imageClassName ?? 'object-top'}`}
                  />
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm leading-6 text-slate-700">{screenshot.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          {page.sections.map((section) => (
            <article key={section.title} className="page-card p-5 sm:p-6">
              <h2 className="font-poster text-[clamp(1.7rem,6vw,2.8rem)] uppercase leading-[0.94] text-slate-950">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-700 sm:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>

              {section.bullets?.length ? (
                <div className="mt-5 grid gap-3">
                  {section.bullets.map((bullet) => (
                    <div key={bullet} className="page-subcard flex items-start gap-3 p-4">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-slate-950" />
                      <p className="text-sm leading-6 text-slate-700">{bullet}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {section.exampleTitle && section.exampleBody?.length ? (
                <div className="mt-5 rounded-[1.5rem] border-2 border-slate-950 bg-[#172036] px-4 py-4 text-[#fff7df] shadow-[0_8px_0_rgba(15,23,42,0.2)]">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#84d7ff]">{section.exampleTitle}</p>
                  <div className="mt-3 space-y-3">
                    {section.exampleBody.map((item) => (
                      <p key={item} className="text-sm leading-6 text-[#fff7df]/90">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </section>

        <section className="page-card-dark px-5 py-6 sm:px-6 sm:py-7">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#84d7ff]">Klaar om dit toe te passen?</p>
          <h2 className="mt-3 font-poster text-[clamp(2rem,7vw,3.4rem)] uppercase leading-[0.94] text-[#fff7df]">
            {page.ctaTitle}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#fff7df]/88 sm:text-base">
            {page.ctaDescription}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={page.primaryCtaHref} className="neo-button neo-button-primary">
              {page.primaryCtaLabel}
              <ArrowRight size={18} />
            </Link>
            <Link href={page.secondaryCtaHref} className="neo-button neo-button-lime">
              {page.secondaryCtaLabel}
            </Link>
          </div>
        </section>

        <section className="page-card p-5 sm:p-6">
          <p className="page-chip w-fit">FAQ</p>
          <h2 className="mt-4 font-poster text-[clamp(1.8rem,6vw,3rem)] uppercase leading-[0.94] text-slate-950">
            Veelgestelde vragen
          </h2>
          <div className="mt-5 space-y-3">
            {page.faqs.map((faq) => (
              <details key={faq.question} className="page-subcard group px-4 py-4">
                <summary className="cursor-pointer list-none pr-6 text-base font-black leading-6 text-slate-950 marker:hidden">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-700">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
