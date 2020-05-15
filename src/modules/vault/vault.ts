import { Glacier } from 'aws-sdk';
import { accountId } from '../glacier-config';
import { GlacierArchive } from '../archive/glacier-archive';
import { VaultInventory } from './vault-inventory';

export interface VaultParams {
    accountId: string;
    vaultName: string;
}

export type VaultInfo = Required<Glacier.DescribeVaultOutput>;

export type CreateVaultRes = Glacier.CreateVaultOutput;

export type VaultJobs = Glacier.ListJobsOutput;
export type VaultUploads = Glacier.ListMultipartUploadsOutput;

export type InventoryJobRequestParams = Required<Glacier.InitiateJobInput>;
export type InventoryJobRequest = Glacier.InitiateJobOutput;

export type InventoryJobResParams = Required<Glacier.GetJobOutputInput>;
export type InventoryJob = Glacier.GetJobOutputOutput;

export class GlacierVault {
    private vaultArchives: GlacierArchive[];

    set currentVaultArchives(glacierArchives: GlacierArchive[]) {
        this.vaultArchives = glacierArchives;
    }

    constructor(private glacier: Glacier, private vaultName: string, glacierArchives?: GlacierArchive[]) {
        glacierArchives ? this.vaultArchives = glacierArchives : this.vaultArchives = [];
    }

    public static async createVault(glacier: Glacier, vaultName: string): Promise<CreateVaultRes> {
        const createVault: VaultParams = {
            accountId,
            vaultName
        };

        return glacier.createVault(createVault).promise();
    }

    public static async listVaults(glacier: Glacier): Promise<VaultInfo[]> {
        const listReturn = await glacier.listVaults().promise();
        return listReturn.VaultList as VaultInfo[];
    }

    public async listVaultJobs(): Promise<VaultJobs> {
        return await this.glacier.listJobs({ accountId, vaultName: this.vaultName }).promise();
    }

    public async listVaultUploads(): Promise<VaultUploads> {
        const listUploadsParams: VaultParams = {
            accountId,
            vaultName: this.vaultName
        };

        return this.glacier.listMultipartUploads(listUploadsParams).promise();
    }

    public async getVaultInfo(): Promise<VaultInfo> {
        const describeVaultInput: VaultParams = {
            accountId,
            vaultName: this.vaultName
        };

        return await this.glacier.describeVault(describeVaultInput).promise() as VaultInfo;
    }

    public async initiateRequestVaultArchivesJob(): Promise<InventoryJobRequest> {
        const inventoryJobParams: InventoryJobRequestParams = {
            accountId,
            vaultName: this.vaultName,
            jobParameters: {
                Description: 'Vault Inventory Job',
                Type: 'inventory-retrieval',
            }
        };

        return await this.glacier.initiateJob(inventoryJobParams).promise();
    }

    public async getVaultArchives(jobId: string): Promise<VaultInventory | null> {
        const inventoryJob: InventoryJobResParams = {
            accountId,
            vaultName: this.vaultName,
            jobId,
            range: ''
        };

        const inventories: InventoryJob = await this.glacier.getJobOutput(inventoryJob).promise();
        return inventories.body ? JSON.parse(inventories.body.toString()) : null;
    }

    public async deleteAllArchives(): Promise<void> {
        for (const glacierArchive of this.vaultArchives) {
            glacierArchive.deleteArchive();
        }

        this.vaultArchives = [];
        console.log(`Deleted all Archives from ${this.vaultName}`);
    }
}