export interface VaultInventory {
    VaultARN: string;
    InventoryDate: string;
    ArchiveList: GlacierArchiveInfo[];
}

export interface GlacierArchiveInfo {
    ArchiveId: string;
    ArchiveDescription: string;
    CreationDate: string;
    Size: number;
    SHA256TreeHash: string;
}