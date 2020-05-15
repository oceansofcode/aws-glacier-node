import fs, { promises as fsPromises } from 'fs';
import * as GlacierConfig from '../glacier-config';
export interface LocalArchiveFileInfo {
    archivePath?: string;
    archiveFolder: string;
    archiveName: string;
}

export class LocalArchive {

    private buffers: Buffer[] = [];
    private readComplete = false;

    get buffersRead(): Buffer[] {
        return Array.from(this.buffers);
    }

    get finishedReading(): boolean {
        return this.readComplete;
    }

    get archiveName(): string {
        return this.localArchiveInfo.archiveName;
    }

    get archiveFolder(): string {
        return this.localArchiveInfo.archiveFolder;
    }

    get archivePath(): string | undefined {
        return this.localArchiveInfo.archivePath;
    }

    constructor(private localArchiveInfo: LocalArchiveFileInfo) { }

    public static async getLocalArchives(archiveRoot: string): Promise<LocalArchiveFileInfo[]> {
        let archives: LocalArchiveFileInfo[] = [];
        const dir = await fsPromises.opendir(archiveRoot);

        for await (const item of dir) {
            const itemPath = `${archiveRoot}/${item.name}`;
            if (item.isDirectory()) {
                const subDirArchives = await LocalArchive.getLocalArchives(itemPath);
                archives = archives.concat(subDirArchives);
            } else {
                archives.push(LocalArchive.createFileArchiveInfo(itemPath));
            }
        }

        return archives;
    }

    public static createFileArchiveInfo(archivePath: string): LocalArchiveFileInfo {
        const splitFoldersItems = archivePath.split('/');
        const archiveName = splitFoldersItems[splitFoldersItems.length - 1];
        const vaultName = splitFoldersItems[splitFoldersItems.length - 2].replace(/\s/, '_');

        const fullFile: LocalArchiveFileInfo = {
            archiveFolder: vaultName,
            archiveName,
            archivePath
        };

        return fullFile;
    }

    public async readArchiveParts(errorFunc: (error: unknown) => void, uploadArchivePart?: (localArchive: LocalArchive, part: Buffer, ranges: { rangeBottom: number; rangeTop: number }) => void): Promise<void> {
        let rangeBottom = 0, rangeTop = GlacierConfig.chunkSize - 1;
        try {
            const archiveReadStream = fs.createReadStream(this.archivePath, { highWaterMark: GlacierConfig.chunkSize });

            for await (const chunk of archiveReadStream) {
                const part = chunk as Buffer;

                this.buffers.push(part);

                if (this.buffersRead.length > 0) {
                    rangeBottom = rangeTop + 1;
                    rangeTop = rangeBottom + part.length - 1;
                }

                uploadArchivePart ? uploadArchivePart(this, part, { rangeBottom, rangeTop }) : undefined;
            }

            this.readComplete = true;
        } catch (error) {
            console.error('Error in reading file', error);
            errorFunc(error);
        } finally {
            console.log('Finished reading');
            console.log(Buffer.concat(this.buffers).byteLength);
        }

    }
}