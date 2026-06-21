'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingShares?: ShareSummary[];
  onSharesChange?: () => void;
  item: {
    name: string;
    path: string;
    fileType: 'file' | 'dir';
  };
};

type Expiration = 'after-read' | '24h' | 'custom';
type ShareAccess = 'public' | 'private';

type ShareUser = {
  id: string;
  name: string;
  email: string;
};

export type ShareSummary = {
  id: string;
  token: string;
  access: ShareAccess;
  path: string;
  recipientId: string | null;
  recipient: ShareUser | null;
  expiresAt: string | null;
  maxReads: number | null;
  readCount: number;
  createdAt: string;
  link: string;
};

function getExpirationLabel(share: ShareSummary) {
  if (share.maxReads === 1) {
    return share.readCount > 0 ? 'Used' : 'Expires after read';
  }

  if (share.expiresAt) {
    return `Expires ${new Date(share.expiresAt).toLocaleString()}`;
  }

  return 'No expiration';
}

export function ShareDialog({ open, onOpenChange, existingShares = [], onSharesChange, item }: ShareDialogProps) {
  const [access, setAccess] = useState<ShareAccess>('public');
  const [users, setUsers] = useState<ShareUser[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [expiration, setExpiration] = useState<Expiration>('24h');
  const [customExpiresAt, setCustomExpiresAt] = useState('');
  const [link, setLink] = useState('');
  const [copiedLink, setCopiedLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState('');

  useEffect(() => {
    setLink('');
    setCopiedLink('');
  }, [item.path, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    fetch('/api/share-users')
      .then((response) => response.json())
      .then((usersResponse) => {
        const nextUsers = usersResponse ?? [];
        setUsers(nextUsers);

        if (!recipientId && nextUsers.length > 0) {
          setRecipientId(nextUsers[0].id);
        }
      });
  }, [open, recipientId]);

  const createLink = async () => {
    setLoading(true);
    setLink('');
    setCopiedLink('');

    const response = await fetch('/api/shares', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...item,
        access,
        recipientId,
        expiration,
        customExpiresAt,
      }),
    });

    const body = await response.json();
    setLink(body.link ?? '');
    setLoading(false);
    onSharesChange?.();
  };

  const revokeShare = async (shareId: string) => {
    setRevokingId(shareId);

    await fetch('/api/shares', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: shareId }),
    });

    setRevokingId('');
    onSharesChange?.();
  };

  const copy = async (link: string) => {
    if (!link) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        setCopiedLink(link);
        return;
      }
    } catch {
      // Fall back to the selection-based copy below.
    }

    const textArea = document.createElement('textarea');
    textArea.value = link;
    textArea.readOnly = true;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, link.length);

    if (document.execCommand('copy')) {
      setCopiedLink(link);
      document.body.removeChild(textArea);
      return;
    }

    document.body.removeChild(textArea);
    window.prompt('Copy this link:', link);
  };

  const updateAccess = (nextAccess: ShareAccess) => {
    setAccess(nextAccess);
    setLink('');
    setCopiedLink('');

    if (nextAccess === 'private' && !recipientId && users.length > 0) {
      setRecipientId(users[0].id);
    }
  };

  const updateExpiration = (nextExpiration: Expiration) => {
    setExpiration(nextExpiration);
    setLink('');
    setCopiedLink('');
  };

  const generateDisabled = loading
    || (expiration === 'custom' && !customExpiresAt)
    || (access === 'private' && !recipientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-lokal-floating-ui>
        <DialogHeader>
          <DialogTitle>Share {item.name}</DialogTitle>
          <DialogDescription>
            Create a public link for anyone or a private link for signed-in users.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {existingShares.length > 0 ? (
            <div className="grid gap-2 rounded-md border p-3">
              <Label>Existing active links</Label>
              {existingShares.map((share) => {
                const shareUrl = share.link;

                return (
                  <div className="grid gap-1" key={share.id}>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">
                        {share.access} link
                        {share.access === 'private' ? ` shared with ${share.recipient?.name ?? share.recipient?.email ?? 'unknown user'}` : ''}
                      </span>
                      <span>{getExpirationLabel(share)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Input value={shareUrl} readOnly />
                      <Button type="button" variant="secondary" onClick={() => copy(shareUrl)}>
                        {copiedLink === shareUrl ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => revokeShare(share.id)}
                        disabled={revokingId === share.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {revokingId === share.id ? 'Revoking' : 'Revoke'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label>Link type</Label>
            <div className="grid grid-cols-2 rounded-md border p-1">
              <Button
                type="button"
                variant={access === 'public' ? 'default' : 'ghost'}
                onClick={() => updateAccess('public')}
              >
                Public
              </Button>
              <Button
                type="button"
                variant={access === 'private' ? 'default' : 'ghost'}
                onClick={() => updateAccess('private')}
              >
                Private
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {access === 'public'
                ? 'Anyone with the link can open it.'
                : 'Only signed-in users can open it.'}
            </p>
          </div>

          {access === 'private' ? (
            <div className="grid gap-2">
              <Label>Share with</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent data-lokal-floating-ui>
                  {users.map((user) => (
                    <SelectItem value={user.id} key={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {users.length === 0 ? (
                <p className="text-xs text-muted-foreground">There are no other users to share with yet.</p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label>Link expiration</Label>
            <Select value={expiration} onValueChange={(value) => updateExpiration(value as Expiration)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-lokal-floating-ui>
                <SelectItem value="after-read">After read</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {expiration === 'custom' ? (
            <div className="grid gap-2">
              <Label htmlFor="custom-expires-at">Custom expiration</Label>
              <Input
                id="custom-expires-at"
                type="datetime-local"
                value={customExpiresAt}
                onChange={(event) => {
                  setCustomExpiresAt(event.target.value);
                  setLink('');
                  setCopiedLink('');
                }}
              />
            </div>
          ) : null}

          <Button type="button" onClick={createLink} disabled={generateDisabled}>
            {loading ? 'Generating link...' : 'Generate link'}
          </Button>

          {link ? (
            <div className="grid gap-2">
              <Label htmlFor="share-link">Generated {access} link</Label>
              <div className="flex gap-2">
                <Input id="share-link" value={link} readOnly />
                <Button type="button" variant="secondary" onClick={() => copy(link)}>
                  {copiedLink === link ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
