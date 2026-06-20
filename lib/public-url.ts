export function getPublicUrl(request?: Request) {
  const configuredUrl = process.env.LOKAL_PUBLIC_URL || process.env.NEXT_PUBLIC_LOKAL_PUBLIC_URL;
  const fallbackUrl = request ? new URL(request.url).origin : '';
  let publicUrl = (configuredUrl || fallbackUrl).trim();

  if (publicUrl && !/^https?:\/\//i.test(publicUrl)) {
    publicUrl = `https://${publicUrl}`;
  }

  return publicUrl.replace(/\/+$/, '');
}
