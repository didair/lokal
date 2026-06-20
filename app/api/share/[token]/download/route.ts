import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { dataPath } from '@/lib/data-dir';
import { getCurrentSession } from '@/lib/user';

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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getValidShare(token);

  if (!share || share.fileType !== 'file') {
    return NextResponse.json(null, { status: 404 });
  }

  const filePath = dataPath(share.ownerRootDir, share.path);
  const body = fs.readFileSync(filePath);

  if (share.maxReads != null) {
    await prisma.share.update({
      where: { id: share.id },
      data: { readCount: { increment: 1 } },
    });
  }

  return new Response(body, {
    headers: {
      'content-disposition': `attachment; filename="${path.basename(share.path)}"`,
    },
  });
}
