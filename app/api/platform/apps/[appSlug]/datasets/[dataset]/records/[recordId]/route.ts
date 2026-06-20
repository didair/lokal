import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPlatformDataset, getPlatformToken, getRecordValue } from '@/lib/platform';

async function getRecord(request: Request, appSlug: string, datasetName: string, recordId: string, scope: 'data:read' | 'data:write') {
  const token = await getPlatformToken(request, appSlug, scope);
  if (!token) return null;

  const dataset = await getPlatformDataset(token.appId, datasetName);
  if (!dataset || dataset.kind !== 'collection') return null;

  const record = await prisma.dataRecord.findFirst({
    where: {
      id: recordId,
      appId: token.appId,
      datasetId: dataset.id,
      ownerId: token.userId,
      deletedAt: null,
    },
  });

  return { token, dataset, record };
}

export async function GET(request: Request, { params }: { params: Promise<{ appSlug: string; dataset: string; recordId: string }> }) {
  const { appSlug, dataset, recordId } = await params;
  const result = await getRecord(request, appSlug, dataset, recordId, 'data:read');

  if (!result?.record) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json(result.record);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ appSlug: string; dataset: string; recordId: string }> }) {
  const { appSlug, dataset, recordId } = await params;
  const result = await getRecord(request, appSlug, dataset, recordId, 'data:write');

  if (!result?.record) {
    return NextResponse.json(null, { status: 404 });
  }

  const body = await request.json();
  const record = await prisma.dataRecord.update({
    where: { id: recordId },
    data: {
      value: getRecordValue(body),
      version: { increment: 1 },
    },
  });

  return NextResponse.json(record);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ appSlug: string; dataset: string; recordId: string }> }) {
  const { appSlug, dataset, recordId } = await params;
  const result = await getRecord(request, appSlug, dataset, recordId, 'data:write');

  if (!result?.record) {
    return NextResponse.json(null, { status: 404 });
  }

  await prisma.dataRecord.update({
    where: { id: recordId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
