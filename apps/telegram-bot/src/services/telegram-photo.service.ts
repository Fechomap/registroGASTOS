import { Context } from 'grammy';
import { ReceiptStorageService } from '@financial-bot/storage';
import { MyContext } from '../types';

export class TelegramPhotoService {
  private receiptStorage: ReceiptStorageService;

  constructor() {
    // Configuración de Cloudflare R2
    const r2Config = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      publicDomain: process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN,
    };

    this.receiptStorage = new ReceiptStorageService(r2Config);
  }

  /**
   * Descargar y almacenar una foto de Telegram
   */
  async downloadAndStorePhoto(
    ctx: Context & MyContext,
    userId: string,
    movementId?: string,
    companyId?: string,
  ): Promise<{
    key: string;
    url: string;
    publicUrl: string;
    fileSize: number;
    mimeType: string;
  } | null> {
    try {
      if (!ctx.message?.photo) {
        return null;
      }

      // Obtener la foto de mejor calidad (la última en el array)
      const photo = ctx.message.photo[ctx.message.photo.length - 1];

      // Obtener información del archivo
      const file = await ctx.api.getFile(photo.file_id);

      if (!file.file_path) {
        throw new Error('No se pudo obtener la ruta del archivo');
      }

      // Descargar el archivo
      const response = await fetch(
        `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`,
      );

      if (!response.ok) {
        throw new Error('Error al descargar la foto de Telegram');
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Determinar MIME type basado en la extensión del archivo
      const mimeType = this.getMimeTypeFromPath(file.file_path);

      // Nombre original del archivo
      const originalName = `telegram_photo_${photo.file_id}`;

      // Subir a Cloudflare R2
      const result = await this.receiptStorage.uploadReceipt(buffer, originalName, mimeType, {
        userId,
        movementId,
        companyId,
      });

      return result;
    } catch (error) {
      console.error('Error processing Telegram photo:', error);
      return null;
    }
  }

  /**
   * Verificar si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return !!(
      process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_BUCKET_NAME
    );
  }

  /**
   * Obtener MIME type basado en la extensión del archivo
   */
  private getMimeTypeFromPath(filePath: string): string {
    const extension = filePath.toLowerCase().split('.').pop();

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    return mimeTypes[extension || ''] || 'image/jpeg';
  }
}
