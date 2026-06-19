import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { getServerName } from "@/lib/actions"

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
						<BreadcrumbPage>Dashboard</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex flex-col">
				<h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
			</div>
		</>
	)
}
