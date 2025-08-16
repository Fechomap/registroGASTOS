import { Company, Prisma } from '@prisma/client';
import prisma from '../client';

export class CompanyRepository {
  async create(data: Prisma.CompanyCreateInput): Promise<Company> {
    return prisma.company.create({
      data,
    });
  }

  async findById(id: string): Promise<Company | null> {
    return prisma.company.findUnique({
      where: { id },
    });
  }

  async findMany(where?: Prisma.CompanyWhereInput): Promise<Company[]> {
    return prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
    return prisma.company.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Company> {
    return prisma.company.delete({
      where: { id },
    });
  }

  async findWithUsers(id: string) {
    return prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }
}

export const companyRepository = new CompanyRepository();