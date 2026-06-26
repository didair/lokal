import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';

async function isAdmin() {
  const session = await getCurrentSession();
  const user = (session as any)?.user;
  return user?.id && (user.role === 'O' || user.role === 'A');
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ appId: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json(null, { status: 403 });
  }

  const { appId } = await params;
  const result = await prisma.app.deleteMany({ where: { id: appId } });

  if (result.count === 0) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
