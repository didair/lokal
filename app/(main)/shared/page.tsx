import Link from 'next/link';
import { FileIcon, FolderIcon, UsersIcon } from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSharedWithMe } from '@/lib/actions';
import { formatDate } from '@/lib/utils';

export default async function SharedWithMePage() {
  const shares = await getSharedWithMe();

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Lokal</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator>/</BreadcrumbSeparator>

          <BreadcrumbItem>
            <BreadcrumbPage>Shared with me</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">Shared with me</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Files and folders other Lokal users have shared privately with you.
        </p>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Shared by</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shares.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
                    <UsersIcon className="h-8 w-8 text-rose-500" />
                    <span className="text-sm font-semibold text-zinc-700">Nothing has been shared with you yet.</span>
                    <span className="max-w-sm text-xs leading-5 text-muted-foreground">Private links from other users will appear here.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
            {shares.map((share) => (
              <TableRow key={share.id} className="h-14">
                <TableCell>
                  <Link href={`/share/${share.token}`} className="flex items-center gap-2 font-medium">
                    {share.fileType === 'dir' ? (
                      <FolderIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                    {share.name}
                  </Link>
                </TableCell>
                <TableCell>{share.owner.name}</TableCell>
                <TableCell>{formatDate(share.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
