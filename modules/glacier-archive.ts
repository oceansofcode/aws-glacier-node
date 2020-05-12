import { Glacier } from 'aws-sdk';
import { Archive } from './archive';

export type glacierInit = Required<Glacier.InitiateMultipartUploadInput>;
export type glacierUploadPart = Required<Glacier.UploadMultipartPartInput>;
export type glacierCompleteUpload = Glacier.CompleteMultipartUploadInput;
export type glacierAbortUpload = Required<Glacier.AbortMultipartUploadInput>;

export class GlacierArchive extends Archive {

    private archiveChecksum: string;
    private uploadId: string;
    private vaultName: string;

    constructor(private glacier: Glacier) {
        super();
    }

    public static listArchives(glacier: Glacier): Promise<string[]> {
        return null;
    }

    public async initiateUpload(): void {
        const initParams: glacierInit = {
            accountId: '-',
            archiveDescription: 'fix this',
            partSize: Archive.chunkSize.toString(),
            vaultName: this.vaultName,
        };

        this.uploadId = (await this.glacier.initiateMultipartUpload(initParams).promise()).uploadId;
    }

    public uploadArchivePart(part: Buffer, range: string): void {
        const partInfo: glacierUploadPart = {
            accountId: '-',
            uploadId: this.uploadId,
            vaultName: this.vaultName,
            body: part,
            checksum: this.glacier.computeChecksums(part).treeHash,
            range
        };

        this.glacier.uploadMultipartPart(partInfo, () => console.log('do something'));
    }

    public

    public abortGlacierUpload(): void {
        const abortConfig: glacierAbortUpload = {
            accountId: '-',
            uploadId: this.uploadId,
            vaultName: this.vaultName
        };

        this.uploadId = null;
        this.glacier.abortMultipartUpload(abortConfig, () => console.log(`Aborted upload with ID: ${this.uploadId}`));
    }

    public deleteArchive(): void {
        return null;
    }
}