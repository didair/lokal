'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, ExternalLink, FileIcon, FolderIcon, FolderUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

type PreviewType = 'image' | 'video' | 'pdf' | 'text' | 'unsupported';

type SharedFolderItem = {
  name: string;
  size: string;
  date: string;
  type: 'other' | 'file' | 'dir';
  path: string;
  previewType: PreviewType;
};

type SharedFolderBrowserProps = {
  token: string;
  browsePath: string;
  files: SharedFolderItem[];
};

function cleanRelativePath(input?: string | null) {
  return (input ?? '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .filter((part) => part !== '.' && part !== '..')
    .join('/');
}

function parentRelativePath(input: string) {
  const parts = cleanRelativePath(input).split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

function sharePathUrl(token: string, browsePath?: string) {
  const cleanBrowsePath = cleanRelativePath(browsePath);
  return cleanBrowsePath ? `/share/${token}?path=${encodeURIComponent(cleanBrowsePath)}` : `/share/${token}`;
}

function downloadUrl(token: string, childPath?: string, inline = false) {
  const params = new URLSearchParams();
  const cleanChildPath = cleanRelativePath(childPath);

  if (cleanChildPath) params.set('path', cleanChildPath);
  if (inline) params.set('inline', '1');

  const query = params.toString();
  return `/api/share/${token}/download${query ? `?${query}` : ''}`;
}

function PreviewContent({ file, token }: { file: SharedFolderItem; token: string }) {
  const src = downloadUrl(token, file.path, true);

  if (file.previewType === 'image') {
    return (
      <div className="flex h-[62dvh] min-h-64 w-full items-center justify-center overflow-auto bg-zinc-50/70 p-4">
        <img src={src} alt={file.name} className="h-full w-full object-contain" />
      </div>
    );
  }

  if (file.previewType === 'video') {
    return (
      <div className="flex min-h-64 w-full items-center justify-center overflow-auto bg-black p-3">
        <video src={src} controls className="max-h-[62dvh] w-full rounded-lg" />
      </div>
    );
  }

  if (file.previewType === 'pdf' || file.previewType === 'text') {
    return (
      <div className="h-[70dvh] min-h-96 overflow-hidden bg-zinc-100">
        <iframe src={src} title={file.name} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 bg-white p-8 text-center text-sm text-zinc-500">
      <FileIcon className="h-10 w-10 text-zinc-300" />
      <span>No preview available for this file type.</span>
    </div>
  );
}

export function SharedFolderBrowser({ token, browsePath, files }: SharedFolderBrowserProps) {
  const [previewFile, setPreviewFile] = useState<SharedFolderItem | null>(null);

  useEffect(() => {
    setPreviewFile(null);
  }, [browsePath]);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="hidden sm:table-cell">Size</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {browsePath ? (
            <TableRow className="h-auto md:h-14">
              <TableCell className="py-2 font-medium text-zinc-900">
                <Link href={sharePathUrl(token, parentRelativePath(browsePath))} className="inline-flex items-center gap-2 hover:underline">
                  <FolderUp className="h-4 w-4 text-zinc-400" />
                  ..
                </Link>
              </TableCell>
              <TableCell className="hidden py-2 sm:table-cell" />
              <TableCell className="hidden py-2 sm:table-cell" />
            </TableRow>
          ) : null}

          {files.map((file) => {
            const isDir = file.type === 'dir';

            return (
              <TableRow key={file.path} className="h-auto md:h-14">
                <TableCell className="py-2 font-medium text-zinc-900">
                  {isDir ? (
                    <Link href={sharePathUrl(token, file.path)} className="inline-flex items-center gap-2 hover:underline">
                      <FolderIcon className="h-4 w-4 text-zinc-400" />
                      {file.name}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="inline-flex items-center gap-2 text-left font-medium hover:underline"
                    >
                      <FileIcon className="h-4 w-4 text-zinc-400" />
                      {file.name}
                    </button>
                  )}
                </TableCell>
                <TableCell className="hidden py-2 sm:table-cell">{formatDate(new Date(file.date))}</TableCell>
                <TableCell className="hidden py-2 sm:table-cell">{isDir ? '-' : file.size}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={previewFile != null} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-h-[90dvh] max-w-5xl overflow-hidden p-0">
          {previewFile ? (
            <div className="flex max-h-[90dvh] min-h-[70dvh] flex-col">
              <DialogHeader className="border-b border-zinc-200/80 px-5 py-4 pr-16">
                <DialogTitle className="flex items-start gap-2 text-left leading-snug">
                  <FileIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-words pr-2">{previewFile.name}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-auto">
                <PreviewContent file={previewFile} token={token} />
              </div>

              <DialogFooter className="gap-2 border-t border-zinc-200/80 px-5 py-3 sm:items-center sm:justify-end">
                <Button asChild variant="ghost" className="rounded-xl text-zinc-600 hover:text-zinc-950">
                  <a href={downloadUrl(token, previewFile.path, true)} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open file
                  </a>
                </Button>
                <Button asChild className="rounded-xl">
                  <a href={downloadUrl(token, previewFile.path)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download file
                  </a>
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
