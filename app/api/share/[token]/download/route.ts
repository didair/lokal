import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { dataPath } from '@/lib/data-dir';
import { getCurrentSession } from '@/lib/user';
import { getMimeType } from '@/lib/mime';

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

function contentDisposition(type: 'inline' | 'attachment', filename: string) {
  const safeName = filename.replace(/"/g, '\\"');
  return `${type}; filename="${safeName}"`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getValidShare(token);

  if (!share || share.fileType !== 'file') {
    return NextResponse.json(null, { status: 404 });
  }

  const filePath = dataPath(share.ownerRootDir, share.path);
  const fileInfo = fs.statSync(filePath);

  if (!fileInfo.isFile()) {
    return NextResponse.json(null, { status: 404 });
  }

  const inline = request.nextUrl.searchParams.get('inline') === '1';
  const filename = path.basename(share.path);
  const range = request.headers.get('range');
  const mimeType = getMimeType(filePath);
  const headers = {
    'content-type': mimeType,
    'content-disposition': contentDisposition(inline ? 'inline' : 'attachment', filename),
    'accept-ranges': 'bytes',
  };

  if (!inline && share.maxReads != null) {
    await prisma.share.update({
      where: { id: share.id },
      data: { readCount: { increment: 1 } },
    });
  }

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
