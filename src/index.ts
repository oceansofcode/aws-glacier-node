import { config } from 'aws-sdk';
import archiveConfig from './archive-config.json';
import { Glacier } from 'aws-sdk';
import https from 'https';
import colors from 'colors';
import { GlacierArchive } from './modules/archive/glacier-archive';
import { LocalArchive } from './modules/archive/local-archive';
import { GlacierVault } from './modules/vault/vault';

const agent = new https.Agent({
    maxSockets: Infinity,
    keepAlive: true
});

config.update({
    region: archiveConfig.region,
    httpOptions: { agent }
});

config.logger = console;

config.getCredentials(async err => {
    if (!err && config.credentials) {
        console.log(`Access Key: ${colors.bgGreen(colors.black(config.credentials.accessKeyId))}\n`);

        const glacier = new Glacier();

        const localArchivesInfo = await LocalArchive.getLocalArchives(archiveConfig.archiveRoot);
        const luigiTest = localArchivesInfo.find(localArchiveInfo => localArchiveInfo.archiveName.toLowerCase().includes('luigi'));
        console.log(luigiTest);

        const luigiLocalArchive = new LocalArchive(luigiTest);
        const luigiGlacierArchive = new GlacierArchive(glacier, { vaultName: luigiLocalArchive.archiveFolder, description: luigiLocalArchive.archiveName });
        const gameCubeVault = new GlacierVault(glacier, luigiLocalArchive.archiveFolder);

        await luigiGlacierArchive.initiateArchiveMultiUpload();
        await luigiLocalArchive.readArchiveParts(luigiGlacierArchive.abortArchiveUpload, luigiGlacierArchive.uploadArchivePart);

    } else {
        console.error(err.stack);
    }
});

