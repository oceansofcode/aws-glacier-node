import { promisify } from 'util';
import fs from 'fs';
import archiveConfig from '../archive-config.json';
import { getLocalArchivePaths } from './util';

export async function readLocalArchive(): Promise<string[]> {
    const archiveRoot = archiveConfig.archiveRoot;
    const pExists = promisify(fs.exists);

    const archiveExists = await pExists(archiveRoot);

    if (archiveExists) {
        return await getLocalArchivePaths(archiveRoot);
    } else {
        throw 'Archive does not exist';
    }
}