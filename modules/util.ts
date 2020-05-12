import fs from 'fs';

export async function getLocalArchivePaths(archiveRoot: string): Promise<string[]> {
    const archivePaths = [];
    const dir = await fs.promises.opendir(archiveRoot);

    for await (const item of dir) {
        const itemPath = `${archiveRoot}/${item.name}`;
        if (item.isDirectory()) {
            const subDirPaths = await getLocalArchivePaths(itemPath);
            subDirPaths.forEach(subDirPath => archivePaths.push(subDirPath));
        } else {
            archivePaths.push(itemPath);
        }
    }

    return archivePaths;
}