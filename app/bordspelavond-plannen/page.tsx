import LandingPage from '@/components/LandingPage';
import { landingPages } from '@/lib/landing-pages';
import { createMetadata } from '@/lib/seo';

const page = landingPages.bordspelavondPlannen;

export const metadata = createMetadata({
  title: page.seoTitle,
  description: page.metaDescription,
  path: page.path
});

export default function BoardGameNightPlanningPage() {
  return <LandingPage page={page} />;
}
