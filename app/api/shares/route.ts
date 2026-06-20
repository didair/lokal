import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';

type ExpirationMode = 'after-read' | '24h' | 'custom';

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

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const sessionUser = (session as any)?.user;

  if (!sessionUser?.id) {
    return NextResponse.json(null, { status: 401 });
  }

  const body = await request.json();
  const sharePath = cleanSharePath(body.path ?? '');
  const name = body.name?.toString() || sharePath.split('/').pop() || 'Shared item';
  const fileType = body.fileType === 'dir' ? 'dir' : 'file';
  const expiration = getExpiration(body.expiration ?? '24h', body.customExpiresAt);
  const origin = body.origin?.toString() || new URL(request.url).origin;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, rootDir: true },
  });

  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }

  const [publicShare, privateShare] = await prisma.$transaction([
    prisma.share.create({
      data: {
        name,
        path: sharePath,
        fileType,
        access: 'public',
        ownerId: user.id,
        ownerRootDir: user.rootDir,
        ...expiration,
      },
    }),
    prisma.share.create({
      data: {
        name,
        path: sharePath,
        fileType,
        access: 'private',
        ownerId: user.id,
        ownerRootDir: user.rootDir,
        ...expiration,
      },
    }),
  ]);

  return NextResponse.json({
    publicLink: `${origin}/share/${publicShare.token}`,
    privateLink: `${origin}/share/${privateShare.token}`,
  });
}
