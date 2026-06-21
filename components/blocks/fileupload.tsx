"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, CloudUpload, CopyPlus, FileUp, Upload, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface UploadTask {
	id: string;
	progress: number;
	status: 'uploading' | 'success' | 'error';
	fileName: string;
}

type QueuedFile = {
	file: File;
	relativePath?: string;
};

type FileSystemEntry = {
	name: string;
	isFile: boolean;
	isDirectory: boolean;
	file?: (success: (file: File) => void, error?: (error: DOMException) => void) => void;
	createReader?: () => {
		readEntries: (success: (entries: FileSystemEntry[]) => void, error?: (error: DOMException) => void) => void;
	};
};

const hasDraggedFiles = (event: DragEvent) => {
	return Array.from(event.dataTransfer?.types ?? []).includes('Files');
};

const readEntryFile = (entry: FileSystemEntry, relativePath: string) => {
	return new Promise<QueuedFile[]>((resolve) => {
		entry.file?.((file) => resolve([{ file, relativePath: relativePath + file.name }]), () => resolve([]));
	});
};

const readDirectoryEntries = (entry: FileSystemEntry) => {
	return new Promise<FileSystemEntry[]>((resolve) => {
		const reader = entry.createReader?.();
		if (!reader) {
			resolve([]);
			return;
		}

		const entries: FileSystemEntry[] = [];
		const readBatch = () => {
			reader.readEntries((batch) => {
				if (batch.length === 0) {
					resolve(entries);
					return;
				}

				entries.push(...batch);
				readBatch();
			}, () => resolve(entries));
		};

		readBatch();
	});
};

const readEntryFiles = async (entry: FileSystemEntry, parentPath = ''): Promise<QueuedFile[]> => {
	if (entry.isFile) {
		return readEntryFile(entry, parentPath);
	}

	if (!entry.isDirectory) {
		return [];
	}

	const entries = await readDirectoryEntries(entry);
	const nested = await Promise.all(entries.map((child) => readEntryFiles(child, `${parentPath}${entry.name}/`)));
	return nested.flat();
};

const getDroppedFiles = async (dataTransfer: DataTransfer): Promise<QueuedFile[]> => {
	const items = Array.from(dataTransfer.items ?? []);
	const supportsEntries = items.some((item) => typeof (item as any).webkitGetAsEntry === 'function');

	if (supportsEntries) {
		const nested = await Promise.all(items.map((item) => {
			const entry = (item as any).webkitGetAsEntry?.() as FileSystemEntry | null;
			return entry ? readEntryFiles(entry) : Promise.resolve([]);
		}));

		return nested.flat();
	}

	return Array.from(dataTransfer.files ?? []).map((file) => ({ file }));
};

const FileUpload: React.FC = () => {
	const [uploadQueue, setUploadQueue] = useState<UploadTask[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const dragDepth = useRef(0);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const activeUploads = uploadQueue.filter((task) => task.status === 'uploading');
	const failedUploads = uploadQueue.filter((task) => task.status === 'error');
	const completedUploads = uploadQueue.filter((task) => task.status === 'success');

	const totalProgress = useMemo(() => {
		if (activeUploads.length > 0) {
			return activeUploads.reduce((sum, item) => sum + item.progress, 0) / activeUploads.length;
		}

		return uploadQueue.length > 0 && failedUploads.length === 0 ? 100 : 0;
	}, [activeUploads, failedUploads.length, uploadQueue.length]);

	const currentPathLabel = () => {
		if (typeof window === 'undefined' || window.location.pathname !== '/files') {
			return 'your root folder';
		}

		return localStorage.getItem('currentFilePath') || '/';
	};

	const getUploadUrl = (relativePath?: string) => {
		const params = new URLSearchParams();

		if (window.location.pathname === '/files') {
			params.set('path', localStorage.getItem('currentFilePath') || '/');
		}

		if (relativePath) {
			params.set('relativePath', relativePath);
		}

		const query = params.toString();
		return query ? `/api/upload?${query}` : '/api/upload';
	};

	const uploadFile = ({ file, relativePath }: QueuedFile) => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const fileName = relativePath || file.name;

		setUploadQueue((queue) => [
			...queue,
			{ id, progress: 0, status: 'uploading', fileName },
		]);
		setIsOpen(true);

		const formData = new FormData();
		formData.append('file', file, file.name);

		const request = new XMLHttpRequest();
		request.open('POST', getUploadUrl(relativePath));

		request.upload.onprogress = (event) => {
			if (!event.lengthComputable) return;

			setUploadQueue((queue) => queue.map((task) => task.id === id
				? { ...task, progress: (event.loaded / event.total) * 100 }
				: task
			));
		};

		request.onload = () => {
			const success = request.status >= 200 && request.status < 300;

			setUploadQueue((queue) => queue.map((task) => task.id === id
				? { ...task, progress: success ? 100 : task.progress, status: success ? 'success' : 'error' }
				: task
			));

			if (success) {
				window.dispatchEvent(new Event('FILE_COMPLETE'));
			}
		};

		request.onerror = () => {
			setUploadQueue((queue) => queue.map((task) => task.id === id
				? { ...task, status: 'error' }
				: task
			));
		};

		request.send(formData);
	};

	const uploadFiles = (files: QueuedFile[]) => {
		files.forEach(uploadFile);
	};

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const preventDefault = (event: DragEvent) => {
			if (!hasDraggedFiles(event)) return;
			event.preventDefault();
			if (event.dataTransfer) {
				event.dataTransfer.dropEffect = 'copy';
			}
		};

		const handleDragEnter = (event: DragEvent) => {
			if (!hasDraggedFiles(event)) return;
			event.preventDefault();
			dragDepth.current += 1;
			setIsDragging(true);
		};

		const handleDragLeave = (event: DragEvent) => {
			if (!hasDraggedFiles(event)) return;
			event.preventDefault();
			dragDepth.current = Math.max(0, dragDepth.current - 1);
			if (dragDepth.current === 0) {
				setIsDragging(false);
			}
		};

		const handleDrop = async (event: DragEvent) => {
			if (!event.dataTransfer || !hasDraggedFiles(event)) return;
			event.preventDefault();
			dragDepth.current = 0;
			setIsDragging(false);

			const files = await getDroppedFiles(event.dataTransfer);
			uploadFiles(files);
		};

		window.addEventListener('dragenter', handleDragEnter);
		window.addEventListener('dragover', preventDefault);
		window.addEventListener('dragleave', handleDragLeave);
		window.addEventListener('drop', handleDrop);

		return () => {
			window.removeEventListener('dragenter', handleDragEnter);
			window.removeEventListener('dragover', preventDefault);
			window.removeEventListener('dragleave', handleDragLeave);
			window.removeEventListener('drop', handleDrop);
		};
	}, []);

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				multiple
				className="hidden"
				onChange={(event) => {
					uploadFiles(Array.from(event.target.files ?? []).map((file) => ({ file })));
					event.target.value = '';
				}}
			/>

			{mounted && isDragging ? createPortal(
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-6 backdrop-blur-sm">
					<div className="flex max-w-md flex-col items-center rounded-3xl border border-white/30 bg-white p-8 text-center shadow-2xl">
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
							<CopyPlus className="h-8 w-8" />
						</div>
						<h2 className="text-xl font-semibold tracking-tight text-zinc-950">Drop files to upload</h2>
						<p className="mt-2 text-sm leading-6 text-muted-foreground">
							Files will be uploaded to <span className="font-medium text-zinc-800">{currentPathLabel()}</span>.
						</p>
					</div>
				</div>
			, document.body) : null}

			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild>
					<Button variant="secondary" size="icon" className="relative rounded-full">
						<CloudUpload className="h-5 w-5" />
						{activeUploads.length > 0 ? (
							<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
								{activeUploads.length}
							</span>
						) : null}
						<span className="sr-only">Open upload queue</span>
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end" className="w-[min(calc(100vw-2rem),28rem)] overflow-hidden p-0">
					<div className="border-b border-zinc-200/80 p-4">
						<div className="flex items-center justify-between gap-4">
							<div>
								<h2 className="font-semibold tracking-tight text-zinc-950">Uploads</h2>
								{uploadQueue.length > 0 ? (
									<div className="mt-1">
										<p className="text-xs text-muted-foreground">
											{completedUploads.length} completed · {activeUploads.length} uploading · {failedUploads.length} failed
										</p>
									</div>
								) : null}
							</div>

							<Button type="button" size="sm" onClick={() => fileInputRef.current?.click()}>
								<FileUp className="mr-2 h-4 w-4" /> Upload
							</Button>
						</div>
					</div>

					{uploadQueue.length === 0 ? (
						<div className="flex min-h-56 flex-col items-center justify-center px-6 py-8 text-center">
							<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
								<Upload className="h-7 w-7" />
							</div>
							<p className="font-medium text-zinc-900">Your upload queue is empty</p>
							<p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
								Drag and drop files anywhere on the screen to upload them into the current folder.
							</p>
						</div>
					) : (
						<div className="max-h-96 overflow-y-auto p-2">
							{[...uploadQueue].reverse().map((task) => (
								<div className="rounded-xl px-3 py-2 text-sm hover:bg-zinc-50" key={task.id}>
									<div className="flex items-center gap-3">
										{task.status === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : null}
										{task.status === 'error' ? <XCircle className="h-4 w-4 shrink-0 text-red-500" /> : null}
										{task.status === 'uploading' ? <CloudUpload className="h-4 w-4 shrink-0 text-rose-500" /> : null}
										<div className="min-w-0 flex-1">
											<div className="truncate font-medium text-zinc-800" title={task.fileName}>{task.fileName}</div>

											{task.status !== "success" && (
												<div className="mt-2 flex items-center gap-2">
													<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
														<div
															className={cn('h-full rounded-full transition-all', task.status === 'error' ? 'bg-red-500' : 'bg-rose-500')}
															style={{ width: `${Math.ceil(task.progress)}%` }}
														/>
													</div>
													<span className="w-10 text-right text-xs font-semibold text-zinc-500">{task.status === 'error' ? 'Fail' : `${Math.ceil(task.progress)}%`}</span>
												</div>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};

export default FileUpload;
