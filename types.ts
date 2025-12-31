
export enum AppTab {
  ENCRYPT = 'ENCRYPT',
  DECRYPT = 'DECRYPT'
}

export interface EncryptionResult {
  fileName: string;
  blob: Blob;
  size: number;
}
