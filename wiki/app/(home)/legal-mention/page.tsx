import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales | Wiki Alexandre LARUE",
  description: "Mentions légales du wiki d'Alexandre Larue.",
};

export default function LegalMentionPage() {
  return (
    <main className="min-h-screen w-full px-6 pb-32 pt-32 sm:px-10">
      <article className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
            Informations légales
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Mentions légales
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-text-muted">
            Cette page présente les informations relatives à l&apos;édition et à
            l&apos;hébergement de ce site.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <section className="rounded-3xl border border-border-default bg-surface/60 p-6 shadow-sm backdrop-blur-xl sm:p-8">
            <h2 className="mb-4 text-xl font-bold">Éditeur du site</h2>
            <dl className="space-y-3 text-text-muted">
              <div>
                <dt className="font-semibold text-foreground">Nom</dt>
                <dd>Alexandre Larue</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Activité</dt>
                <dd>Développeur Informatique</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Contact</dt>
                <dd>
                  <a
                    className="underline decoration-primary underline-offset-4 transition-colors hover:text-primary"
                    href="https://alexandre-larue.fr"
                  >
                    alexandre-larue.fr
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-border-default bg-surface/60 p-6 shadow-sm backdrop-blur-xl sm:p-8">
            <h2 className="mb-4 text-xl font-bold">Hébergement</h2>
            <p className="leading-relaxed text-text-muted">
              Ce site est auto-hébergé par le propriétaire
            </p>
          </section>
        </div>

        <section className="space-y-4 rounded-3xl border border-border-default bg-surface/60 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <h2 className="text-xl font-bold">Propriété intellectuelle</h2>
          <p className="leading-relaxed text-text-muted">
            Sauf mention contraire, les contenus publiés sur ce site sont la
            propriété d&apos;Alexandre Larue. Toute reproduction, représentation
            ou réutilisation, totale ou partielle, doit faire l&apos;objet
            d&apos;une autorisation préalable. La documentation présent sur le
            site peut être totalement réutilisée, reproduites.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-border-default bg-surface/60 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <h2 className="text-xl font-bold">Données personnelles</h2>
          <p className="leading-relaxed text-text-muted">
            Ce site n&apos;utilise pas de formulaire de contact ni de compte
            utilisateur.
          </p>
        </section>

        <Link
          href="/"
          className="inline-flex font-semibold text-primary underline decoration-primary underline-offset-4 transition-colors hover:text-foreground"
        >
          Retour à l&apos;accueil
        </Link>
      </article>
    </main>
  );
}
