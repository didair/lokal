"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlertIcon, FileIcon, FolderIcon, SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FilePreviewDialog } from "./filepreviewdialog";

type SearchResult = {
  name: string;
  path: string;
  parentPath: string;
  type: 'file' | 'dir' | 'other';
  size: string;
  date: string;
};

type SearchResponse = {
  results: SearchResult[];
  truncated: boolean;
  cached?: boolean;
  minQueryLength?: number;
  error?: string;
};

function getCurrentSearchPath() {
  if (typeof window === 'undefined') return '/';

  if (window.location.pathname === '/files') {
    const url = new URL(window.location.href);
    return url.searchParams.get('path') || localStorage.getItem('currentFilePath') || '/';
  }

  return localStorage.getItem('currentFilePath') || '/';
}

function parentLabel(result: SearchResult) {
  if (result.parentPath === '/') return 'Files';
  return result.parentPath;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

export function FileSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const manuallyClosedRef = useRef(false);
  const closedQueryRef = useRef('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState('');
  const [previewFile, setPreviewFile] = useState<SearchResult | null>(null);

  const trimmedQuery = query.trim();
  const showHelp = trimmedQuery.length > 0 && trimmedQuery.length < 2;
  const activeResult = useMemo(() => results[activeIndex] ?? results[0] ?? null, [activeIndex, results]);

  const closeResults = () => {
    manuallyClosedRef.current = true;
    closedQueryRef.current = query;
    setOpen(false);
  };

  const focusSearch = () => {
    manuallyClosedRef.current = false;
    closedQueryRef.current = '';
    inputRef.current?.focus();
    window.requestAnimationFrame(() => inputRef.current?.select());
    setOpen(true);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        manuallyClosedRef.current = true;
        setOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && containerRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        event.stopPropagation();
        closeResults();
        return;
      }

      const shortcutPressed = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const slashPressed = event.key === '/' && !isEditableTarget(event.target);

      if (!shortcutPressed && !slashPressed) {
        return;
      }

      event.preventDefault();
      focusSearch();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [query]);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError('');
      setTruncated(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        q: trimmedQuery,
        path: getCurrentSearchPath(),
        limit: '40',
      });

      fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          const body = await response.json() as SearchResponse;
          if (!response.ok) {
            throw new Error(body.error || 'Could not search files');
          }

          setResults(body.results ?? []);
          setActiveIndex(0);
          setTruncated(Boolean(body.truncated));
          if (!manuallyClosedRef.current) {
            setOpen(true);
          }
        })
        .catch((searchError) => {
          if (searchError instanceof DOMException && searchError.name === 'AbortError') {
            return;
          }

          setResults([]);
          setError(searchError instanceof Error ? searchError.message : 'Could not search files');
          if (!manuallyClosedRef.current) {
            setOpen(true);
          }
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery]);

  const selectResult = (result: SearchResult | null) => {
    if (!result) return;

    setOpen(false);

    if (result.type === 'dir') {
      localStorage.setItem('currentFilePath', result.path);
      router.push(`/files?path=${encodeURIComponent(result.path)}`);
      return;
    }

    if (result.type === 'file') {
      setPreviewFile(result);
      return;
    }

    router.push(`/files?path=${encodeURIComponent(result.parentPath)}`);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    selectResult(activeResult);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setError('');
    setTruncated(false);
    manuallyClosedRef.current = true;
    closedQueryRef.current = '';
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation?.();
      closeResults();
    }
  };

  return (
    <>
      <form
        onSubmit={submitSearch}
        onBlurCapture={() => {
          window.setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
              closeResults();
            }
          }, 0);
        }}
        onKeyDownCapture={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closeResults();
          }
        }}
        ref={containerRef}
        className="relative max-w-xl"
      >
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);

            if (manuallyClosedRef.current && nextQuery === closedQueryRef.current) {
              return;
            }

            manuallyClosedRef.current = false;
            closedQueryRef.current = '';
            setOpen(true);
          }}
          onFocus={() => {
            manuallyClosedRef.current = false;
            closedQueryRef.current = '';
            setOpen(query.trim().length > 0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search files..."
          className="w-full appearance-none bg-white/75 pl-8 pr-10 shadow-sm [&::-webkit-search-cancel-button]:appearance-none"
          aria-label="Search files"
          aria-expanded={open}
        />

        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Clear search"
          >
            <XIcon className="h-4 w-4" />
          </button>
        ) : null}


        {open && (trimmedQuery.length > 0 || loading || error) ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_70px_-35px_rgba(24,24,27,0.45)]">
            <div className="border-b border-zinc-100 px-3 py-2 text-xs text-muted-foreground">
              {loading ? 'Searching files...' : showHelp ? 'Type at least 2 characters to search.' : `${results.length} result${results.length === 1 ? '' : 's'}`}
              {truncated ? <span> · Showing the first matches</span> : null}
            </div>

            {error ? (
              <div className="px-3 py-4 text-sm text-red-600">{error}</div>
            ) : null}

            {!error && !loading && !showHelp && results.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">No matching files or folders found.</div>
            ) : null}

            {!error && results.length > 0 ? (
              <div className="max-h-[60vh] overflow-y-auto p-1">
                {results.map((result, index) => (
                  <button
                    key={result.path}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      selectResult(result);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      index === activeIndex ? "bg-rose-50 text-zinc-950" : "hover:bg-zinc-50",
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200/80">
                      {result.type === 'dir' ? <FolderIcon className="h-4 w-4" /> : null}
                      {result.type === 'file' ? <FileIcon className="h-4 w-4" /> : null}
                      {result.type === 'other' ? <CircleAlertIcon className="h-4 w-4" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{result.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{parentLabel(result)}</span>
                    </span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                      {result.type === 'dir' ? 'Folder' : result.size}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </form>

      <FilePreviewDialog
        open={previewFile != null}
        onOpenChange={(nextOpen) => !nextOpen && setPreviewFile(null)}
        file={previewFile ? { name: previewFile.name, path: previewFile.path } : null}
        showTags={false}
      />
    </>
  );
}
