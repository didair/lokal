"use client";

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { ItemTableRow } from "@/components/blocks/itemtablerow"
import { useCallback, useEffect, useState } from "react";
import type { File } from "@/lib/file-utils";
import Link from "next/link";
import { FolderUp } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import type { FileTag, Tag } from "./tagselector";
import { normalizeTagPath } from "./tagselector";
import type { ShareSummary } from "./sharedialog";

type FileListItem = File & {
	path?: string;
};

export const FileView = () => {
	const [files, setFiles] = useState<FileListItem[]>([]);
	const [tags, setTags] = useState<Tag[]>([]);
	const [fileTags, setFileTags] = useState<FileTag[]>([]);
	const [shares, setShares] = useState<ShareSummary[]>([]);
	const searchParams = useSearchParams();
	const routePath = searchParams.get('path') ?? '/';
	const selectedTagId = searchParams.get('tag');
	const [path, setPath] = useState(routePath);
	const [parent, setParent] = useState<string | null>(null);
	const router = useRouter();

	const fetchData = useCallback((path: string, tagId?: string | null) => {
		if (tagId) {
			fetch(`/api/file-tags?tagId=${encodeURIComponent(tagId)}`)
				.then(async (response) => {
					const body = await response.json();

					setParent(null);
					setFiles((body?.files ?? []).map((file: FileListItem) => {
						return {
							...file,
							date: new Date(file.date),
						};
					}));
				});

			return;
		}

		fetch('/api/files', {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				path: path,
			}),
		})
			.then(async (response) => {
				const body = await response.json();

				if (body == null) {
					setParent(null);
					setFiles([]);
					return;
				}

				setParent(body.parent);
				setFiles(body.files.map((file: File) => {
					return {
						...file,
						date: new Date(file.date),
					};
				}));
			});
	}, []);

	const fetchTags = useCallback(() => {
		Promise.all([
			fetch('/api/tags').then((response) => response.json()),
			fetch('/api/file-tags').then((response) => response.json()),
		]).then(([tagsResponse, fileTagsResponse]) => {
			setTags(tagsResponse ?? []);
			setFileTags(fileTagsResponse ?? []);
		});
	}, []);

	const refreshTagData = useCallback(() => {
		fetchTags();
		fetchData(path, selectedTagId);
	}, [fetchData, fetchTags, path, selectedTagId]);

	const fetchShares = useCallback(() => {
		fetch('/api/shares')
			.then((response) => response.json())
			.then((sharesResponse) => setShares(sharesResponse ?? []));
	}, []);

	const refreshRowData = useCallback(() => {
		refreshTagData();
		fetchShares();
	}, [fetchShares, refreshTagData]);

	const goParent = useCallback((event?: React.MouseEvent<HTMLAnchorElement> | null) => {
		event?.preventDefault();
		setPath(parent ?? '/');
	}, [parent]);

	useEffect(() => {
		const handlePopState = () => {
			if (parent != null && !selectedTagId) {
				goParent(null);
			}
		};

		window.addEventListener('popstate', handlePopState);

		// Cleanup the event listener on component unmount
		return () => {
			window.removeEventListener('popstate', handlePopState);
		};
	}, [goParent, parent, selectedTagId]);

	useEffect(() => {
		const eventListener = () => {
			fetchData(path, selectedTagId);
		};

		if (!selectedTagId) {
			const href = path === '/' ? '/files' : `/files?path=${encodeURIComponent(path)}`;
			router.push(href, {
				scroll: false
			});
		}

		window.addEventListener('FILE_COMPLETE', eventListener);
		return () => window.removeEventListener('FILE_COMPLETE', eventListener);
	}, [fetchData, path, router, selectedTagId]);

	useEffect(() => {
		fetchTags();
		fetchShares();
	}, [fetchShares, fetchTags]);

	useEffect(() => {
		if (!selectedTagId) {
			setPath(routePath);
		}
	}, [routePath, selectedTagId]);

	useEffect(() => {
		fetchData(path, selectedTagId);

		if (!selectedTagId) {
			localStorage.setItem('currentFilePath', path);
		}
	}, [fetchData, path, selectedTagId]);

	const onItemClick = (item: FileListItem) => {
		if (item.type == 'dir') {
			const nextPath = item.path ? `/${item.path}` : [path, item.name].join('/').replace(/\/+/g, '/');
			setPath(nextPath);
			router.push(`/files?path=${encodeURIComponent(nextPath)}`, {
				scroll: false,
			});
		}
	}

	const getItemPath = (file: FileListItem) => {
		return normalizeTagPath(file.path ?? [path, file.name].join('/').replace(/\/+/g, '/'));
	};

	const getItemParentPath = (file: FileListItem) => {
		const parts = getItemPath(file).split('/').filter(Boolean);
		parts.pop();
		return `/${parts.join('/')}`;
	};

	const getTagsForFile = (file: FileListItem) => {
		const itemPath = getItemPath(file);
		return fileTags
			.filter((fileTag) => fileTag.path === itemPath)
			.map((fileTag) => fileTag.tag);
	};

	const getSharesForFile = (file: FileListItem) => {
		const itemPath = getItemPath(file);
		return shares.filter((share) => share.path === itemPath);
	};

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Tags</TableHead>
					<TableHead>Date</TableHead>
					<TableHead>Size</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{parent != null && !selectedTagId ?
					<TableRow>
						<TableCell style={{ height: 49 }}>
							<div className="flex items-center gap-2">
								<FolderUp className="h-4 w-4 text-muted-foreground" />

								<Link href="#" onClick={goParent} className="font-medium">
									..
								</Link>
							</div>
						</TableCell>
						<TableCell></TableCell>
						<TableCell></TableCell>
						<TableCell></TableCell>
					</TableRow>
					: null}

				{selectedTagId && files.length === 0 ?
					<TableRow>
						<TableCell colSpan={4} className="text-muted-foreground">
							<div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
								<span className="text-sm font-semibold text-zinc-700">No files or folders have this tag yet.</span>
								<span className="max-w-sm text-xs leading-5 text-muted-foreground">Add this tag from the file table to make matching items appear here.</span>
							</div>
						</TableCell>
					</TableRow>
				: null}

				{!selectedTagId && files.length === 0 ?
					<TableRow>
						<TableCell colSpan={4} className="text-muted-foreground">
							<div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
								<span className="text-sm font-semibold text-zinc-700">This directory is empty.</span>
								<span className="max-w-sm text-xs leading-5 text-muted-foreground">Drop files anywhere on the app to upload them into the current directory.</span>
							</div>
						</TableCell>
					</TableRow>
				: null}

				{[...files]
					.sort((file) => file.type == 'dir' ? -1 : 1)
					.map((file, index) => {
						return <ItemTableRow
							file={file}
							key={index}
							currentPath={getItemParentPath(file)}
							itemPath={getItemPath(file)}
							showPath={selectedTagId != null}
							tags={tags}
							assignedTags={getTagsForFile(file)}
							activeShares={getSharesForFile(file)}
							onTagsChange={refreshRowData}
							onSharesChange={fetchShares}
							onNavigate={onItemClick}
						/>
					})}
			</TableBody>
		</Table>
	);
}
