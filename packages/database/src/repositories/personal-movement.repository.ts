import {
  PersonalMovement,
  Prisma,
  MovementType,
  User,
  PersonalCategory,
  PersonalAttachment,
} from '@prisma/client';
import prisma from '../client';

export type PersonalMovementWithRelations = PersonalMovement & {
  category: PersonalCategory | null;
  user: User;
  attachments: PersonalAttachment[];
};

export class PersonalMovementRepository {
  async create(data: Prisma.PersonalMovementCreateInput): Promise<PersonalMovement> {
    return prisma.personalMovement.create({
      data,
      include: {
        category: true,
      },
    });
  }

  async findById(id: string): Promise<PersonalMovementWithRelations | null> {
    return prisma.personalMovement.findUnique({
      where: { id },
      include: {
        category: true,
        user: true,
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
  ): Promise<PersonalMovementWithRelations[]> {
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
        user: true,
        attachments: true,
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

  async generateFolio(_userId: string): Promise<string> {
    // Buscar el último folio personal
    const lastMovement = await prisma.personalMovement.findFirst({
      where: {
        folio: {
          startsWith: 'PER-',
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

    return `PER-${sequence}`;
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
