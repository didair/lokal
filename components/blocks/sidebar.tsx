import Link from "next/link";
import { FileIcon, HomeIcon, UsersIcon, Package2Icon, PinIcon, TagIcon } from "lucide-react";
import { Separator } from "../ui/separator";
import { SidebarItem } from "../ui/sidebaritem";
import { getServerName } from "@/lib/actions";

export const Sidebar = async () => {
	const server_name = await getServerName();
	return (
		<div className="flex h-full max-h-screen flex-col gap-2">
			<div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
				<Link href="/" className="flex items-center gap-2 font-semibold" prefetch={false}>
					<Package2Icon className="h-6 w-6" />
					<span className="">{server_name}</span>
				</Link>
			</div>

			<div className="flex-1 overflow-auto">
				<nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
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
						<Separator className="my-2" />

						<div className="px-3 text-sm font-medium text-muted-foreground">Tags</div>
					</div>

					<SidebarItem href="#">
						<TagIcon className="h-4 w-4" />
						Photos May
					</SidebarItem>

					<SidebarItem href="#">
						<TagIcon className="h-4 w-4" />
						Important work
					</SidebarItem>
				</nav>
			</div>
		</div>
	);
}
