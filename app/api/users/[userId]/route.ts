import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSession, getCurrentSession } from '@/lib/user';

async function getOwnerUser() {
  const session = await getCurrentSession();
  const user = (session as any)?.user;

  if (!user?.id || user.role !== 'O') {
    return null;
  }

  return user as { id: string };
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanRootDir(value: unknown) {
  const parts = cleanText(value)
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .filter((part) => part !== '.' && part !== '..');

  return parts.length ? `/${parts.join('/')}` : '/';
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const owner = await getOwnerUser();

  if (!owner) {
    return NextResponse.json(null, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json().catch(() => ({}));
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!existingUser) {
    return NextResponse.json(null, { status: 404 });
  }

  const name = cleanText(body.name);
  const email = cleanText(body.email).toLowerCase();
  const requestedRole = cleanText(body.role);

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
  }

  if (!['U', 'A'].includes(requestedRole) && existingUser.role !== 'O') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        rootDir: cleanRootDir(body.rootDir),
        role: existingUser.role === 'O' ? 'O' : requestedRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        rootDir: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });


    if (owner.id === updatedUser.id) {
      await createSession(updatedUser);
    }

    return NextResponse.json(updatedUser);
  } catch {
    return NextResponse.json({ error: 'Could not update user' }, { status: 400 });
  }
}
