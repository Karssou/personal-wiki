import { source } from "@/lib/source";
import { getSectionSlug, type Section } from "@/lib/section";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import defaultMdxComponents from "fumadocs-ui/mdx";
import * as ObsidianComponents from "fumadocs-obsidian/ui";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export async function ObsidianPage({
  section,
  slug,
}: {
  section: Section;
  slug?: string[];
}) {
  const page = source.getPage(getSectionSlug(section, slug));
  if (!page) notFound();

  const { body, toc } = await (
    await page.data.load()
  ).render({
    ...defaultMdxComponents,
    ...ObsidianComponents,
    img: (props) => (
      // Obsidian attachments are served by our API route and must stay plain images.
      // eslint-disable-next-line @next/next/no-img-element
      <img {...props} alt={props.alt ?? ""} />
    ),
    a: createRelativeLink(source, page),
  });

  return (
    <DocsPage toc={toc} full={page.data.frontmatter.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>{body as ReactNode}</DocsBody>
    </DocsPage>
  );
}
