import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/actions";
import path from "path";
import { DATA_DIR } from "@/lib/data-dir";
import fs from "fs";
import { ZipArchive } from "archiver";
import { getMimeType } from "@/lib/mime";

export const runtime = 'nodejs';

function cleanRelativePath(value: string) {
	return value
		.replace(/\\/g, '/')
		.split('/')
		.filter(Boolean)
		.filter((part) => part !== '.' && part !== '..')
		.join('/');
}

function resolveFilePath(rootDir: string, requestedPath: string) {
	const rootPath = path.resolve(DATA_DIR, cleanRelativePath(rootDir));
	const filePath = path.resolve(rootPath, cleanRelativePath(requestedPath));

	if (filePath !== rootPath && !filePath.startsWith(`${rootPath}${path.sep}`)) {
		throw new Error('Invalid path');
	}

	return filePath;
}

function contentDisposition(type: 'inline' | 'attachment', filename: string) {
	const safeName = filename.replace(/"/g, '\\"');
	return `${type}; filename="${safeName}"`;
}

function zipName(name: string) {
	const base = path.basename(name).replace(/\.zip$/i, '') || 'folder';
	return `${base}.zip`;
}

function streamZip(directoryPath: string, filename: string) {
	const archive = new ZipArchive({ zlib: { level: 9 } });
	archive.directory(directoryPath, false);
	archive.finalize();

	return new Response(archive as any, {
		headers: {
			'content-type': 'application/zip',
			'content-disposition': contentDisposition('attachment', filename),
		},
	});
}

export async function GET(request: NextRequest) {
	const user = await getCurrentUser();
	const requestedPath = request.nextUrl.searchParams.get('path');

	if (requestedPath == null || user == null) {
		return NextResponse.json(null, { status: 404 });
	}

	try {
		const filePath = resolveFilePath(user.rootDir, requestedPath);
		const fileInfo = fs.statSync(filePath);

		if (fileInfo.isDirectory()) {
			return streamZip(filePath, zipName(filePath));
		}

		if (!fileInfo.isFile()) {
			return NextResponse.json(null, { status: 404 });
		}

		const attachmentName = path.basename(filePath);
		const inline = request.nextUrl.searchParams.get('inline') === '1';
		const mimeType = getMimeType(filePath);
		const range = request.headers.get('range');
		const baseHeaders = {
			'content-type': mimeType,
			'content-disposition': contentDisposition(inline ? 'inline' : 'attachment', attachmentName),
			'accept-ranges': 'bytes',
		};

		if (range) {
			const [startValue, endValue] = range.replace(/bytes=/, '').split('-');
			const start = Number.parseInt(startValue, 10);
			const end = endValue ? Number.parseInt(endValue, 10) : fileInfo.size - 1;

			if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
				return new Response(null, { status: 416 });
			}

			return new Response(fs.createReadStream(filePath, { start, end }) as any, {
				status: 206,
				headers: {
					...baseHeaders,
					'content-range': `bytes ${start}-${end}/${fileInfo.size}`,
					'content-length': String(end - start + 1),
				},
			});
		}

		return new Response(fs.createReadStream(filePath) as any, {
			headers: {
				...baseHeaders,
				'content-length': String(fileInfo.size),
			},
		});
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read file' }, { status: 400 });
	}
}
