import { PersonalCategory, Prisma } from '@prisma/client';
import prisma from '../client';

export class PersonalCategoryRepository {
  async create(data: Prisma.PersonalCategoryCreateInput): Promise<PersonalCategory> {
    return prisma.personalCategory.create({
      data,
    });
  }

  async findById(id: string): Promise<PersonalCategory | null> {
    return prisma.personalCategory.findUnique({
      where: { id },
    });
  }

  async findByUser(userId: string): Promise<PersonalCategory[]> {
    return prisma.personalCategory.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async update(id: string, data: Prisma.PersonalCategoryUpdateInput): Promise<PersonalCategory> {
    return prisma.personalCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<PersonalCategory> {
    return prisma.personalCategory.delete({
      where: { id },
    });
  }

  async deactivate(id: string): Promise<PersonalCategory> {
    return this.update(id, { isActive: false });
  }
}

export const personalCategoryRepository = new PersonalCategoryRepository();