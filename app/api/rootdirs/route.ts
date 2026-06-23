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

async function getSessionUser() {
	const session = await getCurrentSession();
	return prisma.user.findUnique({
		where: {
			id: (session?.user as any).id ?? '',
		},
		select: {
			id: true,
			role: true,
			rootDir: true,
		},
	});
}

async function canBrowseDataRoot() {
	const isServerSetup = await getServerIsSetup();

	if (!isServerSetup) {
		return true;
	}

	const user = await getSessionUser();
	return user != null && user.role === 'O';
}

function resolveScopedPath(rootPath: string, currentPath: string) {
	const targetPath = path.resolve(rootPath, currentPath);

	if (targetPath !== rootPath && !targetPath.startsWith(`${rootPath}${path.sep}`)) {
		throw new Error('Invalid path');
	}

	return targetPath;
}

export async function GET(request: Request) {
	const url = new URL(request.url);
	const scope = url.searchParams.get('scope') === 'user' ? 'user' : 'data';
	const currentPath = cleanRelativePath(url.searchParams.get('path'));
	let rootPath = path.resolve(DATA_DIR);

	if (scope === 'user') {
		const user = await getSessionUser();

		if (!user) {
			return NextResponse.json(null, { status: 401 });
		}

		rootPath = path.resolve(dataPath(user.rootDir));
	} else if (!(await canBrowseDataRoot())) {
		return NextResponse.json(null, { status: 403 });
	}

	let targetPath: string;
	try {
		targetPath = resolveScopedPath(rootPath, currentPath);
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid path' }, { status: 400 });
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
