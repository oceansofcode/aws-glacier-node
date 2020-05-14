import { config } from 'aws-sdk';
import archiveConfig from './archive-config.json';
import { Glacier } from 'aws-sdk';
import { GlacierVault } from './modules/vault/vault';
import https from 'https';
import colors from 'colors';
import fs, { promises as fsPromises } from 'fs';
import stream, { Readable } from 'stream';

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
    if (!err) {
        console.log(`Access Key: ${colors.green(config.credentials.accessKeyId)}`);

        const glacier = new Glacier();
        const glacierVaults = await GlacierVault.listVaults(glacier);
        const kotor2TestVault = new GlacierVault(glacier, glacierVaults[0]);
        //const inventoryFile = await fsPromises.open('./inventories/kotor2.json', 'w');
        const inventories: Buffer = await kotor2TestVault.getVaultArchives('SWYwX8ap7K8Mc8rfV4A43g7IgKIb9d_xDuTlDMtaDV3MLOfhTGBXmL7mJ_nvMnJMcnxTBpOKKEOUVN-BZpVVQxiXEaKb');

        const kotor2StreamFile = fs.createWriteStream('./inventories/kotor2Stream.json');

        const readableInventory = new Readable();
        readableInventory._read = (): void => null ;
        readableInventory.push(inventories);
        readableInventory.push(null);

        readableInventory.pipe(kotor2StreamFile);

    } else {
        console.error(err.stack);
    }
});

