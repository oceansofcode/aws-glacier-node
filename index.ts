import { config } from 'aws-sdk';
import archiveConfig from './archive-config.json';
import { Glacier } from 'aws-sdk';
import { GlacierVault } from './modules/glacier-vault';
import https from 'https';
import colors from 'colors';

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
        const req = await kotor2TestVault.listVaultJobs();
        console.log(req);
    } else {
        console.error(err.stack);
    }
});

