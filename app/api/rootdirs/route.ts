import { NextResponse } from "next/server"
import { getFilesInDirectory } from "@/lib/file-utils";
import { getCurrentSession } from "@/lib/user";
import { getServerIsSetup } from "@/lib/actions";
import prisma from "@/lib/prisma";
import { DATA_DIR, dataPath } from "@/lib/data-dir";
import path from "path";

function cleanRelativePath(input: string | null) {
	return (input ?? '')
		.replace(/\\/g, '/')
		.split('/')
		.filter(Boolean)
		.filter((part) => part !== '.' && part !== '..')
		.join('/');
}

function getParentPath(input: string) {
	const parts = cleanRelativePath(input).split('/').filter(Boolean);
	parts.pop();
	return parts.length ? `/${parts.join('/')}` : '/';
}

export async function GET(request: Request) {
	let valid = false;
	const isServerSetup = await getServerIsSetup();

	if (!isServerSetup) {
		valid = true;
	} else {
		const session = await getCurrentSession();
		const user = await prisma.user.findUnique({
			where: {
				id: (session?.user as any).id ?? '',
			},
			select: {
				role: true,
			}
		});

		valid = user != null && user.role == 'O';
	}

	if (!valid) {
		return NextResponse.json(null);
	}

	const url = new URL(request.url);
	const currentPath = cleanRelativePath(url.searchParams.get('path'));
	const rootPath = path.resolve(DATA_DIR);
	const targetPath = path.resolve(dataPath(currentPath));

	if (targetPath !== rootPath && !targetPath.startsWith(`${rootPath}${path.sep}`)) {
		return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
	}

	const setting = await prisma.setting.findUnique({ where: { id: 'files-ignore-ds-store' } });
	const dirs = getFilesInDirectory(targetPath, { ignoreDsStore: setting?.value === 'true' })
		.filter((file) => file.type === 'dir')
		.sort((a, b) => a.name.localeCompare(b.name));

	return NextResponse.json({
		path: currentPath ? `/${currentPath}` : '/',
		parent: currentPath ? getParentPath(currentPath) : null,
		dirs,
	});
};
