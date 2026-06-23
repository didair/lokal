import { readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-static';

export async function GET() {
  const contract = await readFile(path.join(process.cwd(), 'contracts', 'lokal-manifest.schema.json'), 'utf8');
  return new Response(contract, {
    headers: {
      'content-type': 'application/schema+json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
