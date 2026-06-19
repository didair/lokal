"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getServerIsSetup, setupServerAction } from "@/lib/actions";
import { DirInput } from "@/components/ui/dirinput";

export default function Setup() {
	const [error, setError] = useState<string | null>(null);
	const [valid, setValid] = useState<boolean>(false);
	const router = useRouter();

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.target as any);
		await setupServerAction(formData).catch((error: Error) => {
			setError(error.message);
		});
	};

	useEffect(() => {
		getServerIsSetup().then((v) => {
			if (v) {
				router.replace('/login');
			}

			setValid(!v);
		});
	}, [router]);

	if (!valid) {
		return null;
	}

	return (
		<div className="min-w-full min-h-full flex items-center justify-center py-6 overflow-auto">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle className="text-2xl">Setup new server</CardTitle>
					<CardDescription>Welcome to Lokal! Get started by creating your user. You will become the owner of this server</CardDescription>
				</CardHeader>

				<form onSubmit={onSubmit}>
					<CardContent className="grid gap-4">
						<h3 className="text-lg font-semibold">Server settings</h3>

						<div className="grid gap-2">
							<Label htmlFor="server-name">Server name</Label>
							<Input
								id="server-name"
								name="server-name"
								placeholder="Big NAS"
								required
							/>
						</div>

						<h3 className="text-lg font-semibold">Owner settings</h3>

						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="first-name">First name</Label>
								<Input id="first-name" name="first-name" placeholder="Max" required />
							</div>

							<div className="grid gap-2">
								<Label htmlFor="last-name">Last name</Label>
								<Input id="last-name" name="last-name" placeholder="Robinson" required />
							</div>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<Input id="email" name="email" type="email" placeholder="m@example.com" required />
						</div>

						<div className="grid gap-2">
							<Label htmlFor="password">Password</Label>
							<Input id="password" name="password" type="password" required />
						</div>

						<div>
							<Label>User files location</Label>
							<DirInput />
						</div>
					</CardContent>

					<CardFooter className="flex-col">
						<Button className="w-full">Setup Lokal</Button>
					</CardFooter>
				</form>
			</Card>

			{error ?
				<div className="text-red-500 font-medium mt-2">
					{error}
				</div>
				: null}
		</div>
	);
}
