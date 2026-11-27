import { source } from "@/lib/source";
import { getSectionTree, type Section } from "@/lib/section";
import { baseOptions } from "@/lib/layout.shared";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

export function SectionLayout({
  section,
  children,
}: {
  section: Section;
  children: ReactNode;
}) {
  const tabs = [
    {
      title: "Cours",
      description: "La documentation de mes cours",
      url: "/docs/cours",
      urls: new Set(["/docs/cours"]),
    },
    {
      title: "Personnel",
      description: "Mes notes personnelles",
      url: "/docs/personal",
      urls: new Set(["/docs/personal"]),
    },
  ];

  return (
    <DocsLayout
      tree={getSectionTree(source.getPageTree(), section)}
      {...baseOptions()}
      tabs={tabs}
      nav={{
        title: section === "cours" ? "Mes cours" : "Mes notes personnelles",
        url: `/docs/${section}`,
      }}
    >
      {children}
    </DocsLayout>
  );
}
