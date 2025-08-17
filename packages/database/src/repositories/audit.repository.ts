import { AuditLog, Prisma } from '@prisma/client';
import prisma from '../client';

export interface CreateAuditLogData {
  companyId: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'Movement' | 'Category' | 'User' | 'Company';
  entityId: string;
  oldData?: unknown;
  newData?: unknown;
  metadata?: unknown;
}

export class AuditRepository {
  async create(data: CreateAuditLogData): Promise<AuditLog> {
    return prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldData: data.oldData ? JSON.parse(JSON.stringify(data.oldData)) : null,
        newData: data.newData ? JSON.parse(JSON.stringify(data.newData)) : null,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
      },
      include: {
        user: true,
      },
    });
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCompany(
    companyId: string,
    filters?: {
      entityType?: string;
      action?: string;
      userId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    pagination?: { skip?: number; take?: number },
  ): Promise<AuditLog[]> {
    const where: Prisma.AuditLogWhereInput = {
      companyId,
    };

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    return prisma.auditLog.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async count(
    companyId: string,
    filters?: {
      entityType?: string;
      action?: string;
      userId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<number> {
    const where: Prisma.AuditLogWhereInput = {
      companyId,
    };

    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.action) where.action = filters.action;
    if (filters?.userId) where.userId = filters.userId;

    return prisma.auditLog.count({ where });
  }

  async getActivitySummary(companyId: string, days: number = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const logs = await this.findByCompany(companyId, { dateFrom });

    const summary = {
      totalActions: logs.length,
      byAction: {} as Record<string, number>,
      byEntityType: {} as Record<string, number>,
      byUser: {} as Record<string, { name: string; count: number }>,
      recentActivity: logs.slice(0, 10),
    };

    logs.forEach(log => {
      // Count by action
      summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;

      // Count by entity type
      summary.byEntityType[log.entityType] = (summary.byEntityType[log.entityType] || 0) + 1;

      // Count by user (need to include user relation for this)
      const userKey = log.userId;
      if (!summary.byUser[userKey]) {
        summary.byUser[userKey] = {
          name: 'Usuario', // Will be updated when user data is included
          count: 0,
        };
      }
      summary.byUser[userKey].count++;
    });

    return summary;
  }
}

export const auditRepository = new AuditRepository();
