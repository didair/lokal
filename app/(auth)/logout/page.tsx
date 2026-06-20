export const dynamic = 'force-dynamic';

import { logoutAction } from '@/lib/actions';

export default async function LogoutPage() {
  await logoutAction();
}
