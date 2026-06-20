import Link from 'next/link';
import { UsersIcon } from 'lucide-react';
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

      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Shared with me</h1>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Shared by</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shares.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Nothing has been shared with you yet.
                </TableCell>
              </TableRow>
            ) : null}
            {shares.map((share) => (
              <TableRow key={share.id}>
                <TableCell>
                  <Link href={`/share/${share.token}`} className="flex items-center gap-2 font-medium">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    {share.name}
                  </Link>
                </TableCell>
                <TableCell>{share.fileType === 'dir' ? 'Directory' : 'File'}</TableCell>
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
