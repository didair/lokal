import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';

export async function GET() {
  const session = await getCurrentSession();
  const currentUserId = (session as any)?.user?.id as string | undefined;

  if (!currentUserId) {
    return NextResponse.json(null, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}
