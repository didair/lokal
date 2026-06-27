import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DATA_DIR } from '@/lib/data-dir';
import { formatBytes } from '@/lib/file-utils';
import { getCurrentSession } from '@/lib/user';

export const runtime = 'nodejs';

type SearchResult = {
  name: string;
  path: string;
  parentPath: string;
  type: 'file' | 'dir' | 'other';
  size: string;
  date: string;
};

type CacheEntry = {
  expiresAt: number;
  results: SearchResult[];
  truncated: boolean;
};

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 45_000;
const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 75;
const TIME_BUDGET_MS = 1_200;
const MAX_DIRECTORIES = 3_000;

function cleanRelativePath(input: unknown) {
  const value = input?.toString() ?? '';
  const parts = value
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .filter((part) => part !== '.' && part !== '..');

  return parts.join('/');
}

function normalizeQuery(input: unknown) {
  return input?.toString().trim().toLowerCase() ?? '';
}

function resolveUserPath(rootDir: string, itemPath: string) {
  const userRoot = path.resolve(DATA_DIR, cleanRelativePath(rootDir));
  const absolutePath = path.resolve(userRoot, cleanRelativePath(itemPath));

  if (absolutePath !== userRoot && !absolutePath.startsWith(`${userRoot}${path.sep}`)) {
    throw new Error('Invalid path');
  }

  return { userRoot, absolutePath };
}

function toRelativePath(userRoot: string, absolutePath: string) {
  const relative = path.relative(userRoot, absolutePath).replace(/\\/g, '/');
  return relative ? `/${relative}` : '/';
}

async function getUser() {
  const session = await getCurrentSession();
  return prisma.user.findUnique({
    where: { id: (session?.user as any)?.id ?? '' },
    select: { id: true, rootDir: true },
  });
}

async function getIgnoreDsStore() {
  const setting = await prisma.setting.findUnique({
    where: { id: 'files-ignore-ds-store' },
  });

  return setting?.value === 'true';
}

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of searchCache.entries()) {
    if (entry.expiresAt <= now) {
      searchCache.delete(key);
    }
  }
}

async function searchDirectory({
  userRoot,
  currentAbsolutePath,
  query,
  limit,
  ignoreDsStore,
}: {
  userRoot: string;
  currentAbsolutePath: string;
  query: string;
  limit: number;
  ignoreDsStore: boolean;
}) {
  const startedAt = Date.now();
  const results: SearchResult[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];
  let directoriesRead = 0;
  let truncated = false;

  const enqueue = (directoryPath: string) => {
    if (visited.has(directoryPath)) return;
    if (directoryPath !== userRoot && !directoryPath.startsWith(`${userRoot}${path.sep}`)) return;
    visited.add(directoryPath);
    queue.push(directoryPath);
  };

  enqueue(currentAbsolutePath);
  if (currentAbsolutePath !== userRoot) {
    enqueue(userRoot);
  }

  while (queue.length > 0 && results.length < limit) {
    if (Date.now() - startedAt > TIME_BUDGET_MS || directoriesRead >= MAX_DIRECTORIES) {
      truncated = true;
      break;
    }

    const directoryPath = queue.shift()!;
    let dir: Awaited<ReturnType<typeof fs.opendir>> | null = null;

    try {
      dir = await fs.opendir(directoryPath);
      directoriesRead += 1;

      for await (const entry of dir) {
        if (Date.now() - startedAt > TIME_BUDGET_MS || results.length >= limit) {
          truncated = true;
          break;
        }

        if (ignoreDsStore && entry.name === '.DS_Store') {
          continue;
        }

        const absolutePath = path.join(directoryPath, entry.name);
        const isDirectory = entry.isDirectory();

        if (entry.name.toLowerCase().includes(query)) {
          const stat = await fs.stat(absolutePath).catch(() => null);

          if (stat) {
            const itemPath = toRelativePath(userRoot, absolutePath);
            const parentPath = toRelativePath(userRoot, directoryPath);

            results.push({
              name: entry.name,
              path: itemPath,
              parentPath,
              type: isDirectory ? 'dir' : entry.isFile() ? 'file' : 'other',
              size: isDirectory ? '-' : formatBytes(stat.size),
              date: stat.mtime.toISOString(),
            });
          }
        }

        if (isDirectory) {
          enqueue(absolutePath);
        }
      }
    } catch {
      // Directories may be unreadable or disappear while searching. Skip them.
    } finally {
      await dir?.close().catch(() => null);
    }
  }

  return { results, truncated };
}

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(null, { status: 401 });
    }

    const url = new URL(request.url);
    const query = normalizeQuery(url.searchParams.get('q'));
    const currentPath = cleanRelativePath(url.searchParams.get('path'));
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({ results: [], truncated: false, minQueryLength: MIN_QUERY_LENGTH });
    }

    const { userRoot } = resolveUserPath(user.rootDir, '');
    const { absolutePath: currentAbsolutePath } = resolveUserPath(user.rootDir, currentPath);
    const currentInfo = await fs.stat(currentAbsolutePath).catch(() => null);
    const searchStartPath = currentInfo?.isDirectory() ? currentAbsolutePath : userRoot;
    const ignoreDsStore = await getIgnoreDsStore();
    const cacheKey = [user.id, user.rootDir, searchStartPath, query, limit, ignoreDsStore ? '1' : '0'].join(':');

    pruneCache();

    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ ...cached, cached: true, minQueryLength: MIN_QUERY_LENGTH });
    }

    const searchResult = await searchDirectory({
      userRoot,
      currentAbsolutePath: searchStartPath,
      query,
      limit,
      ignoreDsStore,
    });

    searchCache.set(cacheKey, {
      ...searchResult,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({ ...searchResult, cached: false, minQueryLength: MIN_QUERY_LENGTH });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not search files' }, { status: 400 });
  }
}
