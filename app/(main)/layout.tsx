import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "../globals.css";

import { Header } from "@/components/blocks/header"
import { Sidebar } from "@/components/blocks/sidebar"

const opensans = Open_Sans({ subsets: ["latin"] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
	title: "Lokal files",
	description: "Serve your files in style",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="h-full min-h-full">
			<body className={opensans.className + ' h-full min-h-full'}>
				<div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
					<div className="hidden border-r bg-muted/40 md:block">
						<Sidebar />
					</div>

					<div className="flex flex-col">
						<Header />

						<main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
							{children}
						</main>
					</div>
				</div>
			</body>
		</html>
	);
}
