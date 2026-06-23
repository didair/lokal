import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { dataPath } from '@/lib/data-dir';
import { getCurrentSession } from '@/lib/user';
import { getMimeType } from '@/lib/mime';

export const runtime = 'nodejs';

async function getValidShare(token: string) {
  const share = await prisma.share.findUnique({ where: { token } });

  if (!share) return null;
  if (share.expiresAt && share.expiresAt < new Date()) return null;
  if (share.maxReads != null && share.readCount >= share.maxReads) return null;

  if (share.access === 'private') {
    const session = await getCurrentSession();
    const sessionUserId = (session as any)?.user?.id;

    if (!sessionUserId) return null;
    if (share.recipientId && share.recipientId !== sessionUserId && share.ownerId !== sessionUserId) return null;
  }

  return share;
}

function cleanRelativePath(input: string | null) {
  return (input ?? '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .filter((part) => part !== '.' && part !== '..')
    .join('/');
}

function contentDisposition(type: 'inline' | 'attachment', filename: string) {
  const safeName = filename.replace(/"/g, '\\"');
  return `${type}; filename="${safeName}"`;
}

function zipName(name: string) {
  const base = path.basename(name).replace(/\.zip$/i, '') || 'shared-folder';
  return `${base}.zip`;
}

function resolveSharedPath(share: NonNullable<Awaited<ReturnType<typeof getValidShare>>>, childPath: string | null) {
  const shareRootPath = path.resolve(dataPath(share.ownerRootDir, share.path));
  const relativeChildPath = cleanRelativePath(childPath);
  const targetPath = path.resolve(shareRootPath, relativeChildPath);

  if (targetPath !== shareRootPath && !targetPath.startsWith(`${shareRootPath}${path.sep}`)) {
    throw new Error('Invalid path');
  }

  return { targetPath, relativeChildPath };
}

async function incrementReadCount(shareId: string, shouldIncrement: boolean) {
  if (!shouldIncrement) return;

  await prisma.share.update({
    where: { id: shareId },
    data: { readCount: { increment: 1 } },
  });
}

function streamFile(filePath: string, request: NextRequest, filename: string, inline: boolean) {
  const fileInfo = fs.statSync(filePath);
  const range = request.headers.get('range');
  const mimeType = getMimeType(filePath);
  const headers = {
    'content-type': mimeType,
    'content-disposition': contentDisposition(inline ? 'inline' : 'attachment', filename),
    'accept-ranges': 'bytes',
  };

  if (range) {
    const [startValue, endValue] = range.replace(/bytes=/, '').split('-');
    const start = Number.parseInt(startValue, 10);
    const end = endValue ? Number.parseInt(endValue, 10) : fileInfo.size - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
      return new Response(null, { status: 416 });
    }

    return new Response(fs.createReadStream(filePath, { start, end }) as any, {
      status: 206,
      headers: {
        ...headers,
        'content-range': `bytes ${start}-${end}/${fileInfo.size}`,
        'content-length': String(end - start + 1),
      },
    });
  }

  return new Response(fs.createReadStream(filePath) as any, {
    headers: {
      ...headers,
      'content-length': String(fileInfo.size),
    },
  });
}

function streamZip(directoryPath: string, filename: string) {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.directory(directoryPath, false);
  archive.finalize();

  return new Response(archive as any, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': contentDisposition('attachment', filename),
    },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getValidShare(token);

  if (!share) {
    return NextResponse.json(null, { status: 404 });
  }

  try {
    const childPath = request.nextUrl.searchParams.get('path');
    const inline = request.nextUrl.searchParams.get('inline') === '1';
    const { targetPath, relativeChildPath } = share.fileType === 'dir'
      ? resolveSharedPath(share, childPath)
      : { targetPath: path.resolve(dataPath(share.ownerRootDir, share.path)), relativeChildPath: '' };
    const fileInfo = fs.statSync(targetPath);

    if (fileInfo.isDirectory()) {
      await incrementReadCount(share.id, !inline && share.maxReads != null);
      return streamZip(targetPath, zipName(relativeChildPath || share.name || share.path));
    }

    if (!fileInfo.isFile()) {
      return NextResponse.json(null, { status: 404 });
    }

    await incrementReadCount(share.id, !inline && share.maxReads != null);
    return streamFile(targetPath, request, path.basename(targetPath), inline);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read shared item' }, { status: 400 });
  }
}
