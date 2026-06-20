"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogClose,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { File } from "@/lib/file-utils";

export const DirInput = ({ defaultValue }: { defaultValue?: string }) => {
	const [selectedDir, setSelectedDir] = useState<string>(defaultValue ?? '');
	const [options, setOptions] = useState<File[]>([]);

	useEffect(() => {
		fetch('/api/rootdirs', {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
		})
		.then(async (response) => {
			const body: File[] = await response.json();
			setOptions(body);
		});
	}, []);

	return (
		<>
			<Dialog>
				<div className="flex items-center space-x-2">
					<div className="grid flex-1 gap-2">
						<Label className="sr-only">
							Selected directory
						</Label>

						<Input
							id="link"
							name="rootDir"
							value={selectedDir + '/'}
							readOnly
						/>
					</div>

					<DialogTrigger asChild>
						<Button size="sm" className="px-3">
							<FolderUp className="h-4 w-4" />
						</Button>
					</DialogTrigger>
				</div>

				<DialogContent>
					<DialogHeader>
						<DialogTitle>Select user root directory</DialogTitle>
					</DialogHeader>

					<div className="flex flex-col gap-2">
						{options.map((dir) => {
							return (
								<div
									key={dir.name}
									className={cn("py-2 px-4 hover:bg-muted cursor-pointer rounded-lg", {
										"bg-rose-500 hover:bg-rose-600 text-gray-50": dir.name == selectedDir,
									})}
									onClick={() => setSelectedDir(dir.name)}
								>
									{dir.name}
								</div>
							);
						})}
					</div>

					<DialogFooter className="sm:justify-start">
						<DialogClose asChild>
							<Button type="button">
								Select
							</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
