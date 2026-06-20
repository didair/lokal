import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Card } from "@/components/ui/card";
import { getDashboardOverview, getServerName } from "@/lib/actions"
import { TagsIcon, UsersIcon, Share2Icon } from "lucide-react";

export default async function Home() {
	const server_name = await getServerName();
	const overview = await getDashboardOverview();
	const cards = [
		{
			label: 'Active share links',
			value: overview.activeShares,
			icon: Share2Icon,
			helper: 'Links created from this account',
		},
		{
			label: 'Shared with me',
			value: overview.sharedWithMe,
			icon: UsersIcon,
			helper: 'Private links from other users',
		},
		{
			label: 'Tags',
			value: overview.tags,
			icon: TagsIcon,
			helper: 'Labels in your file browser',
		},
		{
			label: 'Users',
			value: overview.role === 'O' ? overview.users : 'Owner only',
			icon: UsersIcon,
			helper: 'Accounts with access',
		},
	];

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

			<section className="grid gap-6">
				<div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_70px_-50px_rgba(24,24,27,0.75)] backdrop-blur lg:p-8">
					<div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
						<div className="max-w-2xl">
							<div className="mb-3 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
								Local administration
							</div>
							<h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
								{server_name || 'Lokal'} control center
							</h1>
							<p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
								Manage access, organize files, and keep share links visible from one place.
							</p>
						</div>

						<div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm">
							{overview.role === 'O' ? 'Owner access' : 'User access'}
						</div>
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{cards.map((card) => {
						const Icon = card.icon;

						return (
							<Card className="h-full p-5" key={card.label}>
								<div className="flex items-start justify-between gap-4">
									<div>
										<p className="text-sm font-medium text-muted-foreground">{card.label}</p>
										<p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{card.value}</p>
									</div>
									<span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
										<Icon className="h-5 w-5" />
									</span>
								</div>
								<p className="mt-6 text-xs leading-5 text-muted-foreground">{card.helper}</p>
							</Card>
						);
					})}
				</div>
			</section>
		</>
	)
}
