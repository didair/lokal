import Link from "next/link";
import { Input } from "@/components/ui/input"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"
import { BellIcon, CircleUserIcon, SearchIcon, FileIcon, MenuIcon, HomeIcon, UsersIcon, Package2Icon, PinIcon, TagIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { getCurrentUser, getServerName, getTags } from "@/lib/actions";
import FileUpload from "./fileupload";

export const Header = async () => {
	const server_name = await getServerName();
	const current_user = await getCurrentUser();
	const tags = await getTags();

	return (
		<header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-zinc-200/80 bg-white/75 px-4 backdrop-blur-xl lg:px-6">
			<Sheet>
				<SheetTrigger asChild>
					<Button variant="outline" size="icon" className="shrink-0 md:hidden">
						<MenuIcon className="h-5 w-5" />
						<span className="sr-only">Toggle navigation menu</span>
					</Button>
				</SheetTrigger>

				<SheetContent side="left" className="flex flex-col">
					<nav className="grid gap-2 text-lg font-medium">
						<Link href="#" className="flex items-center gap-2 text-lg font-semibold" prefetch={false}>
							<span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500 text-white">
								<Package2Icon className="h-5 w-5" />
							</span>
							<span className="sr-only">{server_name}</span>
						</Link>

						<Link
							href="/"
							className="mx-[-0.65rem] flex items-center gap-4 rounded-xl bg-muted px-3 py-2 text-primary hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
							prefetch={false}
						>
							<HomeIcon className="h-5 w-5" />
							Dashboard
						</Link>

						<Link
							href="/files"
							className="mx-[-0.65rem] flex items-center gap-4 rounded-xl bg-muted px-3 py-2 text-primary hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
							prefetch={false}
						>
							<FileIcon className="h-5 w-5" />
							Files
						</Link>

						<Link
							href="/shared"
							className="mx-[-0.65rem] flex items-center gap-4 rounded-xl bg-muted px-3 py-2 text-primary hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
							prefetch={false}
						>
							<UsersIcon className="h-5 w-5" />
							Shared with me
						</Link>

						<Link
							href="#"
							className="mx-[-0.65rem] flex items-center gap-4 rounded-xl bg-muted px-3 py-2 text-primary hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
							prefetch={false}
						>
							<PinIcon className="h-5 w-5" />
							Pins
						</Link>

						<Separator className="my-2" />

						<div className="mx-[-0.65rem] px-3 text-lg font-medium text-muted-foreground">Tags</div>

						{tags.map((tag) => (
							<Link
								key={tag.id}
								href={`/files?tag=${tag.id}`}
								className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
								prefetch={false}
							>
								<TagIcon className="h-5 w-5" style={{ color: tag.color }} />
								{tag.name}
							</Link>
						))}
					</nav>
				</SheetContent>
			</Sheet>

			<div className="w-full flex-1">
				<form>
					<div className="relative max-w-xl">
						<SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Search files..."
							className="w-full appearance-none bg-white/75 pl-8 shadow-sm"
						/>
					</div>
				</form>
			</div>

			<div className="ml-auto flex items-center gap-2">
				<FileUpload />

				<Button variant="secondary" size="icon" className="rounded-full">
					<BellIcon className="h-5 w-5" />
					<span className="sr-only">Toggle notifications</span>
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="secondary" size="icon" className="rounded-full">
							<CircleUserIcon className="h-5 w-5" />
							<span className="sr-only">Toggle user menu</span>
						</Button>
					</DropdownMenuTrigger>

					<DropdownMenuContent align="end">
						<DropdownMenuLabel>{current_user.name}</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link href="/settings" className="cursor-pointer">
								Settings
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<a target="_blank" className="cursor-pointer" href="https://github.com/didair/lokal/wiki">
								Wiki
							</a>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link href="/logout" className="cursor-pointer" prefetch={false}>
								Logout
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
}
