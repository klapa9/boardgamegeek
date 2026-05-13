import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
        <div className="page-card page-card-sky w-full p-6 md:p-8">
          <p className="page-chip mb-3 w-fit">Gezelschapsspelkiezer</p>
          <h1 className="font-poster text-4xl uppercase leading-none text-slate-950">Log in om verder te gaan</h1>
          <p className="mt-3 text-sm text-slate-700">
            De normale app is alleen beschikbaar voor ingelogde gebruikers. Spelavond-links blijven wel publiek bereikbaar.
          </p>
          <div className="mt-6">
            <SignIn
              path="/sign-in"
              routing="path"
              fallbackRedirectUrl="/"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
