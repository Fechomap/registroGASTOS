import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadResult {
  key: string;
  url: string;
  publicUrl: string;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain?: string;
}

export class CloudflareR2Service {
  private client: S3Client;
  private bucketName: string;
  private publicDomain?: string;

  constructor(config: R2Config) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    this.bucketName = config.bucketName;
    this.publicDomain = config.publicDomain;
  }

  /**
   * Subir un archivo a Cloudflare R2
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    });

    await this.client.send(command);

    const url = await this.getSignedUrl(key);
    const publicUrl = this.getPublicUrl(key);

    return {
      key,
      url,
      publicUrl,
    };
  }

  /**
   * Obtener una URL firmada para acceso temporal
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Obtener la URL pública del archivo (si se configuró un dominio público)
   */
  getPublicUrl(key: string): string {
    if (this.publicDomain) {
      return `https://${this.publicDomain}/${key}`;
    }
    return `https://${this.bucketName}.r2.dev/${key}`;
  }

  /**
   * Generar una clave única para el archivo
   */
  generateFileKey(prefix: string, originalName: string, extension: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);

    return `${prefix}/${timestamp}-${randomStr}-${sanitizedName}${extension}`;
  }
}
