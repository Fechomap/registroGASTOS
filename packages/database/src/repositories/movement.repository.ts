import { Movement, Prisma, MovementType } from '@prisma/client';
import prisma from '../client';

export interface MovementFilters {
  companyId: string;
  userId?: string;
  type?: MovementType;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
}

export class MovementRepository {
  async create(data: Prisma.MovementCreateInput): Promise<Movement> {
    return prisma.movement.create({
      data,
      include: {
        user: true,
        category: true,
        attachments: true,
      },
    });
  }

  async findById(id: string): Promise<Movement | null> {
    return prisma.movement.findUnique({
      where: { id },
      include: {
        user: true,
        category: true,
        attachments: true,
        company: true,
      },
    });
  }

  async findByFolio(folio: string): Promise<Movement | null> {
    return prisma.movement.findUnique({
      where: { folio },
      include: {
        user: true,
        category: true,
        attachments: true,
        company: true,
      },
    });
  }

  async findMany(filters: MovementFilters, pagination?: { skip?: number; take?: number }) {
    const where: Prisma.MovementWhereInput = {
      companyId: filters.companyId,
    };

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.date.lte = filters.dateTo;
      }
    }

    if (filters.amountFrom || filters.amountTo) {
      where.amount = {};
      if (filters.amountFrom) {
        where.amount.gte = filters.amountFrom;
      }
      if (filters.amountTo) {
        where.amount.lte = filters.amountTo;
      }
    }

    return prisma.movement.findMany({
      where,
      include: {
        user: true,
        category: true,
        attachments: true,
      },
      orderBy: { date: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async count(filters: MovementFilters): Promise<number> {
    const where: Prisma.MovementWhereInput = {
      companyId: filters.companyId,
    };

    if (filters.userId) where.userId = filters.userId;
    if (filters.type) where.type = filters.type;
    if (filters.categoryId) where.categoryId = filters.categoryId;

    return prisma.movement.count({ where });
  }

  async update(id: string, data: Prisma.MovementUpdateInput): Promise<Movement> {
    return prisma.movement.update({
      where: { id },
      data,
      include: {
        user: true,
        category: true,
        attachments: true,
      },
    });
  }

  async delete(id: string): Promise<Movement> {
    return prisma.movement.delete({
      where: { id },
    });
  }

  async generateFolio(companyId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    const lastMovement = await prisma.movement.findFirst({
      where: {
        companyId,
        folio: {
          startsWith: `F-${year}${month}`,
        },
      },
      orderBy: { folio: 'desc' },
    });

    let sequence = 1;
    if (lastMovement?.folio) {
      const lastSequence = parseInt(lastMovement.folio.split('-')[1].slice(6));
      sequence = lastSequence + 1;
    }

    return `F-${year}${month}${String(sequence).padStart(4, '0')}`;
  }

  async getDailySummary(companyId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const movements = await this.findMany({
      companyId,
      dateFrom: startOfDay,
      dateTo: endOfDay,
    });

    const totalExpenses = movements
      .filter(m => m.type === MovementType.EXPENSE)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalIncomes = movements
      .filter(m => m.type === MovementType.INCOME)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    return {
      date,
      movements,
      totalExpenses,
      totalIncomes,
      balance: totalIncomes - totalExpenses,
      count: movements.length,
    };
  }
}

export const movementRepository = new MovementRepository();