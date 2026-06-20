import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';

async function isAdmin() {
  const session = await getCurrentSession();
  const user = (session as any)?.user;
  return user?.id && (user.role === 'O' || user.role === 'A');
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ appId: string; tokenId: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json(null, { status: 403 });
  }

  const { appId, tokenId } = await params;

  await prisma.appToken.updateMany({
    where: { id: tokenId, appId },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
