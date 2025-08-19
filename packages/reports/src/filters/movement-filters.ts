import { MovementType } from '@financial-bot/database';

export interface MovementFilters {
  companyId: string;
  userId?: string;
  type?: MovementType;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
  page?: number;
  limit?: number;
}

export interface DateFilter {
  type: 'today' | 'week' | 'month' | 'custom';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ExportOptions {
  format: 'excel' | 'pdf';
  filters: MovementFilters;
  includeAttachments?: boolean;
  groupByCategory?: boolean;
  includeCharts?: boolean;
}

export class MovementFilterBuilder {
  private filters: MovementFilters;

  constructor(companyId: string) {
    this.filters = { companyId };
  }

  byUser(userId: string): this {
    this.filters.userId = userId;
    return this;
  }

  byType(type: MovementType): this {
    this.filters.type = type;
    return this;
  }

  byCategory(categoryId: string): this {
    this.filters.categoryId = categoryId;
    return this;
  }

  byDateRange(dateFrom: Date, dateTo: Date): this {
    this.filters.dateFrom = dateFrom;
    this.filters.dateTo = dateTo;
    return this;
  }

  byAmountRange(amountFrom: number, amountTo: number): this {
    this.filters.amountFrom = amountFrom;
    this.filters.amountTo = amountTo;
    return this;
  }

  withPagination(page: number, limit: number): this {
    this.filters.page = page;
    this.filters.limit = limit;
    return this;
  }

  today(): this {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.byDateRange(today, tomorrow);
  }

  thisWeek(): this {
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    firstDay.setHours(0, 0, 0, 0);
    const lastDay = new Date(firstDay);
    lastDay.setDate(lastDay.getDate() + 7);

    return this.byDateRange(firstDay, lastDay);
  }

  thisMonth(): this {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    lastDay.setHours(23, 59, 59, 999);

    return this.byDateRange(firstDay, lastDay);
  }

  build(): MovementFilters {
    return { ...this.filters };
  }
}

export function createDateFilter(
  type: DateFilter['type'],
  customFrom?: Date,
  customTo?: Date,
): DateFilter {
  const filter: DateFilter = { type };

  switch (type) {
    case 'today':
      filter.dateFrom = new Date();
      filter.dateFrom.setHours(0, 0, 0, 0);
      filter.dateTo = new Date();
      filter.dateTo.setHours(23, 59, 59, 999);
      break;

    case 'week': {
      const today = new Date();
      filter.dateFrom = new Date(today.setDate(today.getDate() - today.getDay()));
      filter.dateFrom.setHours(0, 0, 0, 0);
      filter.dateTo = new Date(filter.dateFrom);
      filter.dateTo.setDate(filter.dateTo.getDate() + 6);
      filter.dateTo.setHours(23, 59, 59, 999);
      break;
    }

    case 'month': {
      const now = new Date();
      filter.dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      filter.dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      filter.dateTo.setHours(23, 59, 59, 999);
      break;
    }

    case 'custom':
      if (customFrom && customTo) {
        filter.dateFrom = customFrom;
        filter.dateTo = customTo;
      }
      break;
  }

  return filter;
}
