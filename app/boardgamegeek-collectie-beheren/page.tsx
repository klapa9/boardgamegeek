import LandingPage from '@/components/LandingPage';
import { landingPages } from '@/lib/landing-pages';
import { createMetadata } from '@/lib/seo';

const page = landingPages.boardgamegeekCollectieBeheren;

export const metadata = createMetadata({
  title: page.seoTitle,
  description: page.metaDescription,
  path: page.path
});

export default function BoardGameGeekCollectionPage() {
  return <LandingPage page={page} />;
}
