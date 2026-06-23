import { NextResponse } from 'next/server';
import { getPublicUrl } from '@/lib/public-url';

export function GET(request: Request) {
  const origin = getPublicUrl(request);

  return NextResponse.json({
    issuer: origin,
    apiBase: `${origin}/api/platform`,
    contracts: {
      openapi: `${origin}/contracts/openapi.json`,
      manifestSchema: `${origin}/contracts/lokal-manifest.schema.json`,
    },
    features: {
      auth: ['password-app-token', 'user-bound-app-token'],
      data: ['dynamic-collections', 'records', 'singleton-values'],
      files: false,
    },
  });
}
