import { config } from 'aws-sdk';
import archiveConfig from './archive-config.json';
import { updateArchive } from './modules/write';

config.update({ region: archiveConfig.region });

config.getCredentials(err => {
    if (!err) {
        console.log(`Access Key: ${config.credentials.accessKeyId}`);
        updateArchive().then(() => console.log('Finished Updating Archive')).catch(err => console.log('Error updating archive', err));
    } else {
        console.error(err.stack);
    }
});