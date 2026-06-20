import { NextResponse } from "next/server"
import { getFilesInDirectory } from "@/lib/file-utils";
import { getCurrentSession } from "@/lib/user";
import prisma from "@/lib/prisma";
import { dataPath } from "@/lib/data-dir";

export async function POST(request: Request) {
	const formData = await request.json();
	const session = await getCurrentSession();
	const user = await prisma.user.findUnique({
		where: {
			id: (session?.user as any).id ?? '',
		},
		select: {
			rootDir: true,
		}
	});

	if (user == null) {
		return NextResponse.json(null);
	}

	const root_dir = user.rootDir;

	let user_path: string = formData.path;

	if (user_path[0] == '/') {
		user_path = user_path.substring(1);
	}

	const paths: string[] = user_path.split('/')
	.filter((path: string) => path != '');

	let parent = null;
	if (paths.length > 0) {
		parent = '/';

		if (paths.length > 1) {
			parent = '/' + paths[paths.length - 2];
		}
	}

	const response = {
		parent: parent,
		files: getFilesInDirectory(dataPath(root_dir, user_path)),
	};

	return NextResponse.json(response);
}
