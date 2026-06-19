import { NextResponse } from "next/server"
import { getFilesInDirectory } from "@/lib/file-utils";
import { getCurrentSession } from "@/lib/user";
import { getServerIsSetup } from "@/lib/actions";
import prisma from "@/lib/prisma";
import { DATA_DIR } from "@/lib/data-dir";

export async function GET() {
	let valid = false;
	const isServerSetup = await getServerIsSetup();

	if (!isServerSetup) {
		valid = true;
	} else {
		const session = await getCurrentSession();
		const user = await prisma.user.findUnique({
			where: {
				id: (session?.user as any).id ?? '',
			},
			select: {
				role: true,
			}
		});

		valid = user != null && user.role == 'O';
	}

	if (!valid) {
		return NextResponse.json(null);
	}

	const root_dir = DATA_DIR;
	const response = getFilesInDirectory(root_dir).filter((file) => file.type === 'dir');
	return NextResponse.json(response);
};
