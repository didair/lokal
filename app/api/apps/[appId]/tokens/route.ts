import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';
import { createRawAppToken, hashToken } from '@/lib/platform';

async function getAdminUser() {
  const session = await getCurrentSession();
  const user = (session as any)?.user;

  if (!user?.id || (user.role !== 'O' && user.role !== 'A')) {
    return null;
  }

  return user as { id: string };
}

export async function POST(request: Request, { params }: { params: Promise<{ appId: string }> }) {
  const user = await getAdminUser();

  if (!user) {
    return NextResponse.json(null, { status: 403 });
  }

  const { appId } = await params;
  const body = await request.json().catch(() => ({}));
  const rawToken = createRawAppToken();

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return NextResponse.json(null, { status: 404 });
  }

  const token = await prisma.appToken.create({
    data: {
      appId,
      userId: user.id,
      tokenHash: hashToken(rawToken),
      name: body.name?.toString() || 'Development token',
      scopes: ['data:read', 'data:write'],
    },
    select: {
      id: true,
      name: true,
      scopes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ token, rawToken });
}
