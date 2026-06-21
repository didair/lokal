"use client";

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { ItemTableRow } from "@/components/blocks/itemtablerow"
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { File } from "@/lib/file-utils";
import Link from "next/link";
import { FolderPlus, FolderUp } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import type { FileTag, Tag } from "./tagselector";
import { normalizeTagPath } from "./tagselector";
import type { ShareSummary } from "./sharedialog";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type FileListItem = File & {
	path?: string;
};

export const FileView = () => {
	const [files, setFiles] = useState<FileListItem[]>([]);
	const [tags, setTags] = useState<Tag[]>([]);
	const [fileTags, setFileTags] = useState<FileTag[]>([]);
	const [shares, setShares] = useState<ShareSummary[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [createFolderOpen, setCreateFolderOpen] = useState(false);
	const [folderName, setFolderName] = useState("");
	const [folderError, setFolderError] = useState("");
	const [savingFolder, setSavingFolder] = useState(false);
	const requestIdRef = useRef(0);
	const searchParams = useSearchParams();
	const routePath = searchParams.get('path') ?? '/';
	const selectedTagId = searchParams.get('tag');
	const [path, setPath] = useState(routePath);
	const [parent, setParent] = useState<string | null>(null);
	const router = useRouter();

	const fetchData = useCallback((path: string, tagId?: string | null) => {
		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		setIsLoading(true);
		setFiles([]);

		const finishLoading = () => {
			if (requestIdRef.current === requestId) {
				setIsLoading(false);
			}
		};

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
				})
				.finally(finishLoading);

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
			})
			.finally(finishLoading);
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

	const createFolder = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSavingFolder(true);
		setFolderError("");

		const response = await fetch('/api/files', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ path, name: folderName }),
		});
		const body = await response.json().catch(() => ({}));
		setSavingFolder(false);

		if (!response.ok) {
			setFolderError(body.error || 'Could not create folder');
			return;
		}

		setCreateFolderOpen(false);
		setFolderName("");
		fetchData(path, selectedTagId);
	};

	return (
		<div className="relative">
			<div
				aria-live="polite"
				className={[
					"pointer-events-none absolute inset-x-0 top-0 z-10 transition-opacity duration-200",
					isLoading ? "opacity-100" : "opacity-0",
				].join(' ')}
			>
				<div className="h-0.5 overflow-hidden bg-rose-100/80">
					<div className="h-full w-1/3 animate-[lokal-working_1.25s_ease-in-out_infinite] rounded-full bg-rose-500/70" />
				</div>
			</div>

			{!selectedTagId ? (
				<div className="flex items-center justify-between gap-3 border-b border-zinc-200/80 px-4 py-3">
					<div className="min-w-0 text-sm text-muted-foreground">
						<span className="hidden sm:inline">Current folder: </span>
						<span className="font-medium text-zinc-800">{path}</span>
					</div>
					<Button type="button" size="sm" variant="outline" onClick={() => { setFolderError(""); setCreateFolderOpen(true); }}>
						<FolderPlus className="mr-2 h-4 w-4" />
						New folder
					</Button>
				</div>
			) : null}

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead className="hidden md:table-cell">Tags</TableHead>
						<TableHead className="hidden md:table-cell">Date</TableHead>
						<TableHead className="hidden md:table-cell">Size</TableHead>
					</TableRow>
				</TableHeader>

				<TableBody>
					{!isLoading && parent != null && !selectedTagId ?
						<TableRow>
							<TableCell style={{ height: 49 }}>
								<div className="flex items-center gap-2">
									<FolderUp className="h-4 w-4 text-muted-foreground" />

									<Link href="#" onClick={goParent} className="font-medium">
										..
									</Link>
								</div>
							</TableCell>
							<TableCell className="hidden md:table-cell"></TableCell>
							<TableCell className="hidden md:table-cell"></TableCell>
							<TableCell className="hidden md:table-cell"></TableCell>
						</TableRow>
						: null}

					{!isLoading && selectedTagId && files.length === 0 ?
						<TableRow>
							<TableCell colSpan={4} className="text-muted-foreground">
								<div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
									<span className="text-sm font-semibold text-zinc-700">No files or folders have this tag yet.</span>
									<span className="max-w-sm text-xs leading-5 text-muted-foreground">Add this tag from the file table to make matching items appear here.</span>
								</div>
							</TableCell>
						</TableRow>
					: null}

					{!isLoading && !selectedTagId && files.length === 0 ?
						<TableRow>
							<TableCell colSpan={4} className="text-muted-foreground">
								<div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
									<span className="text-sm font-semibold text-zinc-700">This directory is empty.</span>
									<span className="max-w-sm text-xs leading-5 text-muted-foreground">Drop files anywhere on the app to upload them into the current directory.</span>
								</div>
							</TableCell>
						</TableRow>
					: null}

					{!isLoading ? [...files]
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
						}) : null}
				</TableBody>
			</Table>

			<Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
				<DialogContent>
					<form onSubmit={createFolder}>
						<DialogHeader>
							<DialogTitle>Create folder</DialogTitle>
							<DialogDescription>
								Create a new folder inside <span className="font-medium text-zinc-800">{path}</span>.
							</DialogDescription>
						</DialogHeader>

						<div className="grid gap-2 py-5">
							<Label htmlFor="folder-name">Folder name</Label>
							<Input
								id="folder-name"
								value={folderName}
								onChange={(event) => setFolderName(event.target.value)}
								placeholder="Photos"
								autoFocus
							/>
							{folderError ? <p className="text-sm text-red-600">{folderError}</p> : null}
						</div>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setCreateFolderOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={savingFolder || !folderName.trim()}>
								{savingFolder ? 'Creating...' : 'Create folder'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
