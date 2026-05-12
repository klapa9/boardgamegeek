import { redirect } from 'next/navigation';

export default function AddSessionGamesPage({ params }: { params: { id: string } }) {
  redirect(`/s/${params.id}`);
}
