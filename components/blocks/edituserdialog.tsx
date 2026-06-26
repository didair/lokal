"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DirectorySelect } from "@/components/ui/dirinput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  rootDir: string;
};

export function EditUserDialog({ user, children }: { user: EditableUser; children?: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(user.role === 'A' ? 'A' : 'U');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isOwner = user.role === 'O';

  const updateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name')?.toString() ?? '',
        email: formData.get('email')?.toString() ?? '',
        rootDir: formData.get('rootDir')?.toString() ?? '/',
        role: isOwner ? 'O' : role,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(body.error || 'Could not update user');
      return;
    }

    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${user.name}`}>
            <Pen className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={updateUser} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update account details and which folder this user can access.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`user-name-${user.id}`}>Name</Label>
              <Input id={`user-name-${user.id}`} name="name" defaultValue={user.name} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`user-email-${user.id}`}>Email</Label>
              <Input id={`user-email-${user.id}`} name="email" type="email" defaultValue={user.email} required />
            </div>

            <div className="grid gap-2">
              <Label>Root directory</Label>
              <DirectorySelect defaultValue={user.rootDir || '/'} />
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              {isOwner ? (
                <Input value="Owner" disabled />
              ) : (
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="U">User</SelectItem>
                    <SelectItem value="A">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
