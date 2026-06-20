import { randomBytes, timingSafeEqual } from 'crypto';
import { SHA256 } from 'crypto-js';
import prisma from './prisma';

export type AppManifest = {
  name: string;
  slug: string;
  description?: string;
  developerName?: string;
  datasets: Array<{
    name: string;
    kind: 'collection' | 'singleton';
    schema?: unknown;
  }>;
};

export function hashToken(token: string) {
  return SHA256(token).toString();
}

export function createRawAppToken() {
  return `lokal_app_${randomBytes(32).toString('base64url')}`;
}

export function createClientId() {
  return `lokal_client_${randomBytes(12).toString('base64url')}`;
}

export function validateManifest(input: unknown): AppManifest {
  const manifest = input as Partial<AppManifest>;

  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Manifest must be an object');
  }

  if (!manifest.name?.trim()) {
    throw new Error('Manifest name is required');
  }

  if (!manifest.slug?.match(/^[a-z0-9-]+$/)) {
    throw new Error('Manifest slug must use lowercase letters, numbers, and dashes');
  }

  if (!Array.isArray(manifest.datasets) || manifest.datasets.length === 0) {
    throw new Error('Manifest must define at least one dataset');
  }

  const datasets = manifest.datasets.map((dataset) => {
    if (!dataset.name?.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new Error('Dataset names may only use letters, numbers, underscores, and dashes');
    }

    if (dataset.kind !== 'collection' && dataset.kind !== 'singleton') {
      throw new Error('Dataset kind must be collection or singleton');
    }

    return {
      name: dataset.name,
      kind: dataset.kind,
      schema: dataset.schema ?? {},
    };
  });

  return {
    name: manifest.name.trim(),
    slug: manifest.slug,
    description: manifest.description?.trim() || undefined,
    developerName: manifest.developerName?.trim() || undefined,
    datasets,
  };
}

export async function getPlatformToken(request: Request, appSlug: string, requiredScope: 'data:read' | 'data:write') {
  const authorization = request.headers.get('authorization') ?? '';
  const rawToken = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const token = await prisma.appToken.findUnique({
    where: { tokenHash },
    include: {
      app: true,
      user: true,
    },
  });

  if (!token || token.revokedAt || token.app.slug !== appSlug || !token.app.enabled) {
    return null;
  }

  if (token.expiresAt && token.expiresAt < new Date()) {
    return null;
  }

  if (!token.scopes.includes(requiredScope)) {
    return null;
  }

  const expectedHash = Buffer.from(token.tokenHash);
  const actualHash = Buffer.from(tokenHash);
  if (expectedHash.length !== actualHash.length || !timingSafeEqual(expectedHash, actualHash)) {
    return null;
  }

  return token;
}

export async function getPlatformDataset(appId: string, datasetName: string) {
  return prisma.appDataset.findFirst({
    where: {
      appId,
      name: datasetName,
    },
  });
}

export function getRecordValue(body: any) {
  return body && Object.prototype.hasOwnProperty.call(body, 'value') ? body.value : body;
}
