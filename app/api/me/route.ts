import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSession, getCurrentSession, hashPassword } from '@/lib/user';

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  const sessionUser = (session as any)?.user;

  if (!sessionUser?.id) {
    return NextResponse.json(null, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = cleanText(body.name);
  const email = cleanText(body.email).toLowerCase();
  const password = cleanText(body.password);
  const confirmPassword = cleanText(body.confirmPassword);

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
  }

  if (password || confirmPassword) {
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        name,
        email,
        ...(password ? { password: hashPassword(password) } : {}),
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

    await createSession(updatedUser);

    return NextResponse.json(updatedUser);
  } catch {
    return NextResponse.json({ error: 'Could not update account' }, { status: 400 });
  }
}
