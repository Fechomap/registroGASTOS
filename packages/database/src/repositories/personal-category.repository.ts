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
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
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

  /**
   * Crear categorías predefinidas para un usuario nuevo
   */
  async createDefaultCategories(userId: string): Promise<PersonalCategory[]> {
    const defaultCategories = [
      { name: 'Alimentación', icon: '🍽️', color: '#FF6B6B', order: 1 },
      { name: 'Transporte', icon: '🚗', color: '#4ECDC4', order: 2 },
      { name: 'Entretenimiento', icon: '🎬', color: '#FFEAA7', order: 3 },
      { name: 'Salud', icon: '🏥', color: '#FD79A8', order: 4 },
      { name: 'Educación', icon: '📚', color: '#00B894', order: 5 },
      { name: 'Ropa', icon: '👕', color: '#6C5CE7', order: 6 },
      { name: 'Hogar', icon: '🏠', color: '#A29BFE', order: 7 },
      { name: 'Otros', icon: '📦', color: '#A8A8A8', order: 8 },
    ];

    const categories: PersonalCategory[] = [];
    for (const category of defaultCategories) {
      const created = await this.create({
        user: { connect: { id: userId } },
        name: category.name,
        icon: category.icon,
        color: category.color,
        order: category.order,
      });
      categories.push(created);
    }

    return categories;
  }
}

export const personalCategoryRepository = new PersonalCategoryRepository();
