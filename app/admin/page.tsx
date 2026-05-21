import { redirect } from 'next/navigation';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata;

export default function AdminPage() {
  redirect('/admin/feedback');
}
