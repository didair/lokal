import { platformOptions } from '@/lib/platform';
import { deleteCollectionRecord, readCollectionRecord, updateCollectionRecord } from '@/lib/platform-data';

export function OPTIONS() {
  return platformOptions();
}

export async function GET(request: Request, { params }: { params: Promise<{ appSlug: string; collection: string; recordId: string }> }) {
  const { appSlug, collection, recordId } = await params;
  return readCollectionRecord(request, appSlug, collection, recordId);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ appSlug: string; collection: string; recordId: string }> }) {
  const { appSlug, collection, recordId } = await params;
  return updateCollectionRecord(request, appSlug, collection, recordId);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ appSlug: string; collection: string; recordId: string }> }) {
  const { appSlug, collection, recordId } = await params;
  return deleteCollectionRecord(request, appSlug, collection, recordId);
}
