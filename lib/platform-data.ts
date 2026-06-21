import type { DataRecord } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getPlatformToken, getRecordValue, platformJson, validateCollectionName } from '@/lib/platform';

const SINGLETON_KEY = '__singleton';

type Scope = 'data:read' | 'data:write';
type PlatformToken = NonNullable<Awaited<ReturnType<typeof getPlatformToken>>>;
type ErrorResult = { error: Response };
type AccessResult = { token: PlatformToken; collection: string };
type RecordResult = AccessResult & { record: DataRecord | null };

function hasError<T extends object>(result: T | ErrorResult): result is ErrorResult {
  return 'error' in result;
}

async function getValidatedAccess(request: Request, appSlug: string, collectionName: string, scope: Scope): Promise<AccessResult | ErrorResult> {
  const token = await getPlatformToken(request, appSlug, scope);

  if (!token) {
    return { error: platformJson(null, { status: 401 }) };
  }

  try {
    return {
      token,
      collection: validateCollectionName(collectionName),
    };
  } catch (error) {
    return {
      error: platformJson({ error: error instanceof Error ? error.message : 'Invalid collection name' }, { status: 400 }),
    };
  }
}

async function getRecord(request: Request, appSlug: string, collectionName: string, recordId: string, scope: Scope): Promise<RecordResult | ErrorResult> {
  const access = await getValidatedAccess(request, appSlug, collectionName, scope);
  if (hasError(access)) return access;

  const record = await prisma.dataRecord.findFirst({
    where: {
      id: recordId,
      appId: access.token.appId,
      ownerId: access.token.userId,
      collection: access.collection,
      deletedAt: null,
    },
  });

  return { ...access, record };
}

export async function listCollectionRecords(request: Request, appSlug: string, collectionName: string) {
  const access = await getValidatedAccess(request, appSlug, collectionName, 'data:read');
  if (hasError(access)) return access.error;

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit') ?? 50);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;

  const records = await prisma.dataRecord.findMany({
    where: {
      appId: access.token.appId,
      ownerId: access.token.userId,
      collection: access.collection,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return platformJson(records);
}

export async function createCollectionRecord(request: Request, appSlug: string, collectionName: string) {
  const access = await getValidatedAccess(request, appSlug, collectionName, 'data:write');
  if (hasError(access)) return access.error;

  const body = await request.json();
  const key = typeof body?.key === 'string' && body.key.trim() ? body.key.trim() : null;
  const record = await prisma.dataRecord.create({
    data: {
      appId: access.token.appId,
      ownerId: access.token.userId,
      collection: access.collection,
      key,
      value: getRecordValue(body),
    },
  });

  return platformJson(record, { status: 201 });
}

export async function readCollectionRecord(request: Request, appSlug: string, collectionName: string, recordId: string) {
  const result = await getRecord(request, appSlug, collectionName, recordId, 'data:read');

  if (hasError(result)) return result.error;
  if (!result.record) return platformJson(null, { status: 404 });

  return platformJson(result.record);
}

export async function updateCollectionRecord(request: Request, appSlug: string, collectionName: string, recordId: string) {
  const result = await getRecord(request, appSlug, collectionName, recordId, 'data:write');

  if (hasError(result)) return result.error;
  if (!result.record) return platformJson(null, { status: 404 });

  const body = await request.json();
  const updateData: Record<string, any> = {
    value: getRecordValue(body),
    version: { increment: 1 },
  };

  if (Object.prototype.hasOwnProperty.call(body ?? {}, 'key')) {
    updateData.key = typeof body?.key === 'string' && body.key.trim() ? body.key.trim() : null;
  }

  const record = await prisma.dataRecord.update({
    where: { id: recordId },
    data: updateData,
  });

  return platformJson(record);
}

export async function deleteCollectionRecord(request: Request, appSlug: string, collectionName: string, recordId: string) {
  const result = await getRecord(request, appSlug, collectionName, recordId, 'data:write');

  if (hasError(result)) return result.error;
  if (!result.record) return platformJson(null, { status: 404 });

  await prisma.dataRecord.update({
    where: { id: recordId },
    data: { deletedAt: new Date() },
  });

  return platformJson({ success: true });
}

export async function readCollectionValue(request: Request, appSlug: string, collectionName: string) {
  const access = await getValidatedAccess(request, appSlug, collectionName, 'data:read');
  if (hasError(access)) return access.error;

  const record = await prisma.dataRecord.findFirst({
    where: {
      appId: access.token.appId,
      ownerId: access.token.userId,
      collection: access.collection,
      key: SINGLETON_KEY,
      deletedAt: null,
    },
  });

  return platformJson(record?.value ?? null);
}

export async function upsertCollectionValue(request: Request, appSlug: string, collectionName: string) {
  const access = await getValidatedAccess(request, appSlug, collectionName, 'data:write');
  if (hasError(access)) return access.error;

  const body = await request.json();
  const value = getRecordValue(body);
  const record = await prisma.dataRecord.upsert({
    where: {
      appId_ownerId_collection_key: {
        appId: access.token.appId,
        ownerId: access.token.userId,
        collection: access.collection,
        key: SINGLETON_KEY,
      },
    },
    update: {
      value,
      version: { increment: 1 },
      deletedAt: null,
    },
    create: {
      appId: access.token.appId,
      ownerId: access.token.userId,
      collection: access.collection,
      key: SINGLETON_KEY,
      value,
    },
  });

  return platformJson(record);
}
