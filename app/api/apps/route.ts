import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';
import { createClientId, validateManifest } from '@/lib/platform';

async function getAdminUserId() {
  const session = await getCurrentSession();
  const user = (session as any)?.user;

  if (!user?.id || (user.role !== 'O' && user.role !== 'A')) {
    return null;
  }

  return user.id as string;
}

export async function GET() {
  const userId = await getAdminUserId();

  if (!userId) {
    return NextResponse.json(null, { status: 403 });
  }

  const apps = await prisma.app.findMany({
    include: {
      datasets: { orderBy: { name: 'asc' } },
      tokens: {
        where: { revokedAt: null },
        select: {
          id: true,
          name: true,
          scopes: true,
          expiresAt: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(apps);
}

export async function POST(request: Request) {
  const userId = await getAdminUserId();

  if (!userId) {
    return NextResponse.json(null, { status: 403 });
  }

  try {
    const body = await request.json();
    const manifest = validateManifest(body.manifest ?? body);

    const app = await prisma.app.upsert({
      where: { slug: manifest.slug },
      update: {
        name: manifest.name,
        description: manifest.description,
        developerName: manifest.developerName,
        enabled: true,
      },
      create: {
        name: manifest.name,
        slug: manifest.slug,
        description: manifest.description,
        developerName: manifest.developerName,
        clientId: createClientId(),
        createdById: userId,
      },
    });

    await prisma.$transaction(manifest.datasets.map((dataset) => prisma.appDataset.upsert({
      where: { appId_name: { appId: app.id, name: dataset.name } },
      update: {
        kind: dataset.kind,
        schema: dataset.schema as any,
      },
      create: {
        appId: app.id,
        name: dataset.name,
        kind: dataset.kind,
        schema: dataset.schema as any,
      },
    })));

    const updatedApp = await prisma.app.findUnique({
      where: { id: app.id },
      include: {
        datasets: { orderBy: { name: 'asc' } },
        tokens: {
          where: { revokedAt: null },
          select: {
            id: true,
            name: true,
            scopes: true,
            expiresAt: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json(updatedApp);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid manifest' }, { status: 400 });
  }
}
