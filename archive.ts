import AWS, { Glacier } from 'aws-sdk';
import fs, { promises as fsPromises } from 'fs';
import { promisify } from 'util';
import archiveConfig from './archive-config.json';

AWS.config.update({ region: archiveConfig.region });

AWS.config.getCredentials(err => {
    console.log(`Region: ${AWS.config.region}`);
    err ? console.log(err.stack) : console.log(`Access Key: ${AWS.config.credentials.accessKeyId}`);
    err ? null : updateArchive().then(() => console.log('Finished Updating Archive')).catch(err => console.log('Error updating archive', err));
});

async function readArchive(): Promise<string[]> {
    const archiveRoot = archiveConfig.archiveRoot;
    const pExists = promisify(fs.exists);

    const archiveExists = await pExists(archiveRoot);

    if (archiveExists) {
        return await getAllArchivePaths(archiveRoot);
    } else {
        throw 'Archive does not exist';
    }
}

async function getAllArchivePaths(archiveRoot: string): Promise<string[]> {
    const archivePaths = [];
    const dir = await fs.promises.opendir(archiveRoot);

    for await (let item of dir) {
        const itemPath = `${archiveRoot}/${item.name}`
        if (item.isDirectory()) {
            const subDirPaths = await getAllArchivePaths(itemPath);
            subDirPaths.forEach(subDirPath => archivePaths.push(subDirPath));
        } else {
            archivePaths.push(itemPath);
        }
    }

    return archivePaths;
}

async function updateArchive(): Promise<void> {
    //const archives = await readArchive();
    const glacier = new Glacier();
    const oneByte = 2 ** 10;
    const chonkSize = oneByte ** 2;

    const kotor2 = fs.createReadStream('E:/Archive/Kotor/Kotor2.rar', { highWaterMark: chonkSize });
    kotor2.on('open', () => console.log('Kotor2 Opened'));

    const initiateMultiPartParams: Glacier.InitiateMultipartUploadInput = {
        accountId: '-',
        vaultName: 'Kotor2',
        partSize: chonkSize.toString()
    }

    let uploadId = (await glacier.initiateMultipartUpload(initiateMultiPartParams).promise()).uploadId;

    let rangeBottom = 0, rangeTop = chonkSize - 1, chunkIndex = 0, uploadIndex = 0;
    let fullFileSize: bigint = 0n;
    let bufferList: Buffer[] = [];
    for await (let chunk of kotor2) {
        const body = chunk as Buffer;
        const bodySize = BigInt(body.length);
        const checksum = glacier.computeChecksums(body).treeHash;

        bufferList.push(body);
        fullFileSize = fullFileSize + bodySize;

        if (chunkIndex > 0) {
            rangeBottom = rangeTop + 1;
            rangeTop = rangeBottom + body.length - 1;
        }

        const range = `bytes ${rangeBottom}-${rangeTop}/*`;
        const multiPartParams: Glacier.UploadMultipartPartInput = {
            uploadId: uploadId,
            vaultName: 'Kotor2',
            accountId: '-',
            body,
            checksum,
            range
        }

        glacier.uploadMultipartPart(multiPartParams).promise().then(() => console.log(uploadIndex++));

        console.log(chunkIndex++);
    }

    // Replace with event emitter
    let uploadFinished = new Promise((res, rej) => {
        const checkUploadFinished = setInterval(() => {
            if (uploadIndex === chunkIndex) {
                res();
                clearInterval(checkUploadFinished);
            }
        }, 500);
    });

    const fullChecksum = glacier.computeChecksums(Buffer.concat(bufferList)).treeHash;
    const completeMultiPartInput: Glacier.CompleteMultipartUploadInput = {
        accountId: '-',
        uploadId,
        vaultName: 'Kotor2',
        archiveSize: fullFileSize.toString(),
        checksum: fullChecksum
    }

    uploadFinished.then(async () => {
        console.log(`Checksum: ${fullChecksum}`);
        await glacier.completeMultipartUpload(completeMultiPartInput).promise().then(res => console.log(`Response Checksum: ${res.checksum}`))
            .catch(err => {
                console.log(err);
                glacier.abortMultipartUpload({ vaultName: 'Kotor2', uploadId, accountId: '-' }).promise().then(() => console.log('Aborted upload'));
            });
    });

}