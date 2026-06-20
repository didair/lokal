import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';
import { getPublicUrl } from '@/lib/public-url';

type ExpirationMode = 'after-read' | '24h' | 'custom';
type ShareAccess = 'public' | 'private';

function cleanSharePath(input: string) {
  const path = input.replace(/^\/+/, '');
  const parts = path.split('/').filter(Boolean);

  if (parts.some((part) => part === '..')) {
    throw new Error('Invalid path');
  }

  return parts.join('/');
}

function getExpiration(mode: ExpirationMode, customExpiresAt?: string) {
  if (mode === 'after-read') {
    return { expiresAt: null, maxReads: 1 };
  }

  if (mode === 'custom') {
    const date = customExpiresAt ? new Date(customExpiresAt) : null;
    if (!date || Number.isNaN(date.getTime())) {
      throw new Error('Invalid custom expiration');
    }
    return { expiresAt: date, maxReads: null };
  }

  const date = new Date();
  date.setHours(date.getHours() + 24);
  return { expiresAt: date, maxReads: null };
}

async function getUserId() {
  const session = await getCurrentSession();
  const sessionUser = (session as any)?.user;
  return sessionUser?.id as string | undefined;
}

function isShareActive(share: { maxReads: number | null; readCount: number }) {
  return share.maxReads == null || share.readCount < share.maxReads;
}

export async function GET(request: Request) {
  const ownerId = await getUserId();

  if (!ownerId) {
    return NextResponse.json(null, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const path = searchParams.get('path');
  const sharePath = path ? cleanSharePath(path) : null;
  const publicUrl = getPublicUrl(request);

  const shares = await prisma.share.findMany({
    where: {
      ownerId,
      ...(sharePath ? { path: sharePath } : {}),
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      id: true,
      token: true,
      access: true,
      path: true,
      recipientId: true,
      expiresAt: true,
      maxReads: true,
      readCount: true,
      createdAt: true,
      recipient: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(shares.filter(isShareActive).map((share) => ({
    ...share,
    link: `${publicUrl}/share/${share.token}`,
  })));
}

export async function POST(request: Request) {
  const ownerId = await getUserId();

  if (!ownerId) {
    return NextResponse.json(null, { status: 401 });
  }

  const body = await request.json();
  const sharePath = cleanSharePath(body.path ?? '');
  const name = body.name?.toString() || sharePath.split('/').pop() || 'Shared item';
  const fileType = body.fileType === 'dir' ? 'dir' : 'file';
  const access: ShareAccess = body.access === 'private' ? 'private' : 'public';
  const recipientId = access === 'private' && body.recipientId ? body.recipientId.toString() : null;
  const expiration = getExpiration(body.expiration ?? '24h', body.customExpiresAt);
  const publicUrl = getPublicUrl(request);

  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { id: true, rootDir: true },
  });

  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }

  if (access === 'private') {
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 });
    }

    const recipient = await prisma.user.findFirst({
      where: {
        id: recipientId,
        NOT: { id: ownerId },
      },
      select: { id: true },
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 });
    }
  }

  const share = await prisma.share.create({
    data: {
      name,
      path: sharePath,
      fileType,
      access,
      ownerId: user.id,
      recipientId,
      ownerRootDir: user.rootDir,
      ...expiration,
    },
  });

  return NextResponse.json({
    link: `${publicUrl}/share/${share.token}`,
  });
}

export async function DELETE(request: Request) {
  const ownerId = await getUserId();

  if (!ownerId) {
    return NextResponse.json(null, { status: 401 });
  }

  const body = await request.json();
  const id = body.id?.toString();

  if (!id) {
    return NextResponse.json({ error: 'Share id is required' }, { status: 400 });
  }

  await prisma.share.deleteMany({
    where: {
      id,
      ownerId,
    },
  });

  return NextResponse.json({ success: true });
}
