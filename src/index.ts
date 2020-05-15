import { config } from 'aws-sdk';
import archiveConfig from './archive-config.json';
import { Glacier } from 'aws-sdk';
import { GlacierVault } from './modules/vault/vault';
import https from 'https';
import colors from 'colors';
import { promises as fsPromises } from 'fs';
import { VaultInventory } from './modules/vault/vault-inventory';
import { GlacierArchive } from './modules/archive/glacier-archive';
import { LocalArchive } from './modules/archive/local-archive';

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

        const localArchivesInfo = await LocalArchive.getLocalArchives(archiveConfig.archiveRoot);
        const luigiTest = localArchivesInfo.find(localArchiveInfo => localArchiveInfo.archiveName.toLowerCase().includes('luigi'));
        console.log(luigiTest);
       
    } else {
        console.error(err.stack);
    }
});

