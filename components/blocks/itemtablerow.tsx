"use client";

import type { File } from "@/lib/file-utils";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "../ui/context-menu";
import { FileIcon, FolderIcon, CircleAlertIcon, Share2, MoreHorizontal, Info, PanelRightOpen, Download } from "lucide-react";
import { TableRow, TableCell } from "../ui/table";
import { formatDate } from "@/lib/utils";
import { ShareDialog, type ShareSummary } from "./sharedialog";
import { TagSelector, type Tag } from "./tagselector";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { DirectorySelect } from "../ui/dirinput";

export const ItemTableRow = ({
	file,
	currentPath,
	itemPath: providedItemPath,
	showPath = false,
	tags = [],
	assignedTags = [],
	activeShares = [],
	secondaryCell,
	href,
	size,
	actions = 'owner',
	onClick = () => null,
	onNavigate = () => null,
	onTagsChange = () => null,
	onSharesChange = () => null,
	onItemChange = () => null,
}: {
	file: File,
	currentPath: string,
	itemPath?: string,
	showPath?: boolean,
	tags?: Tag[],
	assignedTags?: Tag[],
	activeShares?: ShareSummary[],
	secondaryCell?: ReactNode,
	href?: string,
	size?: ReactNode,
	actions?: 'owner' | 'shared' | 'none',
	onClick?: (file: File) => void,
	onNavigate?: (file: File) => void,
	onTagsChange?: () => void,
	onSharesChange?: () => void,
	onItemChange?: () => void,
}) => {
	const [shareOpen, setShareOpen] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [metadataOpen, setMetadataOpen] = useState(false);
	const [fileDetails, setFileDetails] = useState<{
		metadata: Record<string, string | number | boolean>;
		previewType: 'image' | 'video' | 'pdf' | 'text' | 'unsupported';
		text: string | null;
		rawUrl: string;
	} | null>(null);
	const [previewError, setPreviewError] = useState('');
	const [renameOpen, setRenameOpen] = useState(false);
	const [moveOpen, setMoveOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [renameValue, setRenameValue] = useState(file.name);
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const itemPath = providedItemPath ?? [currentPath, file.name].join('/').replace(/\/+/g, '/');
	const download_path = itemPath;
	const onItemDoubleClick = () => {
	};

	useEffect(() => {
		setRenameValue(file.name);
	}, [file.name]);

	const refreshTagAndShareData = () => {
		onTagsChange();
		onSharesChange();
	};

	const refreshItemData = () => {
		onItemChange();
		onSharesChange();
	};

	const keepPreviewOpenForFloatingUi = (event: Event) => {
		const target = event.target as HTMLElement | null;
		if (shareOpen || target?.closest('[data-lokal-floating-ui]')) {
			event.preventDefault();
		}
	};

	const updatePreviewOpen = (open: boolean) => {
		if (!open && shareOpen) {
			return;
		}

		setPreviewOpen(open);
	};

	useEffect(() => {
		if (!previewOpen || file.type !== 'file') {
			return;
		}

		setFileDetails(null);
		setPreviewError('');

		fetch(`/api/files?path=${encodeURIComponent(itemPath)}`)
			.then(async (response) => {
				const body = await response.json();
				if (!response.ok) {
					throw new Error(body.error || 'Could not open file');
				}

				setFileDetails(body);
			})
			.catch((openError) => setPreviewError(openError instanceof Error ? openError.message : 'Could not open file'));
	}, [file.type, itemPath, previewOpen]);

	const renameItem = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaving(true);
		setError('');

		const response = await fetch('/api/files', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ path: itemPath, name: renameValue }),
		});
		const body = await response.json().catch(() => ({}));
		setSaving(false);

		if (!response.ok) {
			setError(body.error || 'Could not rename item');
			return;
		}

		setRenameOpen(false);
		refreshItemData();
	};

	const moveItem = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaving(true);
		setError('');
		const formData = new FormData(event.currentTarget);
		const destinationPath = formData.get('destinationPath')?.toString() || '/';

		const response = await fetch('/api/files', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ path: itemPath, destinationPath }),
		});
		const body = await response.json().catch(() => ({}));
		setSaving(false);

		if (!response.ok) {
			setError(body.error || 'Could not move item');
			return;
		}

		setMoveOpen(false);
		refreshItemData();
	};

	const deleteItem = async () => {
		setSaving(true);
		setError('');

		const response = await fetch('/api/files', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ path: itemPath }),
		});
		const body = await response.json().catch(() => ({}));
		setSaving(false);

		if (!response.ok) {
			setError(body.error || 'Could not delete item');
			return;
		}

		setDeleteOpen(false);
		refreshItemData();
	};

	const hasMobileActions = actions !== 'none';
	const openMoveDialog = () => {
		setError('');
		setMoveOpen(true);
	};
	const openFile = () => {
		if (file.type === 'file' && actions === 'owner') {
			setMetadataOpen(false);
			setPreviewOpen(true);
			return;
		}

		onNavigate(file);
	};

	return (
		<>
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<TableRow onClick={() => onClick(file)} onDoubleClick={onItemDoubleClick} className="h-auto md:h-14">
					{/* Name */}
					<TableCell className="py-2 md:py-2">
						<div className="flex items-start gap-2 md:items-center">
							{/* Icon */}
							{file.type == 'dir' ?
								<FolderIcon className="mt-2 h-4 w-4 shrink-0 text-muted-foreground md:mt-0" />
							: null}

							{file.type == 'file' ?
								<FileIcon className="mt-2 h-4 w-4 shrink-0 text-muted-foreground md:mt-0" />
							: null}

							{file.type == 'other' ?
								<CircleAlertIcon className="mt-2 h-4 w-4 shrink-0 text-muted-foreground md:mt-0" />
							: null}

							<div className="min-w-0 flex-1">
								<div className="flex items-start gap-2">
									<div className="min-w-0 flex-1">
										<div className="flex min-h-8 flex-wrap items-center gap-2 md:min-h-0">
											{/* Name */}
											<Link
												href={href ?? '#'}
												onClick={(e) => {
													if (!href) {
														e.preventDefault();
														openFile();
													}
												}}
												className="break-all font-medium"
												prefetch={false}
											>
												{file.name}
											</Link>

											{activeShares.length > 0 ?
												<Share2 className="h-4 w-4 shrink-0 text-rose-500" aria-label="Active share link" />
											: null}

											{showPath ?
												<span className="break-all text-xs text-muted-foreground">
													/{itemPath.replace(/^\/+/, '')}
												</span>
											: null}
										</div>
									</div>

									<div className="flex shrink-0 items-center gap-1 md:hidden" onClick={(event) => event.stopPropagation()}>
										{!secondaryCell ? (
											<TagSelector
												path={itemPath}
												tags={tags}
												assignedTags={assignedTags}
												onChange={onTagsChange}
												mode="trigger"
												triggerIcon="tag"
												triggerClassName="!h-8 !w-8"
											/>
										) : null}

										{hasMobileActions ? (
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="outline" size="icon" className="!h-8 !w-8 rounded-full" aria-label="Open file actions">
														<MoreHorizontal className="h-3.5 w-3.5" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													{actions === 'shared' && href ? (
														<DropdownMenuItem asChild>
															<Link href={href} className="cursor-pointer" prefetch={false}>
																Open shared link
															</Link>
														</DropdownMenuItem>
													) : null}

													{actions === 'owner' && (file.type == 'file' || file.type == 'dir') ?
														<DropdownMenuItem asChild>
															<a href={`/file/u?path=${encodeURIComponent(download_path)}`} target="_blank" className="cursor-pointer">
																Download
															</a>
														</DropdownMenuItem>
													: null}

													{actions === 'owner' ? (
														<>
															<DropdownMenuItem onSelect={() => setShareOpen(true)}>Share</DropdownMenuItem>
															<DropdownMenuItem onSelect={openMoveDialog}>Move</DropdownMenuItem>
															<DropdownMenuItem onSelect={() => { setError(''); setRenameOpen(true); }}>Rename</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={() => { setError(''); setDeleteOpen(true); }}>Delete</DropdownMenuItem>
														</>
													) : null}
												</DropdownMenuContent>
											</DropdownMenu>
										) : null}
									</div>
								</div>

								{secondaryCell ? (
									<div className="mt-1 text-xs text-muted-foreground md:hidden">
										{secondaryCell}
									</div>
								) : assignedTags.length > 0 ? (
									<div className="mt-1 md:hidden" onClick={(event) => event.stopPropagation()}>
										<TagSelector
											path={itemPath}
											tags={tags}
											assignedTags={assignedTags}
											onChange={onTagsChange}
											mode="tags"
										/>
									</div>
								) : null}
							</div>
						</div>
					</TableCell>

					{/* Tags */}
					<TableCell className="hidden md:table-cell" onClick={(event) => event.stopPropagation()}>
						{secondaryCell ?? (
							<TagSelector
								path={itemPath}
								tags={tags}
								assignedTags={assignedTags}
								onChange={onTagsChange}
							/>
						)}
					</TableCell>

					{/* Date */}
					<TableCell className="hidden md:table-cell">
						{formatDate(file.date)}
					</TableCell>

					{/* Size */}
					<TableCell className="hidden md:table-cell">{size ?? (file.type == 'dir' ? '-' : file.size)}</TableCell>
				</TableRow>
			</ContextMenuTrigger>

			<ContextMenuContent>
				{actions === 'shared' && href ? (
					<ContextMenuItem asChild>
						<Link href={href} className="cursor-pointer" prefetch={false}>
							Open shared link
						</Link>
					</ContextMenuItem>
				) : null}

				{actions === 'owner' && (file.type == 'file' || file.type == 'dir') ?
					<ContextMenuItem asChild>
						<a href={`/file/u?path=${encodeURIComponent(download_path)}`} target="_blank" className="cursor-pointer">
							Download
						</a>
					</ContextMenuItem>
				: null}

				{actions === 'owner' ? (
					<>
						<ContextMenuItem onSelect={() => setShareOpen(true)}>Share</ContextMenuItem>
						<ContextMenuItem onSelect={openMoveDialog}>Move</ContextMenuItem>
						<ContextMenuItem onSelect={() => { setError(''); setRenameOpen(true); }}>Rename</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem className="text-red-600 focus:text-red-600" onSelect={() => { setError(''); setDeleteOpen(true); }}>Delete</ContextMenuItem>
					</>
				) : null}
			</ContextMenuContent>
		</ContextMenu>

		<ShareDialog
			open={shareOpen}
			onOpenChange={setShareOpen}
			item={{
				name: file.name,
				path: itemPath,
				fileType: file.type === 'dir' ? 'dir' : 'file',
			}}
			existingShares={activeShares}
			onSharesChange={onSharesChange}
		/>

		<Dialog open={previewOpen} onOpenChange={updatePreviewOpen}>
			<DialogContent
				className="max-h-[90dvh] max-w-5xl overflow-hidden p-0"
				onInteractOutside={keepPreviewOpenForFloatingUi}
				onPointerDownOutside={keepPreviewOpenForFloatingUi}
				onFocusOutside={keepPreviewOpenForFloatingUi}
			>
				<div className="flex max-h-[90dvh] min-h-[70dvh] flex-col">
					<DialogHeader className="border-b border-zinc-200/80 px-5 py-4 pr-16">
						<DialogTitle className="flex items-start gap-2 text-left leading-snug">
							<FileIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
							<span className="min-w-0 break-words pr-2">{file.name}</span>
						</DialogTitle>
					</DialogHeader>

					<div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_auto]">
						<div className="flex min-h-0 items-center justify-center overflow-auto bg-zinc-50/70 p-4">
							{previewError ? (
								<div className="flex h-full min-h-64 items-center justify-center text-sm text-red-600">{previewError}</div>
							) : null}

							{!previewError && !fileDetails ? (
								<div className="flex h-full min-h-64 items-center justify-center text-sm text-muted-foreground">Opening file...</div>
							) : null}

							{fileDetails?.previewType === 'image' ? (
								<div className="flex h-[62dvh] min-h-64 w-full items-center justify-center">
									<img
										src={fileDetails.rawUrl}
										alt={file.name}
										className="h-full w-full max-w-4xl rounded-xl object-contain shadow-sm"
									/>
								</div>
							) : null}

							{fileDetails?.previewType === 'video' ? (
								<div className="flex min-h-64 items-center justify-center">
									<video src={fileDetails.rawUrl} controls className="max-h-[62dvh] max-w-full rounded-xl bg-black shadow-sm" />
								</div>
							) : null}

							{fileDetails?.previewType === 'pdf' ? (
								<div className="h-[62dvh] min-h-64 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
									<iframe src={fileDetails.rawUrl} title={file.name} className="h-full w-full" />
								</div>
							) : null}

							{fileDetails?.previewType === 'text' ? (
								<pre className="max-h-[62dvh] w-full max-w-3xl overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-800 shadow-sm">
									{fileDetails.text ?? 'Text preview is too large to display.'}
								</pre>
							) : null}

							{fileDetails?.previewType === 'unsupported' ? (
								<div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
									<FileIcon className="h-10 w-10 text-zinc-300" />
									<span>No preview available for this file type.</span>
									<Button asChild variant="outline">
										<a href={`/file/u?path=${encodeURIComponent(itemPath)}`} target="_blank" rel="noreferrer">Download file</a>
									</Button>
								</div>
							) : null}
						</div>

						{metadataOpen ? (
							<aside className="min-h-0 w-full overflow-auto border-l border-zinc-200 bg-white p-4 md:w-72">
								<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
									<Info className="h-4 w-4" />
									Metadata
								</div>
								<table className="w-full text-sm">
									<tbody>
										{Object.entries(fileDetails?.metadata ?? {}).map(([key, value]) => (
											<tr key={key} className="border-b border-zinc-100 last:border-0">
												<td className="py-2 pr-3 text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{key}</td>
												<td className="break-all py-2 text-right text-zinc-700">{String(value)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</aside>
						) : null}
					</div>

					<DialogFooter className="gap-3 border-t border-zinc-200/80 px-5 py-3 sm:items-center sm:justify-between" onClick={(event) => event.stopPropagation()}>
						<div className="flex min-w-0 flex-1 items-center gap-2" onClick={(event) => event.stopPropagation()}>
							<span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Tags</span>
							<TagSelector
								path={itemPath}
								tags={tags}
								assignedTags={assignedTags}
								onChange={refreshTagAndShareData}
							/>
						</div>
						<div className="flex gap-2">
							<Button type="button" variant="outline" asChild>
								<a href={`/file/u?path=${encodeURIComponent(itemPath)}`} target="_blank" rel="noreferrer">
									<Download className="mr-2 h-4 w-4" />
									Download
								</a>
							</Button>
							<Button type="button" onClick={() => setShareOpen(true)}>
								<Share2 className="mr-2 h-4 w-4" />
								Share
							</Button>
							<Button type="button" variant="outline" onClick={() => setMetadataOpen((value) => !value)}>
								<PanelRightOpen className="mr-2 h-4 w-4" />
								{metadataOpen ? 'Hide details' : 'Details'}
							</Button>
						</div>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>

		<Dialog open={renameOpen} onOpenChange={setRenameOpen}>
			<DialogContent>
				<form onSubmit={renameItem}>
					<DialogHeader>
						<DialogTitle>Rename {file.type === 'dir' ? 'folder' : 'file'}</DialogTitle>
						<DialogDescription>
							Choose a new name for <span className="font-medium text-zinc-800">{file.name}</span>.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-2 py-5">
						<Label htmlFor={`rename-${itemPath}`}>Name</Label>
						<Input
							id={`rename-${itemPath}`}
							value={renameValue}
							onChange={(event) => setRenameValue(event.target.value)}
							autoFocus
						/>
						{error ? <p className="text-sm text-red-600">{error}</p> : null}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={saving || !renameValue.trim() || renameValue === file.name}>
							{saving ? 'Renaming...' : 'Rename'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>

		<Dialog open={moveOpen} onOpenChange={setMoveOpen}>
			<DialogContent>
				<form onSubmit={moveItem}>
					<DialogHeader>
						<DialogTitle>Move {file.type === 'dir' ? 'folder' : 'file'}</DialogTitle>
						<DialogDescription>
							Move <span className="font-medium text-zinc-800">{file.name}</span> to another folder.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-2 py-5">
						<Label>Destination folder</Label>
						<DirectorySelect
							key={`${itemPath}-${currentPath}`}
							name="destinationPath"
							defaultValue={currentPath || '/'}
							scope="user"
							rootLabel="Files"
						/>
						{error ? <p className="text-sm text-red-600">{error}</p> : null}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={saving}>
							{saving ? 'Moving...' : 'Move'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>

		<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete {file.type === 'dir' ? 'folder' : 'file'}?</DialogTitle>
					<DialogDescription>
						This will permanently delete <span className="font-medium text-zinc-800">{file.name}</span>
						{file.type === 'dir' ? ' and everything inside it' : ''}. This cannot be undone.
					</DialogDescription>
				</DialogHeader>

				{error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
						Cancel
					</Button>
					<Button type="button" variant="destructive" onClick={deleteItem} disabled={saving}>
						{saving ? 'Deleting...' : 'Delete permanently'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	);

};
