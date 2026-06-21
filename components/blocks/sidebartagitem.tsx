"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TagIcon, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type SidebarTag = {
  id: string;
  name: string;
  color: string;
};

export function SidebarTagItem({ tag }: { tag: SidebarTag }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [removing, setRemoving] = useState(false);
  const selected = searchParams.get('tag') === tag.id;

  const removeTag = async () => {
    if (removing) return;

    setRemoving(true);
    await fetch('/api/tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tag.id }),
    });

    if (selected) {
      router.push('/files');
    }

    router.refresh();
    setRemoving(false);
  };

  return (
    <div className="group flex items-center gap-1 rounded-xl">
      <Link
        href={`/files?tag=${tag.id}`}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition-all duration-200 active:scale-[0.99]",
          selected
            ? "bg-rose-500 text-white shadow-sm shadow-rose-500/25 hover:bg-rose-600 hover:text-white"
            : "hover:bg-zinc-100/80 hover:text-zinc-950",
        )}
        prefetch={false}
      >
        <TagIcon className="h-4 w-4 shrink-0" style={{ color: selected ? undefined : tag.color }} />
        <span className="truncate">{tag.name}</span>
      </Link>

      <button
        type="button"
        onClick={removeTag}
        disabled={removing}
        className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-500 opacity-0 transition hover:bg-zinc-100 hover:text-red-600 hover:opacity-100 focus:opacity-100 disabled:pointer-events-none disabled:opacity-30 group-hover:opacity-50"
        aria-label={`Delete ${tag.name} tag`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
