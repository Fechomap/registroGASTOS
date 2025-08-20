import {
  Movement,
  Prisma,
  MovementType,
  Category,
  User,
  Company,
  Attachment,
} from '@prisma/client';
import prisma from '../client';

export type MovementWithRelations = Movement & {
  category: Category | null;
  user: User;
  company: Company;
  attachments: Attachment[];
};

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

  async findById(id: string): Promise<MovementWithRelations | null> {
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

  async findByFolio(folio: string): Promise<MovementWithRelations | null> {
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

  async findByFolioAndCompany(
    folio: string,
    companyId: string,
  ): Promise<MovementWithRelations | null> {
    return prisma.movement.findFirst({
      where: {
        folio,
        companyId,
      },
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
        company: true,
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
    // Obtener el nombre de la empresa para generar prefijo
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // Generar prefijo con las primeras 3 letras del nombre de la empresa
    const prefix = company.name
      .replace(/[^a-zA-Z]/g, '') // Solo letras
      .substring(0, 3)
      .toUpperCase();

    // Buscar el último folio con este prefijo
    const lastMovement = await prisma.movement.findFirst({
      where: {
        folio: {
          startsWith: `${prefix}-`,
        },
      },
      orderBy: { folio: 'desc' },
    });

    let sequence = 1;
    if (lastMovement?.folio) {
      const parts = lastMovement.folio.split('-');
      if (parts.length >= 2) {
        const lastSequence = parseInt(parts[1]);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    return `${prefix}-${sequence}`;
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
      .filter((m: MovementWithRelations) => m.type === MovementType.EXPENSE)
      .reduce((sum: number, m: MovementWithRelations) => sum + Number(m.amount), 0);

    const totalIncomes = movements
      .filter((m: MovementWithRelations) => m.type === MovementType.INCOME)
      .reduce((sum: number, m: MovementWithRelations) => sum + Number(m.amount), 0);

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
