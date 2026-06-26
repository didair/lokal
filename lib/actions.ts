'use server';

import { redirect } from "next/navigation";
import { signIn, createUser, destroyCurrentSession, getCurrentSession, User } from "./user";
import { revalidatePath } from "next/cache";
import prisma from "./prisma";
import type { Prisma } from "@prisma/client";

type SharedWithMeShare = Prisma.ShareGetPayload<{
	include: {
		owner: { select: { name: true } },
	},
}>;

type SharedByMeShare = Prisma.ShareGetPayload<{
	include: {
		recipient: { select: { id: true, name: true, email: true } },
	},
}>;

const activeShareWhere = (now: Date) => ({
	OR: [
		{ expiresAt: null },
		{ expiresAt: { gt: now } },
	],
});

const isUnreadShare = (share: { maxReads: number | null; readCount: number }) => {
	return share.maxReads == null || share.readCount < share.maxReads;
};

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

export async function saveFileSettings(formData: FormData) {
	const owner = await isUserOwner();
	if (!owner) { return; }

	await prisma.setting.upsert({
		where: { id: 'files-ignore-ds-store' },
		update: { value: formData.get('ignore-ds-store') === 'on' ? 'true' : 'false' },
		create: {
			id: 'files-ignore-ds-store',
			value: formData.get('ignore-ds-store') === 'on' ? 'true' : 'false',
		},
	});

	revalidatePath('/settings');
	revalidatePath('/files');
};

export async function getServerSettings() {
	const owner = await isUserOwner();

	const response = {
		serverName: '',
		ignoreDsStore: false,
	};

	if (!owner) { return response; }

	await prisma.setting.findUnique({
		where: { id: 'server-name' },
	}).then((setting) => response['serverName'] = setting?.value ?? '' );

	await prisma.setting.findUnique({
		where: { id: 'files-ignore-ds-store' },
	}).then((setting) => response['ignoreDsStore'] = setting?.value === 'true' );

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


export async function getSharedWithMe(): Promise<SharedWithMeShare[]> {
	const currentUser = await getCurrentUser();
	const now = new Date();
	const shares = await prisma.share.findMany({
		where: {
			access: 'private',
			ownerId: { not: currentUser.id },
			OR: [
				{ recipientId: currentUser.id },
				{ recipientId: null },
			],
			AND: [activeShareWhere(now)],
		},
		include: {
			owner: { select: { name: true } },
		},
		orderBy: { createdAt: 'desc' },
	});

	return shares.filter(isUnreadShare);
}

export async function getSharedPageData(): Promise<{ sharedWithMe: SharedWithMeShare[]; sharedByMe: SharedByMeShare[] }> {
	const currentUser = await getCurrentUser();
	const now = new Date();

	const [sharedWithMe, sharedByMe] = await Promise.all([
		getSharedWithMe(),
		prisma.share.findMany({
			where: {
				ownerId: currentUser.id,
				...activeShareWhere(now),
			},
			include: {
				recipient: { select: { id: true, name: true, email: true } },
			},
			orderBy: { createdAt: 'desc' },
		}),
	]);

	return {
		sharedWithMe,
		sharedByMe: sharedByMe.filter(isUnreadShare),
	};
}

export async function getTags() {
	const currentUser = await getCurrentUser();

	return prisma.tag.findMany({
		where: { ownerId: currentUser.id },
		orderBy: { name: 'asc' },
	});
}

export async function getDashboardOverview() {
	const currentUser = await getCurrentUser();
	const now = new Date();

	const [tags, sharedWithMe, activeShares, users] = await Promise.all([
		prisma.tag.count({ where: { ownerId: currentUser.id } }),
		prisma.share.count({
			where: {
				access: 'private',
				ownerId: { not: currentUser.id },
				OR: [
					{ recipientId: currentUser.id },
					{ recipientId: null },
				],
				AND: [
					{
						OR: [
							{ expiresAt: null },
							{ expiresAt: { gt: now } },
						],
					},
				],
			},
		}),
		prisma.share.count({
			where: {
				ownerId: currentUser.id,
				OR: [
					{ expiresAt: null },
					{ expiresAt: { gt: now } },
				],
			},
		}),
		currentUser.role === 'O' ? prisma.user.count() : Promise.resolve(0),
	]);

	return {
		tags,
		sharedWithMe,
		activeShares,
		users,
		role: currentUser.role,
	};
}
