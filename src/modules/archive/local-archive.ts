import fs, { promises as fsPromises, ReadStream } from 'fs';
import * as GlacierConfig from '../glacier-config';

declare function BigInt(number: number): bigint;

export class LocalArchive {
    private archiveReadStream: ReadStream;

    private buffers: Buffer[] = [];
    private fileSize = 0n;

    private get buffersRead(): number {
        return this.buffers.length;
    }

    constructor(private archivePath: string) {
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

    public async readArchiveParts(uploadArchivePart: (part: Buffer, ranges: { rangeBottom: number; rangeTop: number }) => void, errorFunc: () => void): Promise<void> {
        let rangeBottom = 0, rangeTop = GlacierConfig.chunkSize - 1;
        try {
            this.archiveReadStream = fs.createReadStream(this.archivePath, { highWaterMark: GlacierConfig.chunkSize });

            for await (const chunk of this.archiveReadStream) {
                const body = chunk as Buffer;
                const bodySize = BigInt(body.length);

                this.buffers.push(body);
                this.fileSize = this.fileSize + bodySize;

                if (this.buffersRead > 0) {
                    rangeBottom = rangeTop + 1;
                    rangeTop = rangeBottom + body.length - 1;
                }

                uploadArchivePart(body, { rangeBottom, rangeTop });
            }

            console.log('Finished reading');
            console.log(this.fileSize);
        } catch (error) {
            console.error('Error in reading file', error);
            errorFunc();
        }

    }
}