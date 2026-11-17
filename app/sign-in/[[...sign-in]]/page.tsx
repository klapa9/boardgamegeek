import Image from 'next/image';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { ArrowLeft } from 'lucide-react';
import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Inloggen',
  description: 'Log in op My Games van Vermeulen Games om je spelavonden en collectie te beheren.',
  index: false
});

export default function SignInPage() {
  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl min-w-0 items-center px-4 py-8">
        <div className="w-full min-w-0">
          <section className="page-card page-card-sky w-full min-w-0 overflow-hidden p-4 md:p-6">
            <Link
              href="/"
              className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft size={16} className="shrink-0" />
              Terug naar start
            </Link>

            <div className="mt-5 flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:text-left">
              <Image
                src="/branding/vermeulen-games-mark.png"
                alt="Logo van Vermeulen Games"
                width={512}
                height={512}
                priority
                className="h-[88px] w-[88px] shrink-0 rounded-full border-2 border-slate-950 sm:h-[104px] sm:w-[104px]"
              />
              <div>
                <h1 className="font-poster text-[clamp(1.8rem,7vw,3.1rem)] leading-[0.95] text-slate-950">Inloggen bij My Games</h1>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                  Plan je spelavonden en beheer je collectie. Je vrienden hebben geen account nodig.
                </p>
              </div>
            </div>

            <div className="mt-5 w-full min-w-0 overflow-hidden rounded-[1.6rem] border-2 border-slate-950 bg-white/85 p-3 md:p-4">
              <SignIn
                path="/sign-in"
                routing="path"
                fallbackRedirectUrl="/"
                appearance={{
                  elements: {
                    rootBox: 'mx-auto flex !w-full !max-w-full !min-w-0 justify-center',
                    cardBox: '!w-full !max-w-full !min-w-0',
                    card: '!w-full !max-w-full !min-w-0 bg-transparent shadow-none',
                    main: '!w-full !max-w-full !min-w-0',
                    footer: '!w-full !max-w-full !min-w-0',
                    form: '!w-full !max-w-full !min-w-0',
                    formContainer: '!w-full !max-w-full !min-w-0',
                    formFieldRow: '!w-full !max-w-full !min-w-0',
                    formField: '!w-full !max-w-full !min-w-0',
                    formFieldInput: '!w-full !max-w-full !min-w-0',
                    headerTitle: 'break-words',
                    headerSubtitle: 'break-words',
                    socialButtonsRoot: '!w-full !max-w-full !min-w-0',
                    socialButtons: '!w-full !max-w-full !min-w-0',
                    socialButtonsBlockButton: '!w-full !max-w-full h-auto whitespace-normal break-words py-3',
                    socialButtonsBlockButtonText: 'whitespace-normal break-words text-center',
                    formButtonPrimary: '!w-full !max-w-full h-auto whitespace-normal break-words py-3',
                    formFieldLabel: 'break-words',
                    footerActionText: 'break-words',
                    footerActionLink: 'break-words',
                    identityPreviewText: 'break-words',
                    formResendCodeLink: 'break-words',
                    otpCodeFieldInputs: '!w-full !max-w-full !min-w-0',
                    otpCodeFieldInput: 'min-w-0'
                  }
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
