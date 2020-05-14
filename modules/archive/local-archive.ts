import fs, { ReadStream } from 'fs';
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
        this.archiveReadStream = fs.createReadStream(archivePath, { highWaterMark: LocalArchive.chunkSize });
    }

    public static async getLocalArchivePaths(archiveRoot: string): Promise<string[]> {
        const archivePaths = [];
        const dir = await fs.promises.opendir(archiveRoot);

        for await (const item of dir) {
            const itemPath = `${archiveRoot}/${item.name}`;
            if (item.isDirectory()) {
                const subDirPaths = await LocalArchive.getLocalArchivePaths(itemPath);
                subDirPaths.forEach(subDirPath => archivePaths.push(subDirPath));
            } else {
                archivePaths.push(itemPath);
            }
        }

        return archivePaths;
    }

    public async readArchiveParts(): Promise<void> {
        let rangeBottom = 0, rangeTop = LocalArchive.chunkSize - 1;
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