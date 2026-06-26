"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountSettings({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const saveAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError('');
    setSuccess('');

    const formData = new FormData(form);
    const response = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name')?.toString() ?? '',
        email: formData.get('email')?.toString() ?? '',
        password: formData.get('password')?.toString() ?? '',
        confirmPassword: formData.get('confirmPassword')?.toString() ?? '',
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(body.error || 'Could not update account');
      return;
    }

    form.reset();
    setSuccess('Account updated.');
    router.refresh();
  };

  return (
    <form className="grid gap-5" onSubmit={saveAccount}>
      <div className="grid gap-2">
        <Label htmlFor="account-name">Name</Label>
        <Input id="account-name" name="name" defaultValue={user.name} autoComplete="name" required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="account-email">Email</Label>
        <Input id="account-email" name="email" type="email" defaultValue={user.email} autoComplete="email" required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="account-password">New password</Label>
        <Input id="account-password" name="password" type="password" autoComplete="new-password" placeholder="Leave blank to keep current password" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="account-confirm-password">Confirm new password</Label>
        <Input id="account-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repeat new password" />
      </div>

      {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
      {success ? <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

      <div className="flex">
        <Button className="ml-auto" disabled={saving}>{saving ? 'Saving...' : 'Save account'}</Button>
      </div>
    </form>
  );
}
