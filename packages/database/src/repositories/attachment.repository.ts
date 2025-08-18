import { Attachment, Prisma } from '@prisma/client';
import prisma from '../client';

export class AttachmentRepository {
  async create(data: Prisma.AttachmentCreateInput): Promise<Attachment> {
    return prisma.attachment.create({
      data,
    });
  }

  async findById(id: string): Promise<Attachment | null> {
    return prisma.attachment.findUnique({
      where: { id },
    });
  }

  async findByMovement(movementId: string): Promise<Attachment[]> {
    return prisma.attachment.findMany({
      where: { movementId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, data: Prisma.AttachmentUpdateInput): Promise<Attachment> {
    return prisma.attachment.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Attachment> {
    return prisma.attachment.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: 'PENDING' | 'COMPLETED' | 'FAILED'): Promise<Attachment> {
    return this.update(id, {
      status,
      processedAt: status === 'COMPLETED' ? new Date() : undefined,
    });
  }
}

export const attachmentRepository = new AttachmentRepository();
