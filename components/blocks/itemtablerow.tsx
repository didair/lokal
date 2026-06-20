"use client";

import type { File } from "@/lib/file-utils";

import { useState } from "react";
import Link from "next/link";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "../ui/context-menu";
import { FileIcon, FolderIcon, CircleAlertIcon, Share2 } from "lucide-react";
import { TableRow, TableCell } from "../ui/table";
import { formatDate } from "@/lib/utils";
import { ShareDialog, type ShareSummary } from "./sharedialog";
import { TagSelector, type Tag } from "./tagselector";

export const ItemTableRow = ({
	file,
	currentPath,
	itemPath: providedItemPath,
	showPath = false,
	tags,
	assignedTags,
	activeShares,
	onClick = () => null,
	onNavigate = () => null,
	onTagsChange = () => null,
	onSharesChange = () => null,
}: {
	file: File,
	currentPath: string,
	itemPath?: string,
	showPath?: boolean,
	tags: Tag[],
	assignedTags: Tag[],
	activeShares: ShareSummary[],
	onClick?: (file: File) => void,
	onNavigate?: (file: File) => void,
	onTagsChange?: () => void,
	onSharesChange?: () => void,
}) => {
	const [shareOpen, setShareOpen] = useState(false);
	const itemPath = providedItemPath ?? [currentPath, file.name].join('/').replace(/\/+/g, '/');
	const download_path = itemPath;
	const onItemDoubleClick = () => {
	};

	return (
		<>
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<TableRow onClick={() => onClick(file)} onDoubleClick={onItemDoubleClick} style={{ height: 49 }}>
					{/* Name */}
					<TableCell>
						<div className="flex items-center gap-2">
							{/* Icon */}
							{file.type == 'dir' ?
								<FolderIcon className="h-4 w-4 text-muted-foreground" />
							: null}

							{file.type == 'file' ?
								<FileIcon className="h-4 w-4 text-muted-foreground" />
							: null}

							{file.type == 'other' ?
								<CircleAlertIcon className="h-4 w-4 text-muted-foreground" />
							: null}

							{/* Name */}
							<Link href="#" onClick={(e) => { e.preventDefault(); onNavigate(file) }} className="font-medium" prefetch={false}>
								{file.name}
							</Link>

							{activeShares.length > 0 ?
								<Share2 className="h-4 w-4 text-muted-foreground" aria-label="Active share link" />
							: null}

							{showPath ?
								<span className="text-xs text-muted-foreground">
									/{itemPath.replace(/^\/+/, '')}
								</span>
							: null}
						</div>
					</TableCell>

					{/* Tags */}
					<TableCell onClick={(event) => event.stopPropagation()}>
						<TagSelector
							path={itemPath}
							tags={tags}
							assignedTags={assignedTags}
							onChange={onTagsChange}
						/>
					</TableCell>

					{/* Date */}
					<TableCell>
						{formatDate(file.date)}
					</TableCell>

					{/* Size */}
					<TableCell>{file.type == 'dir' ? '-' : file.size}</TableCell>
				</TableRow>
			</ContextMenuTrigger>

			<ContextMenuContent>
				{file.type == 'file' ?
					<ContextMenuItem asChild>
						<a href={`/file/u?path=${download_path}`} target="_blank" className="cursor-pointer">
							Download
						</a>
					</ContextMenuItem>
				: null}

				<ContextMenuItem onSelect={(event) => { event.preventDefault(); setShareOpen(true); }}>Share</ContextMenuItem>
				<ContextMenuItem disabled>Rename</ContextMenuItem>
				<ContextMenuItem disabled>Delete</ContextMenuItem>
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
		</>
	);

};
