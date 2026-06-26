import Link from 'next/link';
import { FileIcon, FolderIcon, Globe2Icon, LockIcon, UsersIcon } from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSharedPageData } from '@/lib/actions';
import { ItemTableRow } from '@/components/blocks/itemtablerow';
import { cn, formatDate } from '@/lib/utils';

function getAccessLabel(share: { access: string; recipient?: { name: string; email: string } | null }) {
  if (share.access === 'private') {
    return share.recipient?.name || share.recipient?.email || 'Private link';
  }

  return 'Anyone with link';
}

function getExpirationLabel(share: { expiresAt: Date | null; maxReads: number | null; readCount: number }) {
  if (share.maxReads != null) {
    const remaining = Math.max(share.maxReads - share.readCount, 0);
    return remaining === 1 ? 'After next open' : `${remaining} opens left`;
  }

  if (share.expiresAt) {
    return formatDate(share.expiresAt);
  }

  return 'Never';
}

type SharedPageProps = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function SharedPage({ searchParams }: SharedPageProps) {
  const { view } = searchParams ? await searchParams : { view: undefined };
  const activeView = view === 'by-me' ? 'by-me' : 'with-me';
  const { sharedWithMe, sharedByMe } = await getSharedPageData();

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Lokal</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator>/</BreadcrumbSeparator>

          <BreadcrumbItem>
            <BreadcrumbPage>Shared</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">Shared</h1>
      </div>

      <div className="flex w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
        <Link
          href="/shared"
          className={cn(
            'flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
            activeView === 'with-me' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
          )}
          prefetch={false}
        >
          Shared with me
          <span className="ml-2 rounded-full bg-white/15 px-1.5 text-xs">{sharedWithMe.length}</span>
        </Link>
        <Link
          href="/shared?view=by-me"
          className={cn(
            'flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
            activeView === 'by-me' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
          )}
          prefetch={false}
        >
          Shared by me
          <span className="ml-2 rounded-full bg-white/15 px-1.5 text-xs">{sharedByMe.length}</span>
        </Link>
      </div>

      {activeView === 'with-me' ? (
        <section className="grid gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">Shared with me</h2>
              <p className="text-sm text-muted-foreground">Private items other users have shared with your account.</p>
            </div>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-500">
              {sharedWithMe.length} item{sharedWithMe.length === 1 ? '' : 's'}
            </span>
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Shared by</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="hidden md:table-cell">Size</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sharedWithMe.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-center">
                        <UsersIcon className="h-8 w-8 text-rose-500" />
                        <span className="text-sm font-semibold text-zinc-700">Nothing has been shared with you yet.</span>
                        <span className="max-w-sm text-xs leading-5 text-muted-foreground">Private links from other users will appear here.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}

                {sharedWithMe.map((share) => (
                  <ItemTableRow
                    key={share.id}
                    file={{
                      name: share.name,
                      type: share.fileType === 'dir' ? 'dir' : 'file',
                      date: share.createdAt,
                      size: '-',
                    }}
                    currentPath="/"
                    itemPath={share.path}
                    secondaryCell={share.owner.name}
                    href={`/share/${share.token}`}
                    actions="shared"
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      ) : (
        <section className="grid gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">Shared by me</h2>
              <p className="text-sm text-muted-foreground">Active public and private links created from your files.</p>
            </div>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-500">
              {sharedByMe.length} link{sharedByMe.length === 1 ? '' : 's'}
            </span>
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Access</TableHead>
                  <TableHead className="hidden lg:table-cell">Shared with</TableHead>
                  <TableHead className="hidden md:table-cell">Expires</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-right">Link</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sharedByMe.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-center">
                        <Globe2Icon className="h-8 w-8 text-rose-500" />
                        <span className="text-sm font-semibold text-zinc-700">You have no active share links.</span>
                        <span className="max-w-sm text-xs leading-5 text-muted-foreground">Use right click → Share on a file or folder to create one.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}

                {sharedByMe.map((share) => (
                  <TableRow key={share.id} className="h-auto md:h-14">
                    <TableCell className="py-2 md:py-2">
                      <div className="flex items-start gap-2 md:items-center">
                        {share.fileType === 'dir' ? (
                          <FolderIcon className="mt-2 h-4 w-4 shrink-0 text-muted-foreground md:mt-0" />
                        ) : (
                          <FileIcon className="mt-2 h-4 w-4 shrink-0 text-muted-foreground md:mt-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <Link href={`/share/${share.token}`} className="break-all font-medium" prefetch={false}>
                            {share.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground md:hidden">
                            <span>{share.access === 'private' ? 'Private' : 'Public'}</span>
                            <span>•</span>
                            <span>{getAccessLabel(share)}</span>
                            <span>•</span>
                            <span>Expires {getExpirationLabel(share)}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600">
                        {share.access === 'private' ? <LockIcon className="h-3.5 w-3.5" /> : <Globe2Icon className="h-3.5 w-3.5" />}
                        {share.access === 'private' ? 'Private' : 'Public'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden break-all text-muted-foreground lg:table-cell">{getAccessLabel(share)}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{getExpirationLabel(share)}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(share.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/share/${share.token}`} prefetch={false}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}
    </>
  );
}
