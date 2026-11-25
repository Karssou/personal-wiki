import { dynamicLoader } from 'fumadocs-core/source';
import { obsidian } from 'fumadocs-obsidian';
import path from 'node:path';
import { docsRoute } from './shared';

const vault = obsidian({
  dir: path.join(process.cwd(), 'content', 'docs'),
  // Les pièces jointes sont servies par la route API ci-dessous, pas par /public.
  remarkImageOptions: false,
  url: (vaultPath) =>
    `/api/obsidian/${vaultPath
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/')}`,
});

const vaultLoader = dynamicLoader(vault.dynamicSource(), {
  baseUrl: docsRoute,
});

export function getSource() {
  return vaultLoader.get();
}
