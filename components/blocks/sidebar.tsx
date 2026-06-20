import Link from "next/link";
import { FileIcon, HomeIcon, UsersIcon, Package2Icon, PinIcon, TagIcon } from "lucide-react";
import { Separator } from "../ui/separator";
import { SidebarItem } from "../ui/sidebaritem";
import { getServerName, getTags } from "@/lib/actions";

export const Sidebar = async () => {
	const server_name = await getServerName();
	const tags = await getTags();

	return (
		<div className="flex h-full max-h-screen flex-col gap-4">
			<div className="flex h-16 items-center border-b border-zinc-200/80 px-4 lg:px-5">
				<Link href="/" className="flex min-w-0 items-center gap-3 font-semibold" prefetch={false}>
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-sm shadow-rose-500/25">
						<Package2Icon className="h-5 w-5" />
					</span>
					<span className="truncate text-sm tracking-tight">{server_name}</span>
				</Link>
			</div>

			<div className="flex-1 overflow-auto">
				<nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
					<SidebarItem href="/">
						<HomeIcon className="h-4 w-4" />
						Dashboard
					</SidebarItem>

					<SidebarItem href="/files">
						<FileIcon className="h-4 w-4" />
						Files
					</SidebarItem>

					<SidebarItem href="/shared">
						<UsersIcon className="h-4 w-4" />
						Shared with me
					</SidebarItem>

					<SidebarItem href="#">
						<PinIcon className="h-4 w-4" />
						Pins
					</SidebarItem>

					<div>
						<Separator className="my-3" />

						<div className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tags</div>
					</div>

					{tags.map((tag) => (
						<SidebarItem href={`/files?tag=${tag.id}`} key={tag.id}>
							<TagIcon className="h-4 w-4" style={{ color: tag.color }} />
							{tag.name}
						</SidebarItem>
					))}
				</nav>
			</div>
		</div>
	);
}
