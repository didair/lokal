'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
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
  item: {
    name: string;
    path: string;
    fileType: 'file' | 'dir';
  };
};

type Expiration = 'after-read' | '24h' | 'custom';

export function ShareDialog({ open, onOpenChange, item }: ShareDialogProps) {
  const [expiration, setExpiration] = useState<Expiration>('24h');
  const [customExpiresAt, setCustomExpiresAt] = useState('');
  const [publicLink, setPublicLink] = useState('');
  const [privateLink, setPrivateLink] = useState('');
  const [loading, setLoading] = useState(false);

  const createLinks = async () => {
    setLoading(true);
    const response = await fetch('/api/shares', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...item,
        expiration,
        customExpiresAt,
        origin: window.location.origin,
      }),
    });

    const body = await response.json();
    setPublicLink(body.publicLink ?? '');
    setPrivateLink(body.privateLink ?? '');
    setLoading(false);
  };

  const copy = async (link: string) => {
    if (link) {
      await navigator.clipboard.writeText(link);
    }
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
          <div className="grid gap-2">
            <Label>Link expiration</Label>
            <Select value={expiration} onValueChange={(value) => setExpiration(value as Expiration)}>
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
                onChange={(event) => setCustomExpiresAt(event.target.value)}
              />
            </div>
          ) : null}

          <Button onClick={createLinks} disabled={loading || (expiration === 'custom' && !customExpiresAt)}>
            {loading ? 'Creating links...' : 'Create share links'}
          </Button>

          <div className="grid gap-2">
            <Label htmlFor="public-link">Public link (open for everyone)</Label>
            <div className="flex gap-2">
              <Input id="public-link" value={publicLink} readOnly placeholder="Create links to generate" />
              <Button type="button" variant="secondary" size="icon" onClick={() => copy(publicLink)} disabled={!publicLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="private-link">Private link (only for other users)</Label>
            <div className="flex gap-2">
              <Input id="private-link" value={privateLink} readOnly placeholder="Create links to generate" />
              <Button type="button" variant="secondary" size="icon" onClick={() => copy(privateLink)} disabled={!privateLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
