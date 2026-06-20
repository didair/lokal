"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const SidebarItem = ({ href, children }: { href: string, children: any }) => {
	const pathname = usePathname();

	return (
		<Link
			href={href}
			className={cn(
				"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition-all duration-200 active:scale-[0.99]",
				{
					"hover:bg-zinc-100/80 hover:text-zinc-950": pathname != href,
					"bg-rose-500 shadow-sm shadow-rose-500/25 hover:bg-rose-600 text-white hover:text-white": pathname == href,
				},
			)}
			prefetch={false}
		>
			{children}
		</Link>
	);
};
