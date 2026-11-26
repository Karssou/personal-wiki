"use cache";

import Link from "next/link";

// Permet de mettre en cache le footer tout en faisant en sorte que les valeurs de temps comme Date() soit
// prérendu.

export default async function Footer() {
  const actualDate: number = new Date().getFullYear();

  return (
    <footer className="w-screen p-5 bg-footer flex flex-col text-foreground space-y-2">
      <section className="flex flex-row justify-between align-center">
        <div>&copy; Copyright Alexandre Larue {actualDate}</div>
        <div className="">
          <ul className="flex flex-row gap-4">
            <li className="">
              <Link href="/docs">Documentation</Link>
            </li>
            <li className="">
              <a href="https://me.alexandre-larue.fr">Site personnel</a>
            </li>
            <li className="">
              <a href="https://alexandre-larue.fr">Site entreprise</a>
            </li>
          </ul>
        </div>
      </section>
      <section className="text-sm text-muted w-full flex flex-row justify-between">
        <Link href="/legal-mention">Mentions légales</Link>
        <span>Made with NextJS & Fumadocs</span>
      </section>
    </footer>
  );
}
