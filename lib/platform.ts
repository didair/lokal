import { randomBytes, timingSafeEqual } from 'crypto';
import { SHA256 } from 'crypto-js';
import { NextResponse } from 'next/server';
import type { NextResponse as NextResponseType } from 'next/server';
import prisma from './prisma';

export type AppRegistrationInput = {
  name: string;
  slug: string;
  description?: string;
  developerName?: string;
};

export type LokalAppManifest = {
  name?: string;
  slug: string;
  description?: string;
  developerName?: string;
  collections: Record<string, unknown>;
};

export type ValidatedAppManifest = AppRegistrationInput & {
  manifest: LokalAppManifest;
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

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function validateAppRegistration(input: unknown): AppRegistrationInput {
  const app = input as Partial<AppRegistrationInput>;

  if (!app || typeof app !== 'object') {
    throw new Error('App registration must be an object');
  }

  if (!app.name?.trim()) {
    throw new Error('App name is required');
  }

  if (!app.slug?.match(/^[a-z0-9-]+$/)) {
    throw new Error('App slug must use lowercase letters, numbers, and dashes');
  }

  return {
    name: app.name.trim(),
    slug: app.slug.trim(),
    description: app.description?.trim() || undefined,
    developerName: app.developerName?.trim() || undefined,
  };
}

export function validateCollectionName(input: string) {
  const collection = input?.trim();

  if (!collection?.match(/^[a-zA-Z0-9_-]+$/)) {
    throw new Error('Collection names may only use letters, numbers, underscores, and dashes');
  }

  return collection;
}

export function validateLokalAppManifest(input: unknown): ValidatedAppManifest {
  const manifest = input as Partial<LokalAppManifest>;

  if (!manifest || typeof manifest !== 'object') {
    throw new Error('App manifest must be an object');
  }

  if (!manifest.slug?.match(/^[a-z0-9-]+$/)) {
    throw new Error('App manifest slug must use lowercase letters, numbers, and dashes');
  }

  if (!manifest.collections || typeof manifest.collections !== 'object' || Array.isArray(manifest.collections)) {
    throw new Error('App manifest must define collections');
  }

  const collections = Object.fromEntries(
    Object.entries(manifest.collections).map(([name, schema]) => [validateCollectionName(name), schema]),
  );

  if (Object.keys(collections).length === 0) {
    throw new Error('App manifest must define at least one collection');
  }

  const name = manifest.name?.trim() || titleFromSlug(manifest.slug);

  return {
    name,
    slug: manifest.slug.trim(),
    description: manifest.description?.trim() || undefined,
    developerName: manifest.developerName?.trim() || undefined,
    manifest: {
      ...manifest,
      name: manifest.name?.trim() || undefined,
      slug: manifest.slug.trim(),
      description: manifest.description?.trim() || undefined,
      developerName: manifest.developerName?.trim() || undefined,
      collections,
    },
  };
}

export async function registerAppManifestForUser(userId: string, input: unknown) {
  const app = validateLokalAppManifest(input);

  return prisma.app.upsert({
    where: { slug: app.slug },
    update: {
      name: app.name,
      description: app.description,
      developerName: app.developerName,
      manifest: app.manifest as any,
      enabled: true,
    },
    create: {
      name: app.name,
      slug: app.slug,
      description: app.description,
      developerName: app.developerName,
      manifest: app.manifest as any,
      clientId: createClientId(),
      createdById: userId,
    },
  });
}

export function withPlatformCors<T extends NextResponseType>(response: T) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

export function platformJson(body: unknown, init?: ResponseInit) {
  return withPlatformCors(NextResponse.json(body, init));
}

export function platformOptions() {
  return withPlatformCors(new NextResponse(null, { status: 204 }));
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

export function getRecordValue(body: any) {
  return body && Object.prototype.hasOwnProperty.call(body, 'value') ? body.value : body;
}
