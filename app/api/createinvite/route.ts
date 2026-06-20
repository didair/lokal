import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/user";
import prisma from "@/lib/prisma";
import { getPublicUrl } from "@/lib/public-url";

export async function POST(request: Request) {
	const session = await getCurrentSession();
	const user = await prisma.user.findUnique({
		where: {
			id: (session?.user as any).id ?? '',
		},
		select: {
			role: true,
		}
	});

	if (user == null || user.role != 'O') {
		return NextResponse.json(null);
	}

	const formData = await request.json();
	const inviteLink = await prisma.inviteLink.create({
		data: formData,
	});

	return NextResponse.json({
		...inviteLink,
		link: `${getPublicUrl(request)}/register?invite=${inviteLink.id}`,
	});
};
