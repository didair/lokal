"use client";

import React, { useEffect, useState } from 'react';
import Dropzone from 'dropzone'
import { cn } from '@/lib/utils';
import { CloudUpload } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface UploadTask {
	file: File;
	progress: number;
	status: string;
	fileName: string,
}

const FileUpload: React.FC = () => {
	const [uploadQueue, setUploadQueue] = useState<UploadTask[]>([]);
	const [uploading, setUploading] = useState<boolean>(false);

	useEffect(() => {
		if (document.body.classList.contains('dz-clickable')) {
			return;
		}

		new Dropzone(document.body, {
			url: (files) => {
				let moreData = '';
				if (window.location.pathname == '/files') {
					moreData = `?path=${localStorage.getItem('currentFilePath')}`;
				}

				if ((files[0] as any).fullPath != null) {
					const split = ((files[0] as any).fullPath as string).split('/');
					if (split.length > 0) {
						split.slice(0,-1).forEach((path) => {
							moreData += '/' + path;
						});
					}
				}

				return '/api/upload' + moreData;
			},
			addedfile(file) {
				setUploading(true);
				const uploadTask: UploadTask = {
					file,
					progress: 0,
					status: 'uploading',
					fileName: file.name,
				};

				setUploadQueue(prevQueue => [...prevQueue, uploadTask]);
			},
			uploadprogress(file, progress) {
				setUploadQueue(prevQueue =>
					prevQueue.map(task => task.file === file ? { ...task, progress: progress } : task)
				);
			},
			complete(file) {
				setUploadQueue(prevQueue =>
					prevQueue.map(task => task.file === file ? { ...task, status: file.status } : task)
				);

				const uploadEvent = new Event('FILE_COMPLETE');
				window.dispatchEvent(uploadEvent);
			},
			queuecomplete() {
				setTimeout(() => {
					setUploading(false);
				}, 1000 * 5)
			},
		});
	}, []);

	let totalProgress = 0;
	const notDoneItems = [...uploadQueue].filter((task) => task.status != 'success')
	const doneItems = [...uploadQueue].filter((task) => task.status == 'success')

	if (notDoneItems.length > 0) {
		const totalProgressReduce = notDoneItems.reduce((sum, item) => sum + (item.progress ?? 0), 0);
		totalProgress = totalProgressReduce / notDoneItems.length;
	}

	if (notDoneItems.length == 0 && doneItems.length > 0) {
		totalProgress = 100;
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<div
						className={cn(
							"text-sm font-medium rounded-full overflow-hidden",
							"inline-flex items-center justify-center cursor-pointer",
							"bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50",
						)}
						style={{ padding: 10, maxHeight: 40 }}
						onClick={() => setUploading(!uploading)}
					>
						<CloudUpload className="w-5 h-5" />

						<div
							className={cn(
								"bg-zinc-300 w-0 h-1 rounded-full transition-all ease-in-out overflow-hidden",
								{
									"w-24": uploading && uploadQueue.length > 0,
									"ml-2": uploading && uploadQueue.length > 0,
								}
							)}
						>
							<div
								className="h-full bg-blue-400 rounded-full transition-all ease-linear"
								style={{ width: Math.ceil(totalProgress) + '%' }}
							/>
						</div>
					</div>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end" className="flex flex-col p-0">
					{uploadQueue.length == 0 ?
						<div className="text-zinc-600 text-sm py-2 px-4">
							No files in queue
						</div>
						: null}

					{[...uploadQueue]
					.reverse()
					.map((task, index) => {
						return (
							<div className="text-sm border-b border-b-zinc-200 last-of-type:border-b-0" key={index}>
								<div className="flex px-3 py-1 flex-col max-w-96">
									<div className="truncate" title={task.fileName}>
										{task.fileName}
									</div>

									<div className="flex gap-2 items-center">
										<div
											className={cn(
												"bg-zinc-300 h-1 rounded-full transition-all ease-in-out overflow-hidden flex-1",
											)}
											style={{ position: 'relative', top: 1 }}
										>
											<div
												className="h-full bg-blue-400 rounded-full transition-all ease-linear"
												style={{ width: Math.ceil(task.progress) + '%' }}
											/>
										</div>

										<span className="font-semibold">
											{Math.ceil(task.progress)}%
										</span>
									</div>
								</div>
							</div>
						);
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};

export default FileUpload;