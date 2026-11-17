import Image from 'next/image';
import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import ProfileLauncher from '@/components/ProfileLauncher';
import { siteConfig } from '@/lib/seo';

const navLinkClassName =
  'inline-flex min-h-[2.75rem] items-center rounded-full px-3 py-2 text-cream transition hover:bg-white/10 sm:px-4';

export default function SiteHeader() {
  return (
    <header className="border-b-2 border-slate-950 bg-navy text-cream">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-full pr-2" aria-label="My Games, naar de startpagina">
          <Image
            src="/branding/vermeulen-games-mark.png"
            alt=""
            width={44}
            height={44}
            priority
            className="h-11 w-11 rounded-full border-2 border-sun object-cover"
          />
          <span className="leading-tight">
            <span className="block font-display text-xl font-extrabold">My Games</span>
            <span className="block text-xs font-semibold text-cream/80">door Vermeulen Games</span>
          </span>
        </Link>

        <nav aria-label="Hoofdnavigatie" className="flex flex-wrap items-center gap-1 text-sm font-bold">
          <SignedIn>
            <Link href="/spelavonden" className={navLinkClassName}>
              Spelavonden
            </Link>
            <Link href="/collectie" className={navLinkClassName}>
              Collectie
            </Link>
            <ProfileLauncher />
          </SignedIn>
          <SignedOut>
            <a href={siteConfig.mainSiteUrl} className={`${navLinkClassName} hidden sm:inline-flex`}>
              vermeulengames.com
            </a>
            <Link
              href="/sign-in"
              className="inline-flex min-h-[2.75rem] items-center rounded-full bg-sun px-5 py-2 font-extrabold text-navy transition hover:bg-sun-300"
            >
              Inloggen
            </Link>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
}
