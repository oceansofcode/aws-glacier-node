import { Glacier } from 'aws-sdk';
import { Archive } from './archive';
import { accountId } from '../glacier-config';

export type MultiUploadInitParams = Required<Glacier.InitiateMultipartUploadInput>;
export type UploadPartParams = Required<Glacier.UploadMultipartPartInput>;
export type CompleteUploadParams = Required<Glacier.CompleteMultipartUploadInput>;
export type AbortUploadParams = Required<Glacier.AbortMultipartUploadInput>;
export type DeleteGlacierArchiveParams = Required<Glacier.DeleteArchiveInput>;

export class GlacierArchive extends Archive {

    private archiveChecksum: string;
    private archiveSize: string;
    private uploadId: string;

    constructor(private glacier: Glacier, private vaultName: string, private archiveDescription: string, private archiveId?: string) {
        super();
    }

    public async initiateArchiveMultiUpload(): Promise<void> {
        const initParams: MultiUploadInitParams = {
            accountId,
            archiveDescription: this.archiveDescription,
            partSize: Archive.chunkSize.toString(),
            vaultName: this.vaultName,
        };

        const uploadInitResponse = await this.glacier.initiateMultipartUpload(initParams).promise();
        uploadInitResponse.uploadId ? this.uploadId = uploadInitResponse.uploadId : null;
    }

    public uploadArchivePart(part: Buffer, range: string): void {
        const partInfo: UploadPartParams = {
            accountId,
            uploadId: this.uploadId,
            vaultName: this.vaultName,
            body: part,
            checksum: this.glacier.computeChecksums(part).treeHash,
            range
        };

        this.glacier.uploadMultipartPart(partInfo);
    }

    public completeArchiveUpload(): void {
        const completeUploadInfo: CompleteUploadParams = {
            accountId,
            uploadId: this.uploadId,
            vaultName: this.vaultName,
            checksum: this.archiveChecksum,
            archiveSize: this.archiveSize
        };

        this.glacier.completeMultipartUpload(completeUploadInfo);
    }

    public abortArchiveUpload(): void {
        const abortConfig: AbortUploadParams = {
            accountId,
            uploadId: this.uploadId,
            vaultName: this.vaultName
        };

        this.uploadId = '';
        this.glacier.abortMultipartUpload(abortConfig, () => console.log(`Aborted upload with ID: ${this.uploadId}`));
    }

    public deleteArchive(): void {
        if (this.archiveId) {
            const deleteParams: DeleteGlacierArchiveParams = {
                accountId,
                archiveId: this.archiveId,
                vaultName: this.vaultName
            };

            this.glacier.deleteArchive(deleteParams);
        } else {
            throw new Error('Attempting to delete an archive that has no archiveId');
        }
    }
}