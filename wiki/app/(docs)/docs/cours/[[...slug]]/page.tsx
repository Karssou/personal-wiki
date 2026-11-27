import { ObsidianPage } from "@/components/obsidian-page";
import { source } from "@/lib/source";

// This page must await the URL params before rendering the document. Opt out
// of the instant shell so Next does not require that access to be hidden
// behind Suspense.
export const instant = false;

export default async function Page(
  props: PageProps<"/docs/cours/[[...slug]]">,
) {
  const params = await props.params;
  return <ObsidianPage section="cours" slug={params.slug} />;
}

export async function generateStaticParams() {
  return source
    .generateParams()
    .filter(({ slug }) => slug?.[0] === "cours")
    .map(({ slug }) => ({ slug: slug?.slice(1) }));
}
