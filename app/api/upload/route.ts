import { getCurrentUser } from '@/lib/actions';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { DATA_DIR } from '@/lib/data-dir';
import fs from 'fs/promises';

const normalizeRelativePath = (value: string | null) => {
	return (value ?? '')
		.replace(/\\/g, '/')
		.split('/')
		.filter((part) => part && part !== '.' && part !== '..')
		.join('/');
};

const resolveUploadPath = (rootDir: string, currentPath: string | null, relativePath: string | null, fileName: string) => {
	const safeCurrentPath = normalizeRelativePath(currentPath);
	const safeRelativePath = normalizeRelativePath(relativePath);
	const safeFileName = path.basename(fileName);
	const relativeDirectory = safeRelativePath ? path.dirname(safeRelativePath) : '';
	const userRoot = path.resolve(DATA_DIR, normalizeRelativePath(rootDir));
	const targetDirectory = path.resolve(userRoot, safeCurrentPath, relativeDirectory === '.' ? '' : relativeDirectory);
	const targetFile = path.resolve(targetDirectory, safeFileName);

	if (targetDirectory !== userRoot && !targetDirectory.startsWith(`${userRoot}${path.sep}`)) {
		throw new Error('Invalid upload path');
	}

	return { targetDirectory, targetFile };
};

export const POST = async (request: NextRequest) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file');

		if (!(file instanceof File)) {
			return NextResponse.json({ success: false, error: 'Missing file' }, { status: 400 });
		}

		const user = await getCurrentUser();
		if (!user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { targetDirectory, targetFile } = resolveUploadPath(
			user.rootDir,
			request.nextUrl.searchParams.get('path'),
			request.nextUrl.searchParams.get('relativePath'),
			file.name,
		);

		await fs.mkdir(targetDirectory, { recursive: true });
		await fs.writeFile(targetFile, Buffer.from(await file.arrayBuffer()));

		return NextResponse.json({
			success: true,
			name: file.name,
		});
	} catch (error) {
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : 'Upload failed',
		}, { status: 500 });
	}
};
