import { User, Prisma, UserRole } from '@prisma/client';
import prisma from '../client';

export class UserRepository {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { telegramId },
      include: { company: true },
    });
  }

  async findByChatId(chatId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { chatId },
      include: { company: true },
    });
  }

  async findByCompany(companyId: string, where?: Prisma.UserWhereInput): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        companyId,
        ...where,
      },
      include: { company: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAdmins(companyId: string): Promise<User[]> {
    return this.findByCompany(companyId, {
      role: UserRole.ADMIN,
      isActive: true,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
      include: { company: true },
    });
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    return this.update(id, { role });
  }

  async deactivate(id: string): Promise<User> {
    return this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<User> {
    return this.update(id, { isActive: true });
  }

  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }
}

export const userRepository = new UserRepository();