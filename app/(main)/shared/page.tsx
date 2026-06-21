import { UsersIcon } from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSharedWithMe } from '@/lib/actions';
import { ItemTableRow } from '@/components/blocks/itemtablerow';

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
            {shares.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
                    <UsersIcon className="h-8 w-8 text-rose-500" />
                    <span className="text-sm font-semibold text-zinc-700">Nothing has been shared with you yet.</span>
                    <span className="max-w-sm text-xs leading-5 text-muted-foreground">Private links from other users will appear here.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
            {shares.map((share) => (
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
    </>
  );
}
