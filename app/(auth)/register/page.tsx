"use client";

import { useState, useEffect } from "react";
import { InviteLink } from "@prisma/client";
import { getInvite, registerAction } from "@/lib/actions"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function Register() {
	const [invite, setInvite] = useState<InviteLink | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			const inviteId = new URLSearchParams(window.location.search).get('invite');

			if (inviteId == null) {
				return;
			}

			const invite = await getInvite(inviteId);
			setInvite(invite);
		};

		fetchData();
	}, []);

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.target as any);
		await registerAction(formData).catch((error: Error) => {
			setError(error.message);
		});
	};

	if (invite == null || invite.used) {
		// Invite not valid
		return null;
	}

	return (
		<div className="min-w-full min-h-full flex items-center justify-center py-6 overflow-auto">
			<Card className="mx-auto max-w-sm">
				<CardHeader>
					<CardTitle className="text-xl">Sign Up</CardTitle>
					<CardDescription>
						Welcome! Begin by filling in your details below
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form onSubmit={onSubmit}>
						<div className="grid gap-4">
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
								<Input
									id="email"
									name="email"
									type="email"
									placeholder="m@example.com"
									required
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="password">Password</Label>
								<Input id="password" name="password" type="password" />
							</div>

							<Input type="hidden" value={invite.id} name="inviteId" />

							<Button type="submit" className="w-full">
								Create an account
							</Button>
						</div>
					</form>

					<div className="mt-4 text-center text-sm">
						Already have an account?{" "}
						<Link href="/login" className="underline">
							Sign in
						</Link>
					</div>
				</CardContent>
			</Card>

			{error ?
				<div className="text-red-500 font-medium mt-2 text-center">
					{error}
				</div>
			: null}
		</div>
	)
}
