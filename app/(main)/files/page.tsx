import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { FileView } from "@/components/blocks/fileview";
import { getServerName } from "@/lib/actions";

export default async function Home() {
	const server_name = await getServerName();

	return (
		<>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/">{server_name}</BreadcrumbLink>
					</BreadcrumbItem>

					<BreadcrumbSeparator>/</BreadcrumbSeparator>

					<BreadcrumbItem>
						<BreadcrumbPage>Files</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">Files</h1>
				<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
					Browse local storage, apply tags, and create expiring share links for files or folders.
				</p>
			</div>

			<div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/85 shadow-[0_24px_70px_-50px_rgba(24,24,27,0.7)] backdrop-blur">
				<FileView />
			</div>
		</>
	)
}
