import { siteConfig } from '@/lib/seo';

const footerLinks = [
  { label: 'vermeulengames.com', href: siteConfig.mainSiteUrl },
  { label: 'Over Vermeulen Games', href: `${siteConfig.mainSiteUrl}/about` },
  { label: 'Contact', href: `${siteConfig.mainSiteUrl}/contact` }
];

export default function SiteFooter() {
  return (
    <footer className="border-t-2 border-slate-950 bg-navy text-cream">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-display text-lg font-extrabold">Vermeulen Games</p>
          <p className="mt-1 text-cream/80">My Games is de spelavond-tool van Vermeulen Games. Speel elkaar uit.</p>
        </div>
        <nav aria-label="Vermeulen Games" className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
          {footerLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-cream/90 underline-offset-4 hover:text-sun hover:underline">
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
