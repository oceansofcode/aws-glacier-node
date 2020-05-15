import { Glacier } from 'aws-sdk';
import { accountId } from '../glacier-config';
import * as GlacierConfig from '../glacier-config';
import { LocalArchive } from './local-archive';
import { promises as fsPromises } from 'fs';
import colors from 'colors';

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

    public async initiateArchiveMultiUpload(): Promise<string> {
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
        } else {
            throw new Error('Could not get an upload ID');
        }

        return uploadId;
    }

    public uploadArchivePart(localArchive: LocalArchive, part: Buffer, ranges: { rangeBottom: number; rangeTop: number }): void {
        const range = `bytes ${ranges.rangeBottom}-${ranges.rangeTop}/*`;
        const partInfo: UploadPartParams = {
            accountId,
            uploadId: this.uploadId,
            vaultName: this.vaultName,
            body: part,
            checksum: this.glacier.computeChecksums(part).treeHash,
            range
        };

        this.glacier.uploadMultipartPart(partInfo, async (err, data) => {
            this.partsUploaded++;
            console.log(`Range: ${range}
            Parts Checksum: ${data.checksum}
            Parts Read: ${localArchive.buffersRead.length}
            Parts Uploaded: ${this.partsUploaded}
            All Parts Read: ${localArchive.finishedReading}`);
            if (err) {
                await this.abortArchiveUpload(this.uploadId);
                throw new Error(`AWS Error on upload: Name: ${err.name}, HTTP Code: ${err.statusCode}, Error Code: ${err.code}`);
            } else if (localArchive.finishedReading && localArchive.buffersRead.length === this.partsUploaded) {
                console.log(colors.green('All Parts Uploaded\n'));
                this.completeArchiveUpload(localArchive.buffersRead);
            }
        });
    }

    public completeArchiveUpload(fileBuffer: Buffer[]): void {
        console.log(colors.green('Attempting to complete upload\n'));

        const completeUploadInfo: CompleteUploadParams = {
            accountId,
            uploadId: this.uploadId,
            vaultName: this.vaultName,
            checksum: this.glacier.computeChecksums(Buffer.concat(fileBuffer)).treeHash,
            archiveSize: Buffer.concat(fileBuffer).byteLength.toString()
        };

        this.glacier.completeMultipartUpload(completeUploadInfo).promise().then(async res => {
            const output = `Archive Uploaded: ${this.description}\nArchive Id: ${res.archiveId}\nDate: ${new Date()}\n\n`;
            console.log(output);

            await fsPromises.appendFile(`../../../vaults/${this.vaultName}.txt`, output);
        }).catch(err => {
            console.log('Error occured while completing upload', err);
            this.abortArchiveUpload(this.uploadId);
        });
    }

    public async abortArchiveUpload(uploadId: string): Promise<void> {
        const abortConfig: AbortUploadParams = {
            accountId,
            uploadId,
            vaultName: this.vaultName
        };

        this.uploadId = '';
        this.glacier.abortMultipartUpload(abortConfig, res => console.log(`Aborted upload with ID: ${uploadId}`, res?.statusCode));
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