import { CloudflareR2Service, R2Config } from './cloudflare-r2.service';

export interface ReceiptUploadResult {
  key: string;
  url: string;
  publicUrl: string;
  fileSize: number;
  mimeType: string;
}

export class ReceiptStorageService {
  private r2Service: CloudflareR2Service;

  constructor(config: R2Config) {
    this.r2Service = new CloudflareR2Service(config);
  }

  /**
   * Subir una foto de recibo
   */
  async uploadReceipt(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    metadata: {
      userId: string;
      movementId?: string;
      companyId?: string;
    },
  ): Promise<ReceiptUploadResult> {
    // Validar que es una imagen
    if (!mimeType.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }

    // Validar tamaño (máximo 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('El archivo es demasiado grande (máximo 10MB)');
    }

    // Determinar extensión
    const extension = this.getFileExtension(mimeType);

    // Generar clave única
    const prefix = metadata.companyId
      ? `receipts/company/${metadata.companyId}`
      : `receipts/personal/${metadata.userId}`;
    const key = this.r2Service.generateFileKey(prefix, originalName, extension);

    // Metadatos adicionales
    const fileMetadata = {
      userId: metadata.userId,
      movementId: metadata.movementId || '',
      companyId: metadata.companyId || '',
      uploadedAt: new Date().toISOString(),
    };

    // Subir archivo
    const result = await this.r2Service.uploadFile(buffer, key, mimeType, fileMetadata);

    return {
      ...result,
      fileSize: buffer.length,
      mimeType,
    };
  }

  /**
   * Obtener URL firmada para una foto de recibo
   */
  async getReceiptUrl(key: string): Promise<string> {
    return await this.r2Service.getSignedUrl(key, 3600); // 1 hora
  }

  /**
   * Obtener extensión basada en MIME type
   */
  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };

    return extensions[mimeType] || '.jpg';
  }
}
