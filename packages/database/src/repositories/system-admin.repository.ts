import { SystemAdmin, Prisma } from '@prisma/client';
import prisma from '../client';

export class SystemAdminRepository {
  async create(data: Prisma.SystemAdminCreateInput): Promise<SystemAdmin> {
    return prisma.systemAdmin.create({
      data,
    });
  }

  async findById(id: string): Promise<SystemAdmin | null> {
    return prisma.systemAdmin.findUnique({
      where: { id },
    });
  }

  async findByTelegramId(telegramId: string): Promise<SystemAdmin | null> {
    return prisma.systemAdmin.findUnique({
      where: { telegramId },
    });
  }

  async findByChatId(chatId: string): Promise<SystemAdmin | null> {
    return prisma.systemAdmin.findUnique({
      where: { chatId },
    });
  }

  async findAll(): Promise<SystemAdmin[]> {
    return prisma.systemAdmin.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, data: Prisma.SystemAdminUpdateInput): Promise<SystemAdmin> {
    return prisma.systemAdmin.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: string): Promise<SystemAdmin> {
    return this.update(id, { isActive: false });
  }

  async delete(id: string): Promise<SystemAdmin> {
    return prisma.systemAdmin.delete({
      where: { id },
    });
  }

  async isSystemAdmin(telegramId: string): Promise<boolean> {
    const admin = await this.findByTelegramId(telegramId);
    return admin?.isActive || false;
  }
}

export const systemAdminRepository = new SystemAdminRepository();