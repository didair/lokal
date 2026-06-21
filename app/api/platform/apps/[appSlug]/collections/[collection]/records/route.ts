import { platformOptions } from '@/lib/platform';
import { createCollectionRecord, listCollectionRecords } from '@/lib/platform-data';

export function OPTIONS() {
  return platformOptions();
}

export async function GET(request: Request, { params }: { params: Promise<{ appSlug: string; collection: string }> }) {
  const { appSlug, collection } = await params;
  return listCollectionRecords(request, appSlug, collection);
}

export async function POST(request: Request, { params }: { params: Promise<{ appSlug: string; collection: string }> }) {
  const { appSlug, collection } = await params;
  return createCollectionRecord(request, appSlug, collection);
}
