
export abstract class Archive {
    static readonly oneByte = 2 ** 10;
    static readonly chunkSize = Archive.oneByte ** 2; // Equals one MB
}