import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPlatformDataset, getPlatformToken, getRecordValue } from '@/lib/platform';

export async function GET(request: Request, { params }: { params: Promise<{ appSlug: string; dataset: string }> }) {
  const { appSlug, dataset: datasetName } = await params;
  const token = await getPlatformToken(request, appSlug, 'data:read');

  if (!token) {
    return NextResponse.json(null, { status: 401 });
  }

  const dataset = await getPlatformDataset(token.appId, datasetName);
  if (!dataset || dataset.kind !== 'collection') {
    return NextResponse.json(null, { status: 404 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);

  const records = await prisma.dataRecord.findMany({
    where: {
      appId: token.appId,
      datasetId: dataset.id,
      ownerId: token.userId,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json(records);
}

export async function POST(request: Request, { params }: { params: Promise<{ appSlug: string; dataset: string }> }) {
  const { appSlug, dataset: datasetName } = await params;
  const token = await getPlatformToken(request, appSlug, 'data:write');

  if (!token) {
    return NextResponse.json(null, { status: 401 });
  }

  const dataset = await getPlatformDataset(token.appId, datasetName);
  if (!dataset || dataset.kind !== 'collection') {
    return NextResponse.json(null, { status: 404 });
  }

  const body = await request.json();
  const record = await prisma.dataRecord.create({
    data: {
      appId: token.appId,
      datasetId: dataset.id,
      ownerId: token.userId,
      value: getRecordValue(body),
    },
  });

  return NextResponse.json(record, { status: 201 });
}
