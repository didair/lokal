import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/user';
import {
  createRawAppToken,
  hashToken,
  platformJson,
  platformOptions,
  registerAppManifestForUser,
} from '@/lib/platform';
import { getPublicUrl } from '@/lib/public-url';

export function OPTIONS() {
  return platformOptions();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email?.toString() ?? '';
    const password = body.password?.toString() ?? '';
    const manifest = body.manifest ?? body.lokalManifest ?? body.app;

    const user = await prisma.user.findFirst({
      where: {
        email,
        password: hashPassword(password),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return platformJson({ error: 'Invalid email or password' }, { status: 401 });
    }

    const app = await registerAppManifestForUser(user.id, manifest);
    const rawToken = createRawAppToken();
    const token = await prisma.appToken.create({
      data: {
        appId: app.id,
        userId: user.id,
        tokenHash: hashToken(rawToken),
        name: body.tokenName?.toString() || `${app.name} token`,
        scopes: ['data:read', 'data:write'],
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        createdAt: true,
      },
    });

    const origin = getPublicUrl(request);

    return platformJson({
      apiBase: `${origin}/api/platform`,
      app: {
        id: app.id,
        name: app.name,
        slug: app.slug,
        clientId: app.clientId,
        manifest: app.manifest,
      },
      user,
      token: {
        ...token,
        type: 'Bearer',
        rawToken,
      },
    });
  } catch (error) {
    return platformJson({ error: error instanceof Error ? error.message : 'Could not authenticate app' }, { status: 400 });
  }
}
