import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPlatformDataset, getPlatformToken, getRecordValue } from '@/lib/platform';

const SINGLETON_KEY = '__singleton';

export async function GET(request: Request, { params }: { params: Promise<{ appSlug: string; dataset: string }> }) {
  const { appSlug, dataset: datasetName } = await params;
  const token = await getPlatformToken(request, appSlug, 'data:read');

  if (!token) {
    return NextResponse.json(null, { status: 401 });
  }

  const dataset = await getPlatformDataset(token.appId, datasetName);
  if (!dataset || dataset.kind !== 'singleton') {
    return NextResponse.json(null, { status: 404 });
  }

  const record = await prisma.dataRecord.findFirst({
    where: {
      appId: token.appId,
      datasetId: dataset.id,
      ownerId: token.userId,
      key: SINGLETON_KEY,
      deletedAt: null,
    },
  });

  return NextResponse.json(record?.value ?? null);
}

export async function PUT(request: Request, { params }: { params: Promise<{ appSlug: string; dataset: string }> }) {
  const { appSlug, dataset: datasetName } = await params;
  const token = await getPlatformToken(request, appSlug, 'data:write');

  if (!token) {
    return NextResponse.json(null, { status: 401 });
  }

  const dataset = await getPlatformDataset(token.appId, datasetName);
  if (!dataset || dataset.kind !== 'singleton') {
    return NextResponse.json(null, { status: 404 });
  }

  const body = await request.json();
  const record = await prisma.dataRecord.upsert({
    where: {
      appId_datasetId_ownerId_key: {
        appId: token.appId,
        datasetId: dataset.id,
        ownerId: token.userId,
        key: SINGLETON_KEY,
      },
    },
    update: {
      value: getRecordValue(body),
      version: { increment: 1 },
      deletedAt: null,
    },
    create: {
      appId: token.appId,
      datasetId: dataset.id,
      ownerId: token.userId,
      key: SINGLETON_KEY,
      value: getRecordValue(body),
    },
  });

  return NextResponse.json(record);
}
