import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';
import { createClientId, registerAppManifestForUser, validateAppRegistration, validateLokalAppManifest } from '@/lib/platform';

async function getAdminUserId() {
  const session = await getCurrentSession();
  const user = (session as any)?.user;

  if (!user?.id || (user.role !== 'O' && user.role !== 'A')) {
    return null;
  }

  return user.id as string;
}

const appInclude = {
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
    orderBy: { createdAt: 'desc' as const },
  },
};

export async function GET() {
  const userId = await getAdminUserId();

  if (!userId) {
    return NextResponse.json(null, { status: 403 });
  }

  const apps = await prisma.app.findMany({
    include: appInclude,
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
    const payload = body.manifest ?? body.app ?? body;
    const hasManifest = Boolean(payload?.collections);

    if (hasManifest) {
      await registerAppManifestForUser(userId, payload);
    } else {
      const registration = validateAppRegistration(payload);

      await prisma.app.upsert({
        where: { slug: registration.slug },
        update: {
          name: registration.name,
          description: registration.description,
          developerName: registration.developerName,
          enabled: true,
        },
        create: {
          name: registration.name,
          slug: registration.slug,
          description: registration.description,
          developerName: registration.developerName,
          clientId: createClientId(),
          createdById: userId,
        },
      });
    }

    const app = await prisma.app.findUnique({
      where: { slug: hasManifest ? validateLokalAppManifest(payload).slug : validateAppRegistration(payload).slug },
      include: appInclude,
    });

    return NextResponse.json(app);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid app registration' }, { status: 400 });
  }
}
