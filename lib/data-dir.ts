export const DATA_DIR = process.env.DATA_DIR ?? '/data';

export function dataPath(...paths: string[]) {
  const base = DATA_DIR.replace(/\/+$/, '');
  const relativePath = paths
    .filter(Boolean)
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');

  return relativePath ? `${base}/${relativePath}` : base;
}
