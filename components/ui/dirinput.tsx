"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Folder, FolderOpen, HardDrive, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { File } from "@/lib/file-utils";

type DirectoryResponse = {
	path: string;
	parent: string | null;
	dirs: File[];
};

function normalizePath(value?: string) {
	const parts = (value || '/')
		.replace(/\\/g, '/')
		.split('/')
		.filter(Boolean)
		.filter((part) => part !== '.' && part !== '..');

	return parts.length ? `/${parts.join('/')}` : '/';
}

function joinPath(base: string, child: string) {
	return normalizePath(`${normalizePath(base)}/${child}`);
}

export function DirectorySelect({
	name = "rootDir",
	defaultValue = "/",
	placeholder = "Select directory",
	scope = "data",
	rootLabel = scope === "data" ? "Data" : "Files",
}: {
	name?: string;
	defaultValue?: string;
	placeholder?: string;
	scope?: "data" | "user";
	rootLabel?: string;
}) {
	const [open, setOpen] = useState(false);
	const [selectedPath, setSelectedPath] = useState(normalizePath(defaultValue));
	const [browsePath, setBrowsePath] = useState(normalizePath(defaultValue));
	const [parent, setParent] = useState<string | null>(null);
	const [dirs, setDirs] = useState<File[]>([]);
	const [filter, setFilter] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handlePointerDown = (event: PointerEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};

		document.addEventListener('pointerdown', handlePointerDown);
		return () => document.removeEventListener('pointerdown', handlePointerDown);
	}, []);

	useEffect(() => {
		if (!open) return;

		setLoading(true);
		setError("");

		fetch(`/api/rootdirs?path=${encodeURIComponent(browsePath)}&scope=${scope}`)
			.then(async (response) => {
				const body = await response.json();
				if (!response.ok) {
					throw new Error(body.error || 'Could not read directories');
				}

				const data = body as DirectoryResponse;
				setParent(data.parent);
				setDirs(data.dirs ?? []);
			})
			.catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : 'Could not read directories'))
			.finally(() => setLoading(false));
	}, [browsePath, open, scope]);

	const visibleDirs = useMemo(() => {
		const query = filter.trim().toLowerCase();
		if (!query) return dirs;
		return dirs.filter((dir) => dir.name.toLowerCase().includes(query));
	}, [dirs, filter]);

	const breadcrumb = normalizePath(browsePath).split('/').filter(Boolean);

	return (
		<div ref={containerRef} className="relative">
			<input type="hidden" name={name} value={selectedPath} />

			<button
				type="button"
				onClick={() => {
					setBrowsePath(selectedPath);
					setOpen((value) => !value);
				}}
				className="flex h-11 w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white/90 px-3 text-left text-sm shadow-sm shadow-zinc-950/[0.02] ring-offset-white transition hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
			>
				<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
					<FolderOpen className="h-4 w-4" />
				</span>
				<span className={cn("min-w-0 flex-1 truncate font-medium", selectedPath ? "text-zinc-950" : "text-zinc-400")}>
					{selectedPath || placeholder}
				</span>
				<ChevronRight className={cn("h-4 w-4 shrink-0 text-zinc-400 transition", open && "rotate-90")} />
			</button>

			{open ? (
				<div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_70px_-35px_rgba(24,24,27,0.45)]">
					<div className="border-b border-zinc-100 bg-zinc-50/70 p-3">
						<div className="mb-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap rounded-xl bg-white p-1 text-sm shadow-sm">
							<button
								type="button"
								onClick={() => setBrowsePath('/')}
								className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium", browsePath === '/' ? "bg-rose-50 text-rose-700" : "text-zinc-600 hover:bg-zinc-50")}
							>
								<HardDrive className="h-3.5 w-3.5" />
								{rootLabel}
							</button>

							{breadcrumb.map((part, index) => {
								const path = `/${breadcrumb.slice(0, index + 1).join('/')}`;
								return (
									<div key={path} className="inline-flex items-center gap-1">
										<ChevronRight className="h-3 w-3 text-zinc-300" />
										<button
											type="button"
											onClick={() => setBrowsePath(path)}
											className={cn("rounded-lg px-2.5 py-1.5 font-medium", browsePath === path ? "bg-rose-50 text-rose-700" : "text-zinc-600 hover:bg-zinc-50")}
										>
											{part}
										</button>
									</div>
								);
							})}
						</div>

						<div className="relative">
							<Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
							<Input
								value={filter}
								onChange={(event) => setFilter(event.target.value)}
								placeholder="Filter folders in this level"
								className="h-9 bg-white pl-9"
							/>
						</div>
					</div>

					<div className="max-h-72 overflow-y-auto p-2">
						{parent ? (
							<button
								type="button"
								onClick={() => setBrowsePath(parent)}
								className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-50"
							>
								<ChevronLeft className="h-4 w-4" />
								Up one folder
							</button>
						) : null}

						{loading ? (
							<div className="px-3 py-8 text-center text-sm text-muted-foreground">Reading folders...</div>
						) : null}

						{error ? (
							<div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
						) : null}

						{!loading && !error && visibleDirs.length === 0 ? (
							<div className="px-3 py-8 text-center text-sm text-muted-foreground">No folders at this level.</div>
						) : null}

						{visibleDirs.map((dir) => {
							const nextPath = joinPath(browsePath, dir.name);
							return (
								<button
									type="button"
									key={nextPath}
									onClick={() => {
										setBrowsePath(nextPath);
										setFilter("");
									}}
									className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-rose-50/70"
								>
									<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 group-hover:bg-white group-hover:text-rose-600">
										<Folder className="h-4 w-4" />
									</span>
									<span className="min-w-0 flex-1 truncate font-medium text-zinc-800">{dir.name}</span>
									<ChevronRight className="h-4 w-4 text-zinc-300" />
								</button>
							);
						})}
					</div>

					<div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/70 px-3 py-3">
						<div className="min-w-0 text-xs text-muted-foreground">
							Use <span className="font-medium text-zinc-700">{browsePath}</span>
						</div>
						<Button
							type="button"
							size="sm"
							onClick={() => {
								setSelectedPath(browsePath);
								setOpen(false);
							}}
						>
							Select folder
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}

export const DirInput = DirectorySelect;
