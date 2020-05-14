import { Glacier } from 'aws-sdk';
import { accountId } from '../glacier-config';
import { GlacierArchive } from '../archive/glacier-archive';

export type GlacierDescribeVaultInput = Glacier.DescribeVaultInput;
export type GlacierVaultInfo = Required<Glacier.DescribeVaultOutput>;

export type InventoryJobRequestParams = Required<Glacier.InitiateJobInput>;
export type InventoryJobRequestOutput = Glacier.InitiateJobOutput;

export type InventoryJobInput = Required<Glacier.GetJobOutputInput>;
export type InventoryJobOutput = Glacier.GetJobOutputOutput;

export type ListJobsOutput = Glacier.ListJobsOutput;

export class GlacierVault {
    private vaultArchives: GlacierArchive[];

    get vaultName(): string {
        return this.vaultInfo.VaultName;
    }

    set currentVaultArchives(glacierArchives: GlacierArchive[]) {
        this.vaultArchives = glacierArchives;
    }

    constructor(private glacier: Glacier, private vaultInfo: GlacierVaultInfo, glacierArchives?: GlacierArchive[]) {
        glacierArchives ? this.vaultArchives = glacierArchives : this.vaultArchives = [];
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

    public async listVaultJobs(): Promise<ListJobsOutput> {
        return await this.glacier.listJobs({ accountId, vaultName: this.vaultName }).promise();
    }

    public async initiateRequestVaultArchivesJob(): Promise<InventoryJobRequestOutput> {
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

    public async getVaultArchives(jobId: string): Promise<Buffer | null | undefined> {
        const inventoryJob: InventoryJobInput = {
            accountId,
            vaultName: this.vaultName,
            jobId,
            range: ''
        };

        const inventories: InventoryJobOutput = await this.glacier.getJobOutput(inventoryJob).promise();
        return inventories.body as Buffer;
    }
}