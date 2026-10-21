import { BlobServiceClient } from '@azure/storage-blob';

export function getGuidePhotoContainer() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) throw new Error('AZURE_STORAGE_CONNECTION_STRING tanımlı değil.');

  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'guide-photos';
  return BlobServiceClient.fromConnectionString(connectionString).getContainerClient(containerName);
}
