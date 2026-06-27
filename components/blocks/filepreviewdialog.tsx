"use client";

import { useEffect, useState } from "react";
import { Download, FileIcon, Info, PanelRightOpen, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShareDialog, type ShareSummary } from "./sharedialog";
import { TagSelector, type Tag } from "./tagselector";

type FileDetails = {
  metadata: Record<string, string | number | boolean>;
  previewType: 'image' | 'video' | 'pdf' | 'text' | 'unsupported';
  text: string | null;
  rawUrl: string;
};

export function FilePreviewDialog({
  open,
  onOpenChange,
  file,
  tags = [],
  assignedTags = [],
  activeShares = [],
  onTagsChange = () => null,
  onSharesChange = () => null,
  showTags = tags.length > 0 || assignedTags.length > 0,
  showShare = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: { name: string; path: string } | null;
  tags?: Tag[];
  assignedTags?: Tag[];
  activeShares?: ShareSummary[];
  onTagsChange?: () => void;
  onSharesChange?: () => void;
  showTags?: boolean;
  showShare?: boolean;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [previewError, setPreviewError] = useState('');

  const itemPath = file?.path ?? '';
  const fileName = file?.name ?? 'File';

  const refreshTagAndShareData = () => {
    onTagsChange();
    onSharesChange();
  };

  const keepPreviewOpenForFloatingUi = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (shareOpen || target?.closest('[data-lokal-floating-ui]')) {
      event.preventDefault();
    }
  };

  const updatePreviewOpen = (nextOpen: boolean) => {
    if (!nextOpen && shareOpen) {
      return;
    }

    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!open || !itemPath) {
      return;
    }

    setMetadataOpen(false);
    setFileDetails(null);
    setPreviewError('');

    const controller = new AbortController();

    fetch(`/api/files?path=${encodeURIComponent(itemPath)}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error || 'Could not open file');
        }

        setFileDetails(body);
      })
      .catch((openError) => {
        if (openError instanceof DOMException && openError.name === 'AbortError') {
          return;
        }

        setPreviewError(openError instanceof Error ? openError.message : 'Could not open file');
      });

    return () => controller.abort();
  }, [itemPath, open]);

  return (
    <>
      <Dialog open={open} onOpenChange={updatePreviewOpen}>
        <DialogContent
          className="max-h-[90dvh] max-w-5xl overflow-hidden p-0"
          onInteractOutside={keepPreviewOpenForFloatingUi}
          onPointerDownOutside={keepPreviewOpenForFloatingUi}
          onFocusOutside={keepPreviewOpenForFloatingUi}
        >
          <div className="flex max-h-[90dvh] min-h-[70dvh] flex-col">
            <DialogHeader className="border-b border-zinc-200/80 px-5 py-4 pr-16">
              <DialogTitle className="flex items-start gap-2 text-left leading-snug">
                <FileIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-words pr-2">{fileName}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex min-h-0 items-center justify-center overflow-auto bg-zinc-50/70 p-4">
                {previewError ? (
                  <div className="flex h-full min-h-64 items-center justify-center text-sm text-red-600">{previewError}</div>
                ) : null}

                {!previewError && !fileDetails ? (
                  <div className="flex h-full min-h-64 items-center justify-center text-sm text-muted-foreground">Opening file...</div>
                ) : null}

                {fileDetails?.previewType === 'image' ? (
                  <div className="flex h-[62dvh] min-h-64 w-full items-center justify-center">
                    <img
                      src={fileDetails.rawUrl}
                      alt={fileName}
                      className="h-full w-full max-w-4xl rounded-xl object-contain shadow-sm"
                    />
                  </div>
                ) : null}

                {fileDetails?.previewType === 'video' ? (
                  <div className="flex min-h-64 items-center justify-center">
                    <video src={fileDetails.rawUrl} controls className="max-h-[62dvh] max-w-full rounded-xl bg-black shadow-sm" />
                  </div>
                ) : null}

                {fileDetails?.previewType === 'pdf' ? (
                  <div className="h-[62dvh] min-h-64 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <iframe src={fileDetails.rawUrl} title={fileName} className="h-full w-full" />
                  </div>
                ) : null}

                {fileDetails?.previewType === 'text' ? (
                  <pre className="max-h-[62dvh] w-full max-w-3xl overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-800 shadow-sm">
                    {fileDetails.text ?? 'Text preview is too large to display.'}
                  </pre>
                ) : null}

                {fileDetails?.previewType === 'unsupported' ? (
                  <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                    <FileIcon className="h-10 w-10 text-zinc-300" />
                    <span>No preview available for this file type.</span>
                    <Button asChild variant="outline">
                      <a href={`/file/u?path=${encodeURIComponent(itemPath)}`} target="_blank" rel="noreferrer">Download file</a>
                    </Button>
                  </div>
                ) : null}
              </div>

              {metadataOpen ? (
                <aside className="min-h-0 w-full overflow-auto border-l border-zinc-200 bg-white p-4 md:w-72">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <Info className="h-4 w-4" />
                    Metadata
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(fileDetails?.metadata ?? {}).map(([key, value]) => (
                        <tr key={key} className="border-b border-zinc-100 last:border-0">
                          <td className="py-2 pr-3 text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{key}</td>
                          <td className="break-all py-2 text-right text-zinc-700">{String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </aside>
              ) : null}
            </div>

            <DialogFooter className="gap-3 border-t border-zinc-200/80 px-5 py-3 sm:items-center sm:justify-between" onClick={(event) => event.stopPropagation()}>
              {showTags ? (
                <div className="flex min-w-0 flex-1 items-center gap-2" onClick={(event) => event.stopPropagation()}>
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Tags</span>
                  <TagSelector
                    path={itemPath}
                    tags={tags}
                    assignedTags={assignedTags}
                    onChange={refreshTagAndShareData}
                  />
                </div>
              ) : <div className="flex-1" />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" asChild>
                  <a href={`/file/u?path=${encodeURIComponent(itemPath)}`} target="_blank" rel="noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
                {showShare ? (
                  <Button type="button" onClick={() => setShareOpen(true)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={() => setMetadataOpen((value) => !value)}>
                  <PanelRightOpen className="mr-2 h-4 w-4" />
                  {metadataOpen ? 'Hide details' : 'Details'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {file ? (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          item={{
            name: file.name,
            path: file.path,
            fileType: 'file',
          }}
          existingShares={activeShares}
          onSharesChange={onSharesChange}
        />
      ) : null}
    </>
  );
}
