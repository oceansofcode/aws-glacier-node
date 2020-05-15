import fs, { promises as fsPromises, ReadStream } from 'fs';
import { Archive } from './archive';

export class LocalArchive extends Archive {
    private archiveReadStream: ReadStream;

    private uploadIndex: number;
    private buffers: Buffer[] = [];
    private fileSize = 0n;

    private get buffersRead(): number {
        return this.buffers.length;
    }

    constructor(private archivePath: string) {
        super();
    }

    public static async getLocalArchives(archiveRoot: string): Promise<Map<string, string>> {
        const archives: Map<string, string> = new Map();
        const dir = await fsPromises.opendir(archiveRoot);

        for await (const item of dir) {
            const itemPath = `${archiveRoot}/${item.name}`;
            if (item.isDirectory()) {
                const subDirArchives = await LocalArchive.getLocalArchives(itemPath);
                subDirArchives.forEach((value, key) => archives.set(key, value));
            } else {
                archives.set(item.name, archiveRoot);
            }
        }

        return archives;
    }

    public async readArchiveParts(): Promise<void> {
        let rangeBottom = 0, rangeTop = LocalArchive.chunkSize - 1;
        this.archiveReadStream = fs.createReadStream(this.archivePath, { highWaterMark: LocalArchive.chunkSize });
        for await (const chunk of this.archiveReadStream) {
            const body = chunk as Buffer;
            // eslint-disable-next-line no-undef
            const bodySize = BigInt(body.length);

            this.buffers.push(body);
            this.fileSize = this.fileSize + bodySize;

            if (this.buffersRead > 0) {
                rangeBottom = rangeTop + 1;
                rangeTop = rangeBottom + body.length - 1;
            }

            const range = `bytes ${rangeBottom}-${rangeTop}/*`;
        }
    }
}