export const dynamic = 'force-dynamic';

import { getInvite, registerAction } from '@/lib/actions';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type RegisterProps = {
  searchParams: Promise<{
    invite?: string;
  }>;
};

export default async function Register({ searchParams }: RegisterProps) {
  const { invite: inviteId } = await searchParams;
  const invite = inviteId ? await getInvite(inviteId) : null;

  if (invite == null || invite.used) {
    return null;
  }

  return (
    <div className="min-w-full min-h-full flex items-center justify-center py-6 overflow-auto">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign Up</CardTitle>
          <CardDescription>
            Welcome! Begin by filling in your details below
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={registerAction}>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" name="first-name" placeholder="Max" required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" name="last-name" placeholder="Robinson" required />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" />
              </div>

              <Input type="hidden" value={invite.id} name="inviteId" />

              <Button type="submit" className="w-full">
                Create an account
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
