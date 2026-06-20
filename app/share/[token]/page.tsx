import { notFound, redirect } from 'next/navigation';
import { Download, FileIcon, FolderIcon } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/user';
import { dataPath } from '@/lib/data-dir';
import { getFilesInDirectory } from '@/lib/file-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type SharePageProps = {
  params: Promise<{ token: string }>;
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

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const share = await getShare(token);

  if (!share) {
    notFound();
  }

  if (share.access === 'private') {
    const session = await getCurrentSession();
    if (!(session as any)?.user?.id) {
      redirect('/login');
    }
  }

  if (share.fileType === 'file') {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileIcon className="h-5 w-5" />
              {share.name}
            </CardTitle>
            <CardDescription>Shared by {share.owner.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={`/api/share/${share.token}/download`}>
                <Download className="mr-2 h-4 w-4" />
                Download file
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const files = getFilesInDirectory(dataPath(share.ownerRootDir, share.path));

  if (share.maxReads != null) {
    await prisma.share.update({
      where: { id: share.id },
      data: { readCount: { increment: 1 } },
    });
  }

  return (
    <div className="min-h-screen p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderIcon className="h-5 w-5" />
            {share.name}
          </CardTitle>
          <CardDescription>Shared by {share.owner.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.name}>
                  <TableCell>{file.name}</TableCell>
                  <TableCell>{file.type === 'dir' ? 'Directory' : 'File'}</TableCell>
                  <TableCell>{formatDate(file.date)}</TableCell>
                  <TableCell>{file.type === 'dir' ? '-' : file.size}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
