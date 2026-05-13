import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
      <div className="w-full rounded-3xl bg-white p-6 shadow-soft md:p-8">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Gezelschapsspelkiezer</p>
        <h1 className="text-3xl font-black tracking-tight">Log in om verder te gaan</h1>
        <p className="mt-2 text-sm text-slate-600">De normale app is alleen beschikbaar voor ingelogde gebruikers. Spelavond-links blijven wel publiek bereikbaar.</p>
        <div className="mt-6">
          <SignIn
            path="/sign-in"
            routing="path"
            fallbackRedirectUrl="/"
          />
        </div>
      </div>
    </main>
  );
}
