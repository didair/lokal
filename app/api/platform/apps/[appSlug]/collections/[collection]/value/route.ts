import { platformOptions } from '@/lib/platform';
import { readCollectionValue, upsertCollectionValue } from '@/lib/platform-data';

export function OPTIONS() {
  return platformOptions();
}

export async function GET(request: Request, { params }: { params: Promise<{ appSlug: string; collection: string }> }) {
  const { appSlug, collection } = await params;
  return readCollectionValue(request, appSlug, collection);
}

export async function PUT(request: Request, { params }: { params: Promise<{ appSlug: string; collection: string }> }) {
  const { appSlug, collection } = await params;
  return upsertCollectionValue(request, appSlug, collection);
}
