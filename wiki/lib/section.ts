import type * as PageTree from "fumadocs-core/page-tree";

export type Section = "cours" | "personal";

export function getSectionTree(
  tree: PageTree.Root,
  section: Section,
): PageTree.Root {
  const sectionUrl = `/docs/${section}`;
  const matchesSectionUrl = (url: string) =>
    url.replace(/\/$/, "") === sectionUrl;

  // The section index can be nested differently depending on the source
  // adapter and on whether a meta file is present. Search recursively instead
  // of assuming that the section folder is a direct child of the root.
  function findSectionFolder(
    node: PageTree.Root | PageTree.Folder,
  ): PageTree.Folder | undefined {
    if (node.type === "folder") {
      if (
        node.index?.type === "page" && matchesSectionUrl(node.index.url)
      ) {
        return node;
      }

      if (typeof node.name === "string" && node.name.toLocaleLowerCase() === section) {
        return node;
      }

    }

    for (const child of node.children) {
      if (child.type === "folder") {
        const match = findSectionFolder(child);
        if (match) return match;
      }
    }

    return undefined;
  }

  const folder = findSectionFolder(tree);

  return {
    ...tree,
    name: section === "cours" ? "Cours" : "Personnel",
    children: folder?.children ?? [],
  };
}

export function getSectionSlug(section: Section, slug?: string[]) {
  return [section, ...(slug ?? [])];
}
