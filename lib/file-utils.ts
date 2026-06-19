import fs from 'fs';
import path from 'path';

export type File = {
	name: string,
	size: string,
	date: Date,
	type: 'other' | 'file' | 'dir',
};

export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const formattedBytes = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
	return `${formattedBytes} ${sizes[i]}`;
};

export function getFilesInDirectory(directoryPath: string): File[] {
	const absolutePath = directoryPath;
	const filenames = fs.readdirSync(absolutePath);

	return filenames.map((filename): File => {
		const fileInfo = fs.statSync(path.join(absolutePath, filename));
		let fileType = 'other';

		if (fileInfo.isFile()) {
			fileType = 'file';
		}

		if (fileInfo.isDirectory()) {
			fileType = 'dir';
		}

		return {
			name: filename,
			size: formatBytes(fileInfo.size),
			date: fileInfo.mtime ?? fileInfo.birthtime,
			type: fileType as any,
		};
	});
};

export function getFileInfo(filePath: string) {
	const absolutePath = filePath;
	const fileInfo = fs.statSync(absolutePath);
	const split = absolutePath.split('/');
	const name = split[split.length - 1];
	let fileType = 'other';

	if (fileInfo.isFile()) {
		fileType = 'file';
	}

	if (fileInfo.isDirectory()) {
		fileType = 'dir';
	}

	return {
		name: name,
		size: formatBytes(fileInfo.size),
		date: fileInfo.mtime ?? fileInfo.birthtime,
		type: fileType as any,
	};
};
