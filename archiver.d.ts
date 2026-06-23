declare module 'archiver' {
  import type { Readable } from 'stream';

  export class ZipArchive extends Readable {
    constructor(options?: { zlib?: { level?: number } });
    directory(source: string, dest: string | false): this;
    finalize(): Promise<void>;
  }
}
