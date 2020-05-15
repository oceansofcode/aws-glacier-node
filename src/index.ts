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
        const luigiTest = localArchivesInfo.find(localArchiveInfo => localArchiveInfo.archiveName.toLowerCase().includes('kotor'));
        console.log(luigiTest);

        const kotorLocalArchive = new LocalArchive(luigiTest);
        const kotorGlacierArchive = new GlacierArchive(glacier, { vaultName: kotorLocalArchive.archiveFolder, description: kotorLocalArchive.archiveName });
        const kotorVault = new GlacierVault(glacier, kotorLocalArchive.archiveFolder);

        console.log(await kotorVault.listVaultUploads());

        await kotorGlacierArchive.initiateArchiveMultiUpload();
        await kotorLocalArchive.readArchiveParts(kotorGlacierArchive.abortArchiveUpload.bind(kotorGlacierArchive), kotorGlacierArchive.uploadArchivePart.bind(kotorGlacierArchive));

    } else {
        console.error(err.stack);
    }
});

