import { NextResponse } from 'next/server';
import { getPublicUrl } from '@/lib/public-url';

export function GET(request: Request) {
  const origin = getPublicUrl(request);

  return NextResponse.json({
    issuer: origin,
    apiBase: `${origin}/api/platform`,
    features: {
      auth: ['user-bound-app-token'],
      datasets: ['collection', 'singleton'],
      files: false,
    },
  });
}
