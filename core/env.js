// Which subject this page belongs to, and where the site's files are.
import { COMMON } from './asset-map.js';

// The page sets <script>window.__ISLAND={subject:'…'}</script> before its first module; node tests set globalThis.__ISLAND.
export const SUBJECT = globalThis.__ISLAND?.subject ?? null;

// an address relative to the site root (the folder above core/)
export function siteUrl(rel) {
  return new URL('../' + rel, import.meta.url).href;
}

// where an asset is: a file the subjects share (the same contents) is once under assets/common/, any other is the
// subject's own under assets/<subject>/. common: the set of shared paths (core/asset-map.js, made by
// tools/dedup-assets.mjs).
export function assetUrl(common, path, subject) {
  return common.has(path) ? siteUrl('assets/common/' + path) : siteUrl('assets/' + subject + '/' + path);
}

// a file of a subject's assets (the page's subject unless another one is named)
export function asset(path, subject = SUBJECT) {
  return assetUrl(COMMON, path, subject);
}

// the subject's own fonts (subject.fonts: [{ family, file, descriptors }]) as @font-face rules in a <style>, the font
// file's address made by asset() (the pages and core/ui.css name no asset). The island and home engines call it first.
export function useFonts(subject, doc = globalThis.document) {
  if (!doc || !subject.fonts?.length) return;
  const st = doc.createElement('style');
  st.textContent = subject.fonts.map(f => `@font-face { font-family: "${f.family}"; src: url("${asset(f.file, subject.id)}") format("${f.file.endsWith('.woff2') ? 'woff2' : 'woff'}"); ${Object.entries(f.descriptors || {}).map(([k, v]) => `${k}: ${v};`).join(' ')} }`).join('\n');
  doc.head.appendChild(st);
}
