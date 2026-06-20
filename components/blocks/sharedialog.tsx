'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
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

export type ShareSummary = {
  id: string;
  token: string;
  access: ShareAccess;
  path: string;
  expiresAt: string | null;
  maxReads: number | null;
  readCount: number;
  createdAt: string;
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
  const [expiration, setExpiration] = useState<Expiration>('24h');
  const [customExpiresAt, setCustomExpiresAt] = useState('');
  const [link, setLink] = useState('');
  const [copiedLink, setCopiedLink] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLink('');
    setCopiedLink('');
  }, [item.path, open]);

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
        expiration,
        customExpiresAt,
        origin: window.location.origin,
      }),
    });

    const body = await response.json();
    setLink(body.link ?? '');
    setLoading(false);
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
  };

  const updateExpiration = (nextExpiration: Expiration) => {
    setExpiration(nextExpiration);
    setLink('');
    setCopiedLink('');
  };

  const getShareUrl = (share: ShareSummary) => {
    const origin = typeof window === 'undefined' ? '' : window.location.origin;
    return `${origin}/share/${share.token}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
                const shareUrl = getShareUrl(share);

                return (
                  <div className="grid gap-1" key={share.id}>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{share.access} link</span>
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

          <div className="grid gap-2">
            <Label>Link expiration</Label>
            <Select value={expiration} onValueChange={(value) => updateExpiration(value as Expiration)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

          <Button type="button" onClick={createLink} disabled={loading || (expiration === 'custom' && !customExpiresAt)}>
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
