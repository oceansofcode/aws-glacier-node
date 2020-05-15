import { Glacier } from 'aws-sdk';
import fs from 'fs';

const glacier = new Glacier();

export async function updateArchive(): Promise<void> {

    const oneByte = 2 ** 10;
    const chonkSize = oneByte ** 2;

    const kotor2 = fs.createReadStream('E:/Archive/Kotor/Kotor2.rar', { highWaterMark: chonkSize });
    kotor2.on('open', () => console.log('Kotor2 Opened'));

    const initiateMultiPartParams: Glacier.InitiateMultipartUploadInput = {
        accountId: '-',
        vaultName: 'Kotor2',
        partSize: chonkSize.toString()
    };

    const uploadId = (await glacier.initiateMultipartUpload(initiateMultiPartParams).promise()).uploadId;

    let rangeBottom = 0, rangeTop = chonkSize - 1, chunkIndex = 0, uploadIndex = 0;
    let fullFileSize = 0n;
    const bufferList: Buffer[] = [];
    for await (const chunk of kotor2) {
        const body = chunk as Buffer;
        // eslint-disable-next-line no-undef
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
        };

        glacier.uploadMultipartPart(multiPartParams).promise().then(() => console.log(uploadIndex++));

        console.log(chunkIndex++);
    }

    // Replace with event emitter
    const uploadFinished = new Promise(res => {
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
    };

    uploadFinished.then(async () => {
        console.log(`Checksum: ${fullChecksum}`);
        await glacier.completeMultipartUpload(completeMultiPartInput).promise().then(res => console.log(`Response Checksum: ${res.checksum}`))
            .catch(err => {
                console.log(err);
                glacier.abortMultipartUpload({ vaultName: 'Kotor2', uploadId, accountId: '-' }).promise().then(() => console.log('Aborted upload'));
            });
    });
}