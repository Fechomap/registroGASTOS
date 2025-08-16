import { Category, Prisma } from '@prisma/client';
import prisma from '../client';

export type CategoryWithRelations = Category & {
  parent?: Category | null;
  children?: Category[];
  _count?: {
    movements: number;
  };
};

export class CategoryRepository {
  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return prisma.category.create({
      data,
    });
  }

  async findById(id: string): Promise<CategoryWithRelations | null> {
    return prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async findByCompany(companyId: string, includeInactive = false): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        companyId,
        isActive: includeInactive ? undefined : true,
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [
        { parentId: { sort: 'asc', nulls: 'first' } },
        { order: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findRootCategories(companyId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        companyId,
        parentId: null,
        isActive: true,
      },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async findByName(companyId: string, name: string, parentId?: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: {
        companyId,
        name,
        parentId,
      },
    });
  }

  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async updateOrder(categories: { id: string; order: number }[]): Promise<void> {
    await prisma.$transaction(
      categories.map(({ id, order }) =>
        prisma.category.update({
          where: { id },
          data: { order },
        })
      )
    );
  }

  async deactivate(id: string): Promise<Category> {
    // También desactivar todas las categorías hijas
    await prisma.category.updateMany({
      where: { parentId: id },
      data: { isActive: false },
    });

    return prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async delete(id: string): Promise<Category> {
    // Verificar que no tenga movimientos asociados
    const movementsCount = await prisma.movement.count({
      where: { categoryId: id },
    });

    if (movementsCount > 0) {
      throw new Error('No se puede eliminar una categoría que tiene movimientos asociados');
    }

    // Eliminar categorías hijas primero
    await prisma.category.deleteMany({
      where: { parentId: id },
    });

    return prisma.category.delete({
      where: { id },
    });
  }

  async getWithMovementCount(companyId: string) {
    return prisma.category.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        _count: {
          select: { movements: true },
        },
        parent: true,
        children: {
          where: { isActive: true },
          include: {
            _count: {
              select: { movements: true },
            },
          },
        },
      },
      orderBy: [
        { parentId: { sort: 'asc', nulls: 'first' } },
        { order: 'asc' },
      ],
    });
  }
}

export const categoryRepository = new CategoryRepository();