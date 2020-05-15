import { config } from 'aws-sdk';
import archiveConfig from './archive-config.json';
import { Glacier } from 'aws-sdk';
import https from 'https';
import colors from 'colors';
import { GlacierArchive } from './modules/archive/glacier-archive';
import { LocalArchive } from './modules/archive/local-archive';
import { GlacierVault } from './modules/vault/vault';

const agent = new https.Agent({
    maxSockets: 25,
    keepAlive: true
});

config.update({
    region: archiveConfig.region,
    httpOptions: { agent }
});

config.getCredentials(async err => {
    if (!err && config.credentials) {
        console.log(`Access Key: ${colors.bgGreen(colors.black(config.credentials.accessKeyId))}\n`);

        const glacier = new Glacier();

        const localArchivesInfo = await LocalArchive.getLocalArchives(archiveConfig.archiveRoot);
        const archiveFileInfo = localArchivesInfo.find(localArchiveInfo => localArchiveInfo.archiveName.toLowerCase().includes('ds'));
        console.log(archiveFileInfo);

        const localArchive = new LocalArchive(archiveFileInfo);
        const glacierArchive = new GlacierArchive(glacier, { vaultName: localArchive.archiveFolder, description: localArchive.archiveName });
        const vault = new GlacierVault(glacier, localArchive.archiveFolder);

        console.log(await vault.listVaultUploads());

        await glacierArchive.initiateArchiveMultiUpload();
        await localArchive.readArchiveParts(glacierArchive.abortArchiveUpload.bind(glacierArchive), glacierArchive.uploadArchivePart.bind(glacierArchive));

    } else {
        console.error(err.stack);
    }
});

