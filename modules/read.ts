import { promisify } from 'util';
import fs from 'fs';
import archiveConfig from '../archive-config.json';
import { LocalArchive } from './archive/local-archive';

export async function readLocalArchive(): Promise<string[]> {
    const archiveRoot = archiveConfig.archiveRoot;
    const pExists = promisify(fs.exists);

    const archiveExists = await pExists(archiveRoot);

    if (archiveExists) {
        return await LocalArchive.getLocalArchivePaths(archiveRoot);
    } else {
        throw 'Archive does not exist';
    }
}