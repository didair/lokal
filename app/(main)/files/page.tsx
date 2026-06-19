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

			<div className="flex items-center">
				<h1 className="text-lg font-semibold md:text-2xl">Files</h1>
			</div>

			<div className="border shadow-lg rounded-lg">
				<FileView />
			</div>
		</>
	)
}
