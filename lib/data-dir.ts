import path from 'path';

export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? '/data');

export function dataPath(...paths: string[]) {
  return path.join(DATA_DIR, ...paths);
}
