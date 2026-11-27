import Image from "next/image";
import Link from "next/link";

export default async function Navbar() {
  type NavItemsType = {
    key: string;
    href: string;
    label: string;
  };

  const NavItems: NavItemsType[] = [
    {
      key: "navbar.personal",
      href: "https://me.alexandre-larue.fr",
      label: "Site personnel",
    },
    {
      key: "navbar.pro",
      href: "https://alexandre-larue.fr",
      label: "Site professionnel",
    },
  ];

  return (
    <div className="animate-slide-down mx-auto flex max-w-7xl items-start justify-between gap-4">
      <div className="animate-scale-up flex min-w-0 shrink items-center gap-4 rounded-full border border-border-default bg-surface/30 px-4 py-3 shadow-2xl backdrop-blur-xl">
        <div className="px-1">
          <Image
            src="/logo-squared.png"
            alt="Alexandre Larue - Logo"
            width="40"
            height="40"
            loading="eager"
            priority
            preload
            decoding="async"
            className="size-10 object-contain"
          />
        </div>
        <nav>
          <ul className="flex items-center gap-x-1 xl:gap-x-2 text-default whitespace-nowrap">
            {NavItems.map((item) => (
              <li
                key={item.key}
                className="flex items-center rounded-full px-2.5 py-2 transition-all duration-200 ease-out xl:px-4 hover:bg-bg-hovered"
              >
                <Link href={item.href} className="flex items-center">
                  <span className="select-none transition-all duration-300 ease-out">
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
