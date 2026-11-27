import { Icon } from "@iconify/react";
import Link from "next/link";

export default async function LandingPage() {
  return (
    <section
      id="landing-page"
      className="relative z-10 min-h-[calc(100vh-4rem)] w-full max-w-7xl mx-auto px-6 sm:px-10 py-16 flex items-center"
    >
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Colonne gauche : Accroche & CTA */}
        <div className="lg:col-span-7 flex flex-col items-center text-center sm:items-start sm:text-left gap-6">
          {/* Titre principal */}
          <h1 className="animate-slide-up [animation-delay:100ms] uppercase text-4xl sm:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight leading-[1.08]">
            Les <span className="text-primary">ressources</span>{" "}
            <br className="hidden sm:block" />
            que l&apos;on aurait voulu avoir
          </h1>

          {/* Sous-titre */}
          <p className="animate-slide-up [animation-delay:200ms] max-w-xl text-base sm:text-lg text-text-muted leading-relaxed">
            Notes techniques, fiches de synthèse, snippets prêts à l&apos;emploi
            et retours d&apos;expérience sur le développement Full-Stack. Tout
            est documenté, structuré et directement exploitable.
          </p>

          {/* Boutons d'action */}
          <div className="animate-slide-up [animation-delay:300ms] flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-2">
            <Link
              href="/docs/cours"
              className="group uppercase font-bold inline-flex items-center justify-center gap-2.5 text-sm w-full sm:w-fit px-6 py-3.5 rounded-full bg-primary text-primary-foreground shadow-[0px_0px_25px_0px] shadow-primary/30 hover:shadow-primary/55 hover:brightness-105 transition-all duration-300"
            >
              Explorer la doc
              <Icon
                icon="material-symbols:arrow-right-alt-rounded"
                className="size-5 group-hover:translate-x-1 transition-transform duration-200"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
