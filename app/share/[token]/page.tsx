import fs from 'fs/promises';
import path from 'path';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Download, FileIcon, FolderIcon } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';
import { dataPath } from '@/lib/data-dir';
import { getFilesInDirectory } from '@/lib/file-utils';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { ShareTiming } from '@/components/blocks/sharetiming';
import { SharedFolderBrowser } from '@/components/blocks/sharedfolderbrowser';
import { getMimeType, getPreviewType } from '@/lib/mime';

export const dynamic = 'force-dynamic';

const SHARE_DESCRIPTION = 'A file was shared with you';

type SharePageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ path?: string; preview?: string }>;
};

type Share = NonNullable<Awaited<ReturnType<typeof getShare>>>;

type Preview = {
  previewType: 'image' | 'video' | 'pdf' | 'text' | 'unsupported';
  mimeType: string;
  text: string | null;
};

async function getShare(token: string) {
  const share = await prisma.share.findUnique({
    where: { token },
    include: { owner: { select: { name: true } } },
  });

  if (!share) return null;
  if (share.expiresAt && share.expiresAt < new Date()) return null;
  if (share.maxReads != null && share.readCount >= share.maxReads) return null;

  return share;
}

async function ensureCanViewShare(share: Share) {
  if (share.access !== 'private') {
    return;
  }

  const session = await getCurrentSession();
  const sessionUserId = (session as any)?.user?.id;

  if (!sessionUserId) {
    redirect('/login');
  }

  if (share.recipientId && share.recipientId !== sessionUserId && share.ownerId !== sessionUserId) {
    notFound();
  }
}

function cleanRelativePath(input?: string | null) {
  return (input ?? '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .filter((part) => part !== '.' && part !== '..')
    .join('/');
}

function joinRelativePath(base: string, child: string) {
  return cleanRelativePath(`${base}/${child}`);
}

function downloadUrl(token: string, childPath?: string, inline = false) {
  const params = new URLSearchParams();
  const cleanChildPath = cleanRelativePath(childPath);

  if (cleanChildPath) params.set('path', cleanChildPath);
  if (inline) params.set('inline', '1');

  const query = params.toString();
  return `/api/share/${token}/download${query ? `?${query}` : ''}`;
}

function resolveDirectorySharePath(share: Share, childPath?: string | null) {
  const rootPath = path.resolve(dataPath(share.ownerRootDir, share.path));
  const relativePath = cleanRelativePath(childPath);
  const targetPath = path.resolve(rootPath, relativePath);

  if (targetPath !== rootPath && !targetPath.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error('Invalid path');
  }

  return { rootPath, targetPath, relativePath };
}

async function getFilePreview(filePath: string): Promise<Preview> {
  const info = await fs.stat(filePath);
  const previewType = getPreviewType(filePath) as Preview['previewType'];
  const mimeType = getMimeType(filePath);
  let text: string | null = null;

  if (previewType === 'text' && info.size <= 1024 * 1024) {
    text = await fs.readFile(filePath, 'utf8');
  }

  return {
    previewType,
    mimeType,
    text,
  };
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  const share = await getShare(token);

  if (!share) {
    return {
      title: 'Shared file',
      description: SHARE_DESCRIPTION,
    };
  }

  const description = share.fileType === 'file' ? SHARE_DESCRIPTION : 'A folder was shared with you';

  return {
    title: share.name,
    description,
    openGraph: {
      title: share.name,
      description,
    },
  };
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
        <div className="flex flex-1 items-center justify-center">
          {children}
        </div>
        <footer className="pt-6 text-center text-xs text-zinc-400">
          Hosted with Lokal
        </footer>
      </div>
    </main>
  );
}

function FilePreview({ name, preview, src }: { name: string; preview: Preview; src: string }) {
  if (preview.previewType === 'image') {
    return (
      <div className="flex h-[62dvh] min-h-64 w-full items-center justify-center bg-white p-4">
        <img src={src} alt={name} className="h-full w-full object-contain" />
      </div>
    );
  }

  if (preview.previewType === 'video') {
    return (
      <div className="flex min-h-64 w-full items-center justify-center bg-black p-3">
        <video src={src} controls className="max-h-[62dvh] w-full rounded-lg" />
      </div>
    );
  }

  if (preview.previewType === 'pdf') {
    return (
      <div className="h-[70dvh] min-h-96 overflow-hidden bg-zinc-100">
        <iframe src={src} title={name} className="h-full w-full" />
      </div>
    );
  }

  if (preview.previewType === 'text') {
    return (
      <pre className="max-h-[62dvh] overflow-auto whitespace-pre-wrap bg-white p-4 text-sm leading-6 text-zinc-800">
        {preview.text ?? 'Text preview is too large to display.'}
      </pre>
    );
  }

  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 bg-white p-8 text-center text-sm text-zinc-500">
      <FileIcon className="h-10 w-10 text-zinc-300" />
      <span>No preview available for this file type.</span>
    </div>
  );
}

function DownloadButton({ href, label = 'Download file' }: { href: string; label?: string }) {
  return (
    <Button asChild className="h-11 rounded-xl px-5">
      <a href={href}>
        <Download className="mr-2 h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}

function OpenFileButton({ href, label = 'Open file' }: { href: string; label?: string }) {
  return (
    <Button asChild variant="ghost" className="h-11 rounded-xl px-4 text-zinc-600 hover:text-zinc-950">
      <a href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    </Button>
  );
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { token } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const browsePathParam = resolvedSearchParams.path;
  const share = await getShare(token);

  if (!share) {
    notFound();
  }

  await ensureCanViewShare(share);

  if (share.fileType === 'file') {
    const filePath = dataPath(share.ownerRootDir, share.path);
    const preview = await getFilePreview(filePath);

    return (
      <PageShell>
        <section className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/5">
          <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-950">{share.name}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                <ShareTiming
                  createdAt={share.createdAt.toISOString()}
                  expiresAt={share.expiresAt?.toISOString() ?? null}
                  expiresAfterDownload={share.maxReads === 1}
                  fallback={`Shared ${formatDate(share.createdAt)}`}
                />
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <OpenFileButton href={downloadUrl(share.token, undefined, true)} />
              <DownloadButton href={downloadUrl(share.token)} />
            </div>
          </div>
          <FilePreview name={share.name} preview={preview} src={downloadUrl(share.token, undefined, true)} />
        </section>
      </PageShell>
    );
  }

  const browsePath = cleanRelativePath(browsePathParam);
  const { targetPath } = resolveDirectorySharePath(share, browsePath);
  const ignoreDsStore = (await prisma.setting.findUnique({
    where: { id: 'files-ignore-ds-store' },
  }))?.value === 'true';
  const files = getFilesInDirectory(targetPath, { ignoreDsStore }).sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'dir' ? -1 : 1;
  });
  return (
    <PageShell>
      <section className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/5">
        <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
              <FolderIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-950">{share.name}</h1>
              <p className="mt-1 truncate text-sm text-zinc-500">
                {browsePath ? (
                  `/${browsePath}`
                ) : (
                  <ShareTiming
                    createdAt={share.createdAt.toISOString()}
                    expiresAt={share.expiresAt?.toISOString() ?? null}
                    expiresAfterDownload={share.maxReads === 1}
                    fallback={`Shared ${formatDate(share.createdAt)}`}
                  />
                )}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <DownloadButton href={downloadUrl(share.token, browsePath)} label="Download folder" />
          </div>
        </div>

        <SharedFolderBrowser
          token={share.token}
          browsePath={browsePath}
          files={files.map((file) => {
            const filePath = joinRelativePath(browsePath, file.name);
            return {
              ...file,
              date: file.date.toISOString(),
              path: filePath,
              previewType: file.type === 'file' ? (getPreviewType(filePath) as 'image' | 'video' | 'pdf' | 'text' | 'unsupported') : 'unsupported',
            };
          })}
        />
      </section>
    </PageShell>
  );
}
