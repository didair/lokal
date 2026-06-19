import { getCurrentUser } from "@/lib/actions";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { DATA_DIR } from "@/lib/data-dir";
import fs from "fs";

const UPLOAD_DIR = DATA_DIR;

export const POST = async (request: NextRequest) => {
	const formData = await request.formData();
	const body = Object.fromEntries(formData);
	const file = (body.file as Blob) || null;
	const user = await getCurrentUser();
	let target = path.join(UPLOAD_DIR, user.rootDir);

	if (request.nextUrl.searchParams.get('path') != null) {
		target = path.join(target, request.nextUrl.searchParams.get('path') ?? '');
	}

	if (file) {
		const buffer = Buffer.from(await file.arrayBuffer());
		if (!fs.existsSync(target)) {
			fs.mkdirSync(target);
		}

		fs.writeFileSync(
			path.resolve(target, (body.file as File).name),
			buffer
		);
	} else {
		return NextResponse.json({
			success: false,
		});
	}

	return NextResponse.json({
		success: true,
		name: (body.file as File).name,
	});
};