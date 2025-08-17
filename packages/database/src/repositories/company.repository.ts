import { Company, Prisma, CompanyStatus } from '@prisma/client';
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

  // Métodos específicos para multi-tenant
  async findPendingCompanies(): Promise<Company[]> {
    return prisma.company.findMany({
      where: { status: CompanyStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findApprovedCompanies(): Promise<Company[]> {
    return prisma.company.findMany({
      where: { status: CompanyStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveCompany(id: string, approvedBy: string): Promise<Company> {
    return prisma.company.update({
      where: { id },
      data: {
        status: CompanyStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  async rejectCompany(id: string, rejectionReason: string): Promise<Company> {
    return prisma.company.update({
      where: { id },
      data: {
        status: CompanyStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason,
      },
    });
  }

  async suspendCompany(id: string): Promise<Company> {
    return prisma.company.update({
      where: { id },
      data: {
        status: CompanyStatus.SUSPENDED,
      },
    });
  }

  async isCompanyApproved(companyId: string): Promise<boolean> {
    const company = await this.findById(companyId);
    return company?.status === CompanyStatus.APPROVED && company.isActive;
  }

  /**
   * Buscar empresa pendiente por usuario que la solicitó
   */
  async findPendingByUser(telegramId: string): Promise<Company | null> {
    return prisma.company.findFirst({
      where: {
        requestedBy: telegramId,
        status: CompanyStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const companyRepository = new CompanyRepository();