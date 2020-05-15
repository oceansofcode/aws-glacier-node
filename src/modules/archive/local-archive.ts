import fs, { promises as fsPromises, ReadStream } from 'fs';
import * as GlacierConfig from '../glacier-config';

declare function BigInt(number: number): bigint;

export class LocalArchive {
    private archiveReadStream: ReadStream;

    private buffers: Buffer[] = [];
    private fileSize = 0n;
    private readComplete = false;

    get buffersRead(): Buffer[] {
        return Array.from(this.buffers);
    }

    get finishedReading(): boolean {
        return this.readComplete;
    }

    get archivePath(): string {
        return `${this.archiveFolder}/${this.archiveName}`;
    }

    constructor(private archiveName: string, private archiveFolder: string) {
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

    public async readArchiveParts(errorFunc: () => void, uploadArchivePart?: (localArchive: LocalArchive, part: Buffer, ranges: { rangeBottom: number; rangeTop: number }) => void): Promise<void> {
        let rangeBottom = 0, rangeTop = GlacierConfig.chunkSize - 1;
        try {
            this.archiveReadStream = fs.createReadStream(this.archivePath, { highWaterMark: GlacierConfig.chunkSize });

            for await (const chunk of this.archiveReadStream) {
                const part = chunk as Buffer;
                const partSize = BigInt(part.length);

                this.buffers.push(part);
                this.fileSize = this.fileSize + partSize;

                if (this.buffersRead.length > 0) {
                    rangeBottom = rangeTop + 1;
                    rangeTop = rangeBottom + part.length - 1;
                }

                uploadArchivePart ? uploadArchivePart(this, part, { rangeBottom, rangeTop }) : undefined;
            }

            console.log('Finished reading');
            this.readComplete = true;

            console.log(this.fileSize);
            console.log(Buffer.concat(this.buffers).byteLength);
        } catch (error) {
            console.error('Error in reading file', error);
            errorFunc();
        }

    }
}