'use client';

import { useEffect, useState } from 'react';

type ShareTimingProps = {
  createdAt: string;
  expiresAt?: string | null;
  expiresAfterDownload?: boolean;
  fallback: string;
};

function formatBrowserDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function ShareTiming({ createdAt, expiresAt, expiresAfterDownload = false, fallback }: ShareTimingProps) {
  const [label, setLabel] = useState(fallback);

  useEffect(() => {
    const parts = [`Shared ${formatBrowserDateTime(createdAt)}`];

    if (expiresAfterDownload) {
      parts.push('Expires after download');
    } else if (expiresAt) {
      parts.push(`Expires ${formatBrowserDateTime(expiresAt)}`);
    }

    setLabel(parts.join(' · '));
  }, [createdAt, expiresAfterDownload, expiresAt]);

  return <span>{label}</span>;
}
