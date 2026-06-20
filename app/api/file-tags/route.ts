import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';
import { dataPath } from '@/lib/data-dir';
import { getFileInfo } from '@/lib/file-utils';
import fs from 'fs';

function cleanPath(input: unknown) {
  const path = input?.toString().replace(/^\/+/, '') ?? '';
  const parts = path.split('/').filter(Boolean);

  if (parts.length === 0 || parts.some((part) => part === '..')) {
    throw new Error('Invalid path');
  }

  return parts.join('/');
}

async function getUserId() {
  const session = await getCurrentSession();
  return (session as any)?.user?.id as string | undefined;
}

export async function GET(request: Request) {
  const ownerId = await getUserId();

  if (!ownerId) {
    return NextResponse.json(null, { status: 401 });
  }

  const tagId = new URL(request.url).searchParams.get('tagId');

  if (tagId) {
    const user = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { rootDir: true },
    });

    const tag = await prisma.tag.findFirst({
      where: { id: tagId, ownerId },
    });

    if (!user || !tag) {
      return NextResponse.json({ tag: null, files: [] });
    }

    const taggedFiles = await prisma.fileTag.findMany({
      where: { ownerId, tagId },
      include: { tag: true },
      orderBy: { createdAt: 'asc' },
    });

    const files = taggedFiles.flatMap((fileTag) => {
      const fullPath = dataPath(user.rootDir, fileTag.path);

      if (!fs.existsSync(fullPath)) {
        return [];
      }

      return [{
        ...getFileInfo(fullPath),
        path: fileTag.path,
      }];
    });

    return NextResponse.json({ tag, files });
  }

  const fileTags = await prisma.fileTag.findMany({
    where: { ownerId },
    include: { tag: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(fileTags);
}

export async function POST(request: Request) {
  const ownerId = await getUserId();

  if (!ownerId) {
    return NextResponse.json(null, { status: 401 });
  }

  const body = await request.json();
  const path = cleanPath(body.path);
  const tagId = body.tagId?.toString();

  const tag = await prisma.tag.findFirst({
    where: { id: tagId, ownerId },
  });

  if (!tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  const fileTag = await prisma.fileTag.upsert({
    where: { ownerId_path_tagId: { ownerId, path, tagId: tag.id } },
    update: {},
    create: { ownerId, path, tagId: tag.id },
    include: { tag: true },
  });

  return NextResponse.json(fileTag);
}

export async function DELETE(request: Request) {
  const ownerId = await getUserId();

  if (!ownerId) {
    return NextResponse.json(null, { status: 401 });
  }

  const body = await request.json();
  const path = cleanPath(body.path);
  const tagId = body.tagId?.toString();

  await prisma.fileTag.deleteMany({
    where: { ownerId, path, tagId },
  });

  return NextResponse.json({ success: true });
}
