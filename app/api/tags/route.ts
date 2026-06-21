import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';

function getColor(value: unknown) {
  const color = value?.toString() || '#2563eb';
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#2563eb';
}

async function getUserId() {
  const session = await getCurrentSession();
  return (session as any)?.user?.id as string | undefined;
}

export async function GET() {
  const ownerId = await getUserId();

  if (!ownerId) {
    return NextResponse.json(null, { status: 401 });
  }

  const tags = await prisma.tag.findMany({
    where: { ownerId },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const ownerId = await getUserId();

  if (!ownerId) {
    return NextResponse.json(null, { status: 401 });
  }

  const body = await request.json();
  const name = body.name?.toString().trim();

  if (!name) {
    return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
  }

  const tag = await prisma.tag.upsert({
    where: { ownerId_name: { ownerId, name } },
    update: {},
    create: {
      ownerId,
      name,
      color: getColor(body.color),
    },
  });

  return NextResponse.json(tag);
}

export async function DELETE(request: Request) {
  const ownerId = await getUserId();

  if (!ownerId) {
    return NextResponse.json(null, { status: 401 });
  }

  const body = await request.json();
  const id = body.id?.toString();

  if (!id) {
    return NextResponse.json({ error: 'Tag id is required' }, { status: 400 });
  }

  const tag = await prisma.tag.findFirst({
    where: { id, ownerId },
    select: { id: true },
  });

  if (!tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.fileTag.deleteMany({ where: { ownerId, tagId: id } }),
    prisma.tag.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
