import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const isPrefetch = request.headers.get('next-router-prefetch') != null
    || request.headers.get('purpose') === 'prefetch'
    || request.headers.get('sec-purpose') === 'prefetch';

  if (isPrefetch) {
    return new Response(null, { status: 204 });
  }

  const response = NextResponse.redirect(new URL('/login', request.url));

  response.cookies.set('session', '', {
    expires: new Date(0),
    httpOnly: true,
  });

  return response;
}
