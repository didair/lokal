import { NextResponse } from "next/server"
import { getFilesInDirectory } from "@/lib/file-utils";
import { getCurrentSession } from "@/lib/user";
import prisma from "@/lib/prisma";
import { DATA_DIR, dataPath } from "@/lib/data-dir";
import fs from 'fs/promises';
import path from 'path';

function cleanRelativePath(input: unknown, allowEmpty = true) {
	const value = input?.toString() ?? '';
	const parts = value.replace(/\\/g, '/').split('/').filter(Boolean);

	if ((!allowEmpty && parts.length === 0) || parts.some((part) => part === '..' || part === '.')) {
		throw new Error('Invalid path');
	}

	return parts.join('/');
}

function cleanFileName(input: unknown) {
	const name = input?.toString().trim() ?? '';

	if (!name || name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
		throw new Error('Invalid name');
	}

	return name;
}

async function getUser() {
	const session = await getCurrentSession();
	return prisma.user.findUnique({
		where: {
			id: (session?.user as any).id ?? '',
		},
		select: {
			id: true,
			rootDir: true,
		}
	});
}

async function getIgnoreDsStore() {
	const setting = await prisma.setting.findUnique({
		where: { id: 'files-ignore-ds-store' },
	});

	return setting?.value === 'true';
}

function resolveUserPath(rootDir: string, itemPath: string) {
	const userRoot = path.resolve(DATA_DIR, cleanRelativePath(rootDir));
	const absolutePath = path.resolve(userRoot, itemPath);

	if (absolutePath !== userRoot && !absolutePath.startsWith(`${userRoot}${path.sep}`)) {
		throw new Error('Invalid path');
	}

	return { userRoot, absolutePath };
}

function childPathPrefix(itemPath: string) {
	return itemPath.endsWith('/') ? itemPath : `${itemPath}/`;
}

async function updateRelatedPaths(ownerId: string, oldPath: string, newPath: string) {
	const [fileTags, shares] = await Promise.all([
		prisma.fileTag.findMany({ where: { ownerId } }),
		prisma.share.findMany({ where: { ownerId } }),
	]);

	const oldPrefix = childPathPrefix(oldPath);
	const operations = [
		...fileTags
			.filter((fileTag) => fileTag.path === oldPath || fileTag.path.startsWith(oldPrefix))
			.map((fileTag) => prisma.fileTag.update({
				where: { id: fileTag.id },
				data: { path: fileTag.path === oldPath ? newPath : `${newPath}/${fileTag.path.slice(oldPrefix.length)}` },
			})),
		...shares
			.filter((share) => share.path === oldPath || share.path.startsWith(oldPrefix))
			.map((share) => prisma.share.update({
				where: { id: share.id },
				data: {
					path: share.path === oldPath ? newPath : `${newPath}/${share.path.slice(oldPrefix.length)}`,
					name: share.path === oldPath ? path.basename(newPath) : share.name,
				},
			})),
	];

	if (operations.length > 0) {
		await prisma.$transaction(operations);
	}
}

async function deleteRelatedPaths(ownerId: string, itemPath: string) {
	const prefix = childPathPrefix(itemPath);

	const [fileTags, shares] = await Promise.all([
		prisma.fileTag.findMany({ where: { ownerId } }),
		prisma.share.findMany({ where: { ownerId } }),
	]);

	const operations = [
		...fileTags
			.filter((fileTag) => fileTag.path === itemPath || fileTag.path.startsWith(prefix))
			.map((fileTag) => prisma.fileTag.delete({ where: { id: fileTag.id } })),
		...shares
			.filter((share) => share.path === itemPath || share.path.startsWith(prefix))
			.map((share) => prisma.share.delete({ where: { id: share.id } })),
	];

	if (operations.length > 0) {
		await prisma.$transaction(operations);
	}
}

export async function POST(request: Request) {
	const formData = await request.json();
	const user = await getUser();

	if (user == null) {
		return NextResponse.json(null);
	}

	const userPath = cleanRelativePath(formData.path);
	const paths: string[] = userPath.split('/').filter((path: string) => path != '');

	let parent = null;
	if (paths.length > 0) {
		parent = '/';

		if (paths.length > 1) {
			parent = '/' + paths.slice(0, -1).join('/');
		}
	}

	const response = {
		parent: parent,
		files: getFilesInDirectory(dataPath(user.rootDir, userPath), { ignoreDsStore: await getIgnoreDsStore() }),
	};

	return NextResponse.json(response);
}

export async function PATCH(request: Request) {
	try {
		const user = await getUser();
		if (!user) {
			return NextResponse.json(null, { status: 401 });
		}

		const body = await request.json();
		const itemPath = cleanRelativePath(body.path, false);
		const newName = cleanFileName(body.name);
		const { absolutePath } = resolveUserPath(user.rootDir, itemPath);
		const parentPath = path.dirname(itemPath);
		const nextPath = parentPath === '.' ? newName : `${parentPath}/${newName}`;
		const { absolutePath: nextAbsolutePath } = resolveUserPath(user.rootDir, nextPath);

		await fs.access(absolutePath);
		await fs.access(nextAbsolutePath).then(() => {
			throw new Error('An item with that name already exists');
		}).catch((error: NodeJS.ErrnoException) => {
			if (error.code !== 'ENOENT') {
				throw error;
			}
		});
		await fs.rename(absolutePath, nextAbsolutePath);
		await updateRelatedPaths(user.id, itemPath, nextPath);

		return NextResponse.json({ success: true, path: nextPath });
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not rename item' }, { status: 400 });
	}
}

export async function DELETE(request: Request) {
	try {
		const user = await getUser();
		if (!user) {
			return NextResponse.json(null, { status: 401 });
		}

		const body = await request.json();
		const itemPath = cleanRelativePath(body.path, false);
		const { absolutePath } = resolveUserPath(user.rootDir, itemPath);

		await fs.rm(absolutePath, { recursive: true, force: false });
		await deleteRelatedPaths(user.id, itemPath);

		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete item' }, { status: 400 });
	}
}
