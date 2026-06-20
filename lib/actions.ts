'use server';

import { redirect } from "next/navigation";
import { signIn, createUser, destroyCurrentSession, getCurrentSession, User } from "./user";
import { revalidatePath } from "next/cache";
import prisma from "./prisma";

export async function authenticateAction(formData: FormData) {
	const user = await signIn({
		email: formData.get('email')?.toString() ?? '',
		password: formData.get('password')?.toString() ?? '',
	}).catch(() => null);

	if (user) {
		return redirect('/');
	}

	revalidatePath('/login');
	return redirect('/login?error=invalid');
};

export async function registerAction(formData: FormData) {
	const inviteId = formData.get('inviteId')?.toString() ?? '';
	const invite = await getInvite(inviteId);

	if (invite == null || invite.used) {
		throw new Error('Invite invalid!');
	}

	const user = await createUser({
		email: formData.get('email')?.toString() ?? '',
		password: formData.get('password')?.toString() ?? '',
		name: (formData.get('first-name')?.toString() ?? '') + ' ' + (formData.get('last-name')?.toString() ?? ''),
		rootDir: invite.rootDir,
		role: invite.role,
	}).catch((error) => {
		throw new Error('Could not register user. Message: ' + error);
	});

	if (user) {
		// Set inviteLink as expired
		await prisma.inviteLink.update({
			where: { id: inviteId },
			data: { used: true },
		});

		return redirect('/');
	}

	return revalidatePath('/register');
};

export async function logoutAction() {
	await destroyCurrentSession();
	redirect('/login');
};

export async function saveServerSettings(formData: FormData) {
	const owner = await isUserOwner();
	if (!owner) { return; }

	await prisma.setting.upsert({
		where: { id: 'server-name' },
		update: { value: formData.get('server-name')?.toString() ?? '' },
		create: {
			id: 'server-name',
			value: formData.get('server-name')?.toString() ?? '',
		},
	});

	revalidatePath('/settings');

	return;
};

export async function getServerSettings() {
	const owner = await isUserOwner();

	const response = {
		serverName: '',
	};

	if (!owner) { return response; }

	await prisma.setting.findUnique({
		where: { id: 'server-name' },
	}).then((setting) => response['serverName'] = setting?.value ?? '' );

	return response;
};

export async function getServerUsers() {
	const owner = await isUserOwner();
	if (!owner) { return []; }

	const users = await prisma.user.findMany({
		select: {
			id: true,
			name: true,
			email: true,
			rootDir: true,
			role: true,
			createdAt: true,
			updatedAt: true,
		}
	});

	return users;
};

export async function getServerIsSetup() {
	const users = await prisma.user.count();
	const server_name = await prisma.setting.findUnique({
		where: {
			id: 'server_name',
		}
	});

	return users > 0 || server_name?.value != null;
};

export async function setupServerAction(formData: FormData) {
	await prisma.setting.upsert({
		where: { id: 'server-name' },
		update: { value: formData.get('server-name')?.toString() ?? '' },
		create: {
			id: 'server-name',
			value: formData.get('server-name')?.toString() ?? '',
		},
	}).catch((error) => {
		throw new Error('Could not insert server name. Message: ' + error);
	});

	await createUser({
		email: formData.get('email')?.toString() ?? '',
		password: formData.get('password')?.toString() ?? '',
		name: (formData.get('first-name')?.toString() ?? '') + ' ' + (formData.get('last-name')?.toString() ?? ''),
		rootDir: formData.get('rootDir')?.toString() ?? '/',
		role: 'O',
	}).catch((error) => {
		throw new Error('Could not register user. Message: ' + error);
	});

	redirect('/');
};

export async function getServerName() {
	const name = await prisma.setting.findUnique({
		where: {
			id: 'server-name',
		},
	});

	return name?.value ?? '';
};

export async function getCurrentUser(): Promise<User> {
	const session = await getCurrentSession();
	return (session as any).user;
};

export async function isUserOwner(): Promise<boolean> {
	const user = await getCurrentUser();
	return user.role === 'O';
}

export async function getInvite(inviteId: string) {
	const invite = await prisma.inviteLink.findUnique({
		where: {
			id: inviteId,
		},
	});

	return invite;
};
