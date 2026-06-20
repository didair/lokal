'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, RefreshCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AppDataset = {
  id: string;
  name: string;
  kind: string;
};

type AppToken = {
  id: string;
  name: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
};

type RegisteredApp = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  developerName: string | null;
  clientId: string;
  datasets: AppDataset[];
  tokens: AppToken[];
};

const exampleManifest = JSON.stringify(
  {
    name: 'Recipe Box',
    slug: 'recipe-box',
    description: 'Stores private recipe data in Lokal.',
    developerName: 'Example Dev',
    datasets: [
      {
        name: 'recipes',
        kind: 'collection',
        schema: { title: 'string', body: 'string', tags: ['string'] },
      },
      {
        name: 'settings',
        kind: 'singleton',
        schema: { theme: 'string' },
      },
    ],
  },
  null,
  2,
);

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function AppsManager() {
  const [apps, setApps] = useState<RegisteredApp[]>([]);
  const [manifest, setManifest] = useState(exampleManifest);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const apiBase = useMemo(() => {
    if (typeof window === 'undefined') return '/api/platform';
    return `${window.location.origin}/api/platform`;
  }, []);

  async function loadApps() {
    const response = await fetch('/api/apps');
    if (!response.ok) {
      setMessage('Only admins and the owner can manage apps.');
      return;
    }
    setApps(await response.json());
  }

  useEffect(() => {
    loadApps();
  }, []);

  async function saveManifest() {
    setLoading(true);
    setMessage('');
    setToken('');

    try {
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest: JSON.parse(manifest) }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || 'Could not save app');
      }

      setMessage(`Saved ${body.name}.`);
      await loadApps();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Invalid manifest');
    } finally {
      setLoading(false);
    }
  }

  async function createToken(appId: string) {
    setMessage('');
    const response = await fetch(`/api/apps/${appId}/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Development token' }),
    });
    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error || 'Could not create token');
      return;
    }

    setToken(body.rawToken);
    setMessage('Token created. Copy it now; it will not be shown again.');
    await loadApps();
  }

  async function revokeToken(appId: string, tokenId: string) {
    await fetch(`/api/apps/${appId}/tokens/${tokenId}`, { method: 'DELETE' });
    await loadApps();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        <Label htmlFor="app-manifest">App manifest</Label>
        <textarea
          id="app-manifest"
          value={manifest}
          onChange={(event) => setManifest(event.target.value)}
          className="min-h-72 rounded-xl border border-zinc-200 bg-white/80 p-4 font-mono text-xs leading-5 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={saveManifest} disabled={loading}>
            {loading ? 'Saving...' : 'Register / update app'}
          </Button>
          <Button type="button" variant="outline" onClick={loadApps}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </div>

      {token ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Label htmlFor="app-token">New token</Label>
          <div className="mt-2 flex gap-2">
            <Input id="app-token" readOnly value={token} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={() => copyText(token)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {apps.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-muted-foreground">
            No apps registered yet. Paste a manifest above to create the first app.
          </p>
        ) : null}

        {apps.map((app) => (
          <div key={app.id} className="rounded-xl border border-zinc-200 bg-white/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-zinc-950">{app.name}</h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-600">{app.slug}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{app.description || 'No description'}</p>
                <p className="mt-2 font-mono text-xs text-zinc-500">Client ID: {app.clientId}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => createToken(app.id)}>
                <KeyRound className="mr-2 h-4 w-4" /> Create token
              </Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Datasets</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {app.datasets.map((dataset) => (
                    <span key={dataset.id} className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600">
                      {dataset.name} · {dataset.kind}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">API base</p>
                <code className="mt-2 block break-all rounded-lg bg-zinc-950 p-3 text-xs text-zinc-50">
                  {apiBase}/apps/{app.slug}/datasets/:dataset
                </code>
              </div>
            </div>

            {app.tokens.length ? (
              <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Active tokens</p>
                {app.tokens.map((appToken) => (
                  <div key={appToken.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                    <span>
                      {appToken.name} · {appToken.user.name} ({appToken.user.email})
                    </span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => revokeToken(app.id, appToken.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Revoke
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
