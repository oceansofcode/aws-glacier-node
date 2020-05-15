import { Glacier } from 'aws-sdk';
import { accountId } from '../glacier-config';
import * as GlacierConfig from '../glacier-config';
import { LocalArchive } from './local-archive';
import { promises as fsPromises } from 'fs';

export type MultiUploadInitParams = Required<Glacier.InitiateMultipartUploadInput>;
export type UploadPartParams = Required<Glacier.UploadMultipartPartInput>;
export type CompleteUploadParams = Required<Glacier.CompleteMultipartUploadInput>;
export type AbortUploadParams = Required<Glacier.AbortMultipartUploadInput>;
export type DeleteGlacierArchiveParams = Required<Glacier.DeleteArchiveInput>;

export interface GlacierArchiveInfo {
    vaultName: string;
    description: string;
    archiveId?: string;
}

export const partUploaded = Symbol('Part Uploaded');

export class GlacierArchive {

    private uploadId: string;
    private partsUploaded: number;

    get vaultName(): string {
        return this.archiveInfo.vaultName;
    }

    get description(): string {
        return this.archiveInfo.description;
    }

    get archiveId(): string {
        return this.archiveInfo.archiveId;
    }

    set archiveId(archiveId: string) {
        this.archiveInfo.archiveId = archiveId;
    }

    constructor(private glacier: Glacier, private archiveInfo: GlacierArchiveInfo) {
    }

    public async initiateArchiveMultiUpload(): Promise<void> {
        const initParams: MultiUploadInitParams = {
            accountId,
            archiveDescription: this.archiveInfo.description,
            partSize: GlacierConfig.chunkSize.toString(),
            vaultName: this.vaultName,
        };

        const uploadId = (await this.glacier.initiateMultipartUpload(initParams).promise()).uploadId;

        if (uploadId) {
            this.partsUploaded = 0;
            this.uploadId = uploadId;
            console.log(uploadId);
        }
    }

    public uploadArchivePart(localArchive: LocalArchive, part: Buffer, ranges: { rangeBottom: number; rangeTop: number }): void {
        const partInfo: UploadPartParams = {
            accountId,
            uploadId: this.uploadId,
            vaultName: this.vaultName,
            body: part,
            checksum: this.glacier.computeChecksums(part).treeHash,
            range: `bytes ${ranges.rangeBottom}-${ranges.rangeTop}/*`
        };

        this.glacier.uploadMultipartPart(partInfo, (err, data) => {
            if (err) {
                throw new Error(`AWS Error on upload: Name: ${err.name}, HTTP Code: ${err.statusCode}, Error Code: ${err.code}`);
            } else if (localArchive.finishedReading && localArchive.buffersRead.length === ++this.partsUploaded) {
                this.completeArchiveUpload(localArchive.buffersRead, Buffer.concat(localArchive.buffersRead).byteLength.toString());
            }
        });
    }

    public completeArchiveUpload(fileBuffer: Buffer[], fileSize: string): void {
        const completeUploadInfo: CompleteUploadParams = {
            accountId,
            uploadId: this.uploadId,
            vaultName: this.vaultName,
            checksum: this.glacier.computeChecksums(Buffer.concat(fileBuffer)).treeHash,
            archiveSize: fileSize
        };

        this.glacier.completeMultipartUpload(completeUploadInfo).promise().then(async res => {
            const output = `Archive Uploaded: ${this.description}
            Archive Id: ${res.archiveId}
            Date: ${new Date()}\n`;

            console.log(output);

            const vaultFile = await fsPromises.open(`/vaults/${this.vaultName}`, 'w');
            await vaultFile.appendFile(output);
            await vaultFile.close();
        });
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