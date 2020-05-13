import { Glacier } from 'aws-sdk';
import { Archive } from './archive';
import { accountId } from './glacier-config';

export type GlacierInitParams = Required<Glacier.InitiateMultipartUploadInput>;
export type GlacierUploadPartParams = Required<Glacier.UploadMultipartPartInput>;
export type GlacierCompleteUploadParams = Required<Glacier.CompleteMultipartUploadInput>;
export type GlacierAbortUploadParams = Required<Glacier.AbortMultipartUploadInput>;

export class GlacierArchive extends Archive {

    private archiveChecksum: string;
    private uploadId: string;

    constructor(private glacier: Glacier, private vaultName: string, private archiveId?: string) {
        super();
    }

    public async initiateUpload(): Promise<void> {
        const initParams: GlacierInitParams = {
            accountId,
            archiveDescription: 'fix this',
            partSize: Archive.chunkSize.toString(),
            vaultName: this.vaultName,
        };

        this.uploadId = (await this.glacier.initiateMultipartUpload(initParams).promise()).uploadId;
    }

    public uploadArchivePart(part: Buffer, range: string): void {
        const partInfo: GlacierUploadPartParams = {
            accountId,
            uploadId: this.uploadId,
            vaultName: this.vaultName,
            body: part,
            checksum: this.glacier.computeChecksums(part).treeHash,
            range
        };

        this.glacier.uploadMultipartPart(partInfo, () => console.log('do something'));
    }

    public completeArchiveUpload(): void {
        const completeUploadInfo: GlacierCompleteUploadParams = {
            accountId,
            uploadId: this.uploadId,
            vaultName: this.vaultName,
            checksum: this.archiveChecksum,
            archiveSize: null
        };

        // get archiveId from the return value
    }

    public abortArchiveUpload(): void {
        const abortConfig: GlacierAbortUploadParams = {
            accountId,
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