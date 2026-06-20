import { NewUserDialog } from "@/components/blocks/newuserdialog";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getServerSettings, getServerUsers, saveServerSettings } from "@/lib/actions";
import { Pen } from "lucide-react";

export default async function Settings() {
	const settings = await getServerSettings();
	const users = await getServerUsers();

	return (
		<>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/">Skurt</BreadcrumbLink>
					</BreadcrumbItem>

					<BreadcrumbSeparator>/</BreadcrumbSeparator>

					<BreadcrumbItem>
						<BreadcrumbPage>Settings</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">Settings</h1>
				<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
					Control server identity, invite users, and define which folders each account can access.
				</p>
			</div>

			<div className="space-y-10">
				<div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
					<div>
						<h2 className="text-base font-semibold tracking-tight md:text-lg">Server settings</h2>
						<p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
							General server settings. (Only visible for owner)
						</p>
					</div>

					<Card className="col-span-2 p-6">
						<form className="grid gap-5" action={saveServerSettings}>
							<div className="grid gap-2">
								<Label htmlFor="server-name">Server Name</Label>
								<Input
									id="server-name"
									name="server-name"
									placeholder="Big NAS"
									defaultValue={settings.serverName}
								/>
							</div>

							<div className="flex">
								<Button className="ml-auto">Save settings</Button>
							</div>
						</form>
					</Card>
				</div>


				<div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
					<div>
						<h2 className="text-base font-semibold tracking-tight md:text-lg">Users</h2>
						<p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
							Manage users. (Only visible for admins)
						</p>
					</div>

					<Card className="col-span-2 overflow-hidden">
						<div className="flex items-center justify-between gap-4 border-b border-zinc-200/80 p-5">
							<h2 className="text-base font-semibold md:text-lg">Users</h2>
							<NewUserDialog>
								<Button>Add user</Button>
							</NewUserDialog>
						</div>

						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Base Directory</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{users.map((user) => {
									return (
										<TableRow key={user.id}>
											<TableCell style={{ height: 49 }}>
												<div className="flex items-center gap-2">
													<Pen className="h-4 w-4 text-muted-foreground cursor-pointer" />

													{user.name}
												</div>
											</TableCell>

											<TableCell>{user.email}</TableCell>
											<TableCell>
												{user.role == 'O' ? 'Owner' : null}
												{user.role == 'A' ? 'Admin' : null}
												{user.role == 'U' ? 'User' : null}
											</TableCell>
											<TableCell>{user.rootDir}</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>

					</Card>
				</div>
			</div>
		</>
	);
}
