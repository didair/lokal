'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  manifest: { collections?: Record<string, unknown> } | null;
  clientId: string;
  tokens: AppToken[];
};

export function AppsManager() {
  const [apps, setApps] = useState<RegisteredApp[]>([]);
  const [message, setMessage] = useState('');

  const apiBase = useMemo(() => {
    if (typeof window === 'undefined') return '/api/platform';
    return `${window.location.origin}/api/platform`;
  }, []);

  async function loadApps() {
    const response = await fetch('/api/apps');
    if (!response.ok) {
      setMessage('Only admins and the owner can view apps.');
      return;
    }
    setApps(await response.json());
  }

  useEffect(() => {
    loadApps();
  }, []);

  async function revokeToken(appId: string, tokenId: string) {
    await fetch(`/api/apps/${appId}/tokens/${tokenId}`, { method: 'DELETE' });
    await loadApps();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white/75 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-1">
            <h3 className="text-base font-semibold text-zinc-950">External apps</h3>
            <p className="text-sm text-muted-foreground">
              Apps register themselves when a Lokal user authenticates from the external app. This list is for visibility and token management only.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={loadApps}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
        {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
      </div>

      <div className="space-y-3">
        {apps.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-muted-foreground">
            No apps registered yet. Apps will appear here after a user signs in to an external app through Lokal.
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
                {app.developerName ? <p className="mt-1 text-xs text-zinc-500">Developer: {app.developerName}</p> : null}
                <p className="mt-2 font-mono text-xs text-zinc-500">Client ID: {app.clientId}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Manifest collections</p>
                {app.manifest?.collections ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.keys(app.manifest.collections).map((collection) => (
                      <span key={collection} className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-600">
                        {collection}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-600">No manifest uploaded yet. It will appear after the app authenticates with Lokal.</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">API base</p>
                <code className="mt-2 block break-all rounded-lg bg-zinc-950 p-3 text-xs text-zinc-50">
                  {apiBase}/apps/{app.slug}/collections/:collection
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
