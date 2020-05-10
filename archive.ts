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

async function updateArchive(): Promise<void> {
    const archives = await readArchive();
    const glacier = new Glacier();

    
    console.log(archives);
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