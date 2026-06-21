"use client";

import type { File } from "@/lib/file-utils";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "../ui/context-menu";
import { FileIcon, FolderIcon, CircleAlertIcon, Share2, MoreHorizontal } from "lucide-react";
import { TableRow, TableCell } from "../ui/table";
import { formatDate } from "@/lib/utils";
import { ShareDialog, type ShareSummary } from "./sharedialog";
import { TagSelector, type Tag } from "./tagselector";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";

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
}) => {
	const [shareOpen, setShareOpen] = useState(false);
	const [renameOpen, setRenameOpen] = useState(false);
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

	const refreshData = () => {
		onTagsChange();
		onSharesChange();
	};

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
		refreshData();
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
		refreshData();
	};

	const hasMobileActions = actions !== 'none';

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
														onNavigate(file);
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
												triggerClassName="h-7 w-7"
											/>
										) : null}

										{hasMobileActions ? (
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="outline" size="icon" className="h-7 w-7 rounded-full" aria-label="Open file actions">
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

													{actions === 'owner' && file.type == 'file' ?
														<DropdownMenuItem asChild>
															<a href={`/file/u?path=${download_path}`} target="_blank" className="cursor-pointer">
																Download
															</a>
														</DropdownMenuItem>
													: null}

													{actions === 'owner' ? (
														<>
															<DropdownMenuItem onSelect={(event) => { event.preventDefault(); setShareOpen(true); }}>Share</DropdownMenuItem>
															<DropdownMenuItem onSelect={(event) => { event.preventDefault(); setError(''); setRenameOpen(true); }}>Rename</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={(event) => { event.preventDefault(); setError(''); setDeleteOpen(true); }}>Delete</DropdownMenuItem>
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

				{actions === 'owner' && file.type == 'file' ?
					<ContextMenuItem asChild>
						<a href={`/file/u?path=${download_path}`} target="_blank" className="cursor-pointer">
							Download
						</a>
					</ContextMenuItem>
				: null}

				{actions === 'owner' ? (
					<>
						<ContextMenuItem onSelect={(event) => { event.preventDefault(); setShareOpen(true); }}>Share</ContextMenuItem>
						<ContextMenuItem onSelect={(event) => { event.preventDefault(); setError(''); setRenameOpen(true); }}>Rename</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem className="text-red-600 focus:text-red-600" onSelect={(event) => { event.preventDefault(); setError(''); setDeleteOpen(true); }}>Delete</ContextMenuItem>
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
