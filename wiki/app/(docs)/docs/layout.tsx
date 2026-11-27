import type { ReactNode } from "react";

// Each section owns its DocsLayout. Keeping this parent layout neutral prevents
// the two sidebars from being nested into one another.
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
