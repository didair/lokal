import { authenticateAction } from '@/lib/actions';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type LoginProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function Login({ searchParams }: LoginProps) {
  const { error } = await searchParams;

  return (
    <div className="min-w-full min-h-full flex items-center justify-center py-6 overflow-auto">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account.</CardDescription>
        </CardHeader>

        <form action={authenticateAction}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-4">
            <Button className="w-full">Sign in</Button>
            {error ? <div className="text-sm font-medium text-red-500">Invalid email or password.</div> : null}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
