import { Glacier } from 'aws-sdk';
import { accountId } from './glacier-config';

export type GlacierDescribeVaultInput = Glacier.DescribeVaultInput;
export type GlacierVaultInfo = Required<Glacier.DescribeVaultOutput>;
export type InventoryJobParams = Required<Glacier.InitiateJobInput>;
export type InventoryJobOutput = Glacier.InitiateMultipartUploadInput;

export class GlacierVault {

    get vaultName(): string {
        return this.vaultInfo.VaultName;
    }

    constructor(private glacier: Glacier, private vaultInfo: GlacierVaultInfo) {
    }

    public static async listVaults(glacier: Glacier): Promise<GlacierVaultInfo[]> {
        const listReturn = await glacier.listVaults().promise();
        return listReturn.VaultList as GlacierVaultInfo[];
    }

    public async getVaultInfo(): Promise<GlacierVaultInfo> {
        const describeVaultInput: GlacierDescribeVaultInput = {
            accountId,
            vaultName: this.vaultInfo.VaultName
        };

        return await this.glacier.describeVault(describeVaultInput).promise() as GlacierVaultInfo;
    }

    public async listVaultJobs() {
        return await this.glacier.listJobs({ accountId, vaultName: this.vaultName }).promise();
    }

    public async listVaultArchives() {
        const inventoryJobParams: InventoryJobParams = {
            accountId,
            vaultName: this.vaultName,
            jobParameters: {
                Description: 'Vault Inventory Job',
                Type: 'inventory-retrieval',
            }
        };
        const inventoryRequestResult = await this.glacier.initiateJob(inventoryJobParams).promise();
        return inventoryRequestResult;
    }
}