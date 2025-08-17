import { PersonalMovement, Prisma, MovementType } from '@prisma/client';
import prisma from '../client';

export class PersonalMovementRepository {
  async create(data: Prisma.PersonalMovementCreateInput): Promise<PersonalMovement> {
    return prisma.personalMovement.create({
      data,
      include: {
        category: true,
      },
    });
  }

  async findById(id: string): Promise<PersonalMovement | null> {
    return prisma.personalMovement.findUnique({
      where: { id },
      include: {
        category: true,
        attachments: true,
      },
    });
  }

  async findByUser(
    userId: string,
    options?: {
      type?: MovementType;
      dateFrom?: Date;
      dateTo?: Date;
      categoryId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<PersonalMovement[]> {
    const where: Prisma.PersonalMovementWhereInput = {
      userId,
    };

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.dateFrom || options?.dateTo) {
      where.date = {};
      if (options.dateFrom) {
        where.date.gte = options.dateFrom;
      }
      if (options.dateTo) {
        where.date.lte = options.dateTo;
      }
    }

    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }

    return prisma.personalMovement.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { date: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  async update(id: string, data: Prisma.PersonalMovementUpdateInput): Promise<PersonalMovement> {
    return prisma.personalMovement.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  async delete(id: string): Promise<PersonalMovement> {
    return prisma.personalMovement.delete({
      where: { id },
    });
  }

  async generateFolio(userId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    // Buscar el último folio del mes para este usuario
    const lastMovement = await prisma.personalMovement.findFirst({
      where: {
        userId,
        folio: {
          startsWith: `PER-${year}${month}-`,
        },
      },
      orderBy: { folio: 'desc' },
    });

    let nextNumber = 1;
    if (lastMovement) {
      const lastNumber = parseInt(lastMovement.folio.slice(-6), 10);
      nextNumber = lastNumber + 1;
    }

    return `PER-${year}${month}-${String(nextNumber).padStart(6, '0')}`;
  }

  async getTotalsByCategory(userId: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.PersonalMovementWhereInput = {
      userId,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = dateFrom;
      if (dateTo) where.date.lte = dateTo;
    }

    return prisma.personalMovement.groupBy({
      by: ['categoryId', 'type'],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });
  }
}

export const personalMovementRepository = new PersonalMovementRepository();
