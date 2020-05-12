import fs, { ReadStream } from 'fs';

export class Archive {
    static readonly oneByte = 2 ** 10;
    static readonly chunkSize = Archive.oneByte ** 2;

    private static readonly completedEvent = 'completedEvent';

    private uploadId: string;
    private fileReadStream: ReadStream;

    private chunkIndex: number;
    private uploadIndex: number;
    private buffers: Buffer[] = [];
    private fileSize = 0n;

    constructor(private archivePath: string) {
        this.fileReadStream = fs.createReadStream(archivePath);
    }

    private get uploadComplete(): boolean {
        return this.chunkIndex === this.uploadIndex && (this.chunkIndex !== 0 && this.uploadIndex !== 0);
    }

    public async readArchive(): Promise<void> {
        let rangeBottom = 0, rangeTop = Archive.chunkSize - 1;
        for await (const chunk of this.fileReadStream) {
            const body = chunk as Buffer;
            // eslint-disable-next-line no-undef
            const bodySize = BigInt(body.length);
            //const checksum = glacier.computeChecksums(body).treeHash;
    
            this.buffers.push(body);
            this.fileSize = this.fileSize + bodySize;
    
            if (this.chunkIndex > 0) {
                rangeBottom = rangeTop + 1;
                rangeTop = rangeBottom + body.length - 1;
            }
    
            const range = `bytes ${rangeBottom}-${rangeTop}/*`;
        }
    }
}