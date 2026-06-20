"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type FileTag = {
  id: string;
  path: string;
  tagId: string;
  tag: Tag;
};

export function normalizeTagPath(path: string) {
  return path.replace(/^\/+/, "").split("/").filter(Boolean).join("/");
}

export const TagSelector = ({
  path,
  tags,
  assignedTags,
  onChange,
}: {
  path: string;
  tags: Tag[];
  assignedTags: Tag[];
  onChange: () => void;
}) => {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [busy, setBusy] = useState(false);
  const assignedIds = new Set(assignedTags.map((tag) => tag.id));

  const refreshTags = () => {
    onChange();
    router.refresh();
  };

  const toggleTag = async (tag: Tag) => {
    const selected = assignedIds.has(tag.id);

    await fetch("/api/file-tags", {
      method: selected ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, tagId: tag.id }),
    });

    refreshTags();
  };

  const createTag = async () => {
    const tagName = name.trim();
    if (!tagName) {
      return;
    }

    setBusy(true);

    const tagResponse = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tagName, color }),
    });

    const tag = await tagResponse.json();

    if (tag?.id) {
      await fetch("/api/file-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, tagId: tag.id }),
      });
    }

    setBusy(false);
    setCreating(false);
    setName("");
    refreshTags();
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {assignedTags.map((tag) => (
        <span
          key={tag.id}
          className="rounded-full border px-2 py-0.5 text-xs font-medium"
          style={{ borderColor: tag.color, color: tag.color }}
        >
          {tag.name}
        </span>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-6 w-6 rounded-full cursor-pointer" aria-label="Add tag">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          {tags.length === 0 ? (
            <DropdownMenuItem disabled>No tags yet</DropdownMenuItem>
          ) : (
            tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={assignedIds.has(tag.id)}
                onCheckedChange={() => toggleTag(tag)}
              >
                <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </DropdownMenuCheckboxItem>
            ))
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            Create new tag...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create tag</DialogTitle>
            <DialogDescription>Choose a name and color for this tag.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor={`tag-name-${path}`}>Name</label>
              <Input
                id={`tag-name-${path}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Important work"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor={`tag-color-${path}`}>Color</label>
              <div className="flex items-center gap-3">
                <Input
                  id={`tag-color-${path}`}
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-10 w-16 p-1"
                />
                <span className="rounded-full border px-2 py-1 text-xs font-medium" style={{ borderColor: color, color }}>
                  {name || "Preview"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={createTag} disabled={busy || !name.trim()}>
              {busy ? "Creating..." : "Create tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
