import {
  MovementFilterState,
  FilterNavigationContext,
  PeriodFilter,
  MovementTypeFilter,
  ScopeFilter,
  SelectableCategory,
  SelectableCompany,
  FilterApplicationResult,
} from '../types/filter.types';
import {
  categoryRepository,
  personalCategoryRepository,
  userRepository,
  UserWithCompany,
} from '@financial-bot/database';
import { MovementFilters } from '@financial-bot/reports';

/**
 * Servicio especializado para el manejo de filtros de movimientos
 */
export class MovementsFiltersService {
  /**
   * Crear estado inicial de filtros
   */
  createInitialFilterState(): MovementFilterState {
    return {
      isActive: false,
      type: 'all',
      scope: 'all',
      // Sin período específico = sin restricción temporal
    };
  }

  /**
   * Crear contexto inicial de navegación
   */
  createInitialNavigationContext(): FilterNavigationContext {
    return {
      currentSection: 'main',
      breadcrumb: ['Filtros'],
    };
  }

  /**
   * Aplicar filtro de período
   */
  applyPeriodFilter(
    currentState: MovementFilterState,
    periodType: PeriodFilter['type'],
    customDateFrom?: Date,
    customDateTo?: Date,
  ): MovementFilterState {
    let period: PeriodFilter;

    switch (periodType) {
      case 'today':
        period = {
          type: 'today',
          label: 'Hoy',
          ...this.getTodayDateRange(),
        };
        break;

      case 'week':
        period = {
          type: 'week',
          label: 'Esta Semana',
          ...this.getWeekDateRange(),
        };
        break;

      case 'month':
        period = {
          type: 'month',
          label: 'Este Mes',
          ...this.getMonthDateRange(),
        };
        break;

      case 'quarter':
        period = {
          type: 'quarter',
          label: 'Últimos 3 Meses',
          ...this.getQuarterDateRange(),
        };
        break;

      case 'custom':
        if (!customDateFrom || !customDateTo) {
          throw new Error('Fechas personalizadas son requeridas');
        }
        period = {
          type: 'custom',
          label: `${customDateFrom.toLocaleDateString('es-MX')} - ${customDateTo.toLocaleDateString('es-MX')}`,
          dateFrom: customDateFrom,
          dateTo: customDateTo,
        };
        break;

      default:
        throw new Error(`Tipo de período no válido: ${periodType}`);
    }

    return {
      ...currentState,
      period,
      isActive: true,
    };
  }

  /**
   * Aplicar filtro de tipo
   */
  applyTypeFilter(
    currentState: MovementFilterState,
    type: MovementTypeFilter,
  ): MovementFilterState {
    return {
      ...currentState,
      type,
      isActive: type !== 'all' || this.hasOtherFilters(currentState),
    };
  }

  /**
   * Aplicar filtro de alcance
   */
  applyScopeFilter(currentState: MovementFilterState, scope: ScopeFilter): MovementFilterState {
    return {
      ...currentState,
      scope,
      isActive: scope !== 'all' || this.hasOtherFilters(currentState),
    };
  }

  /**
   * Aplicar filtro de categorías
   */
  applyCategoriesFilter(
    currentState: MovementFilterState,
    categories: string[],
  ): MovementFilterState {
    return {
      ...currentState,
      categories: categories.length > 0 ? categories : undefined,
      isActive: categories.length > 0 || this.hasOtherFilters(currentState),
    };
  }

  /**
   * Aplicar filtro de empresas
   */
  applyCompaniesFilter(
    currentState: MovementFilterState,
    companies: string[],
  ): MovementFilterState {
    return {
      ...currentState,
      companies: companies.length > 0 ? companies : undefined,
      isActive: companies.length > 0 || this.hasOtherFilters(currentState),
    };
  }

  /**
   * Limpiar filtro específico
   */
  clearSpecificFilter(
    currentState: MovementFilterState,
    filterType: keyof MovementFilterState,
  ): MovementFilterState {
    const newState = { ...currentState };

    switch (filterType) {
      case 'period':
        delete newState.period;
        break;
      case 'type':
        newState.type = 'all';
        break;
      case 'scope':
        newState.scope = 'all';
        break;
      case 'categories':
        delete newState.categories;
        break;
      case 'companies':
        delete newState.companies;
        break;
    }

    newState.isActive = this.hasAnyActiveFilters(newState);
    return newState;
  }

  /**
   * Limpiar todos los filtros
   */
  clearAllFilters(): MovementFilterState {
    return this.createInitialFilterState();
  }

  /**
   * Convertir filtros a formato MovementFilters para repositorio
   */
  convertToMovementFilters(filterState: MovementFilterState, companyId: string): MovementFilters {
    const filters: MovementFilters = { companyId };

    // Aplicar filtro de período
    if (filterState.period?.dateFrom && filterState.period.dateTo) {
      filters.dateFrom = filterState.period.dateFrom;
      filters.dateTo = filterState.period.dateTo;
    }

    // Aplicar filtro de tipo
    if (filterState.type && filterState.type !== 'all') {
      filters.type = filterState.type === 'expense' ? 'EXPENSE' : 'INCOME';
    }

    // Aplicar filtro de categorías (tomar la primera para compatibilidad)
    if (filterState.categories && filterState.categories.length > 0) {
      filters.categoryId = filterState.categories[0];
    }

    return filters;
  }

  /**
   * Obtener categorías disponibles para el usuario
   */
  async getAvailableCategories(
    userId: string,
    companyId: string,
    userRole: 'ADMIN' | 'OPERATOR',
  ): Promise<SelectableCategory[]> {
    const categories: SelectableCategory[] = [];

    // Obtener categorías empresariales
    const companyCategories = await categoryRepository.findByCompany(companyId);
    companyCategories.forEach(category => {
      categories.push({
        id: category.id,
        name: category.name,
        icon: category.icon || undefined,
        isPersonal: false,
        isSelected: false,
      });
    });

    // Obtener categorías personales (solo para operadores)
    if (userRole === 'OPERATOR') {
      const personalCategories = await personalCategoryRepository.findByUser(userId);
      personalCategories.forEach(category => {
        categories.push({
          id: category.id,
          name: category.name,
          icon: category.icon || undefined,
          isPersonal: true,
          isSelected: false,
        });
      });
    }

    return categories.sort((a, b) => {
      // Ordenar primero por tipo (empresariales primero), luego por nombre
      if (a.isPersonal !== b.isPersonal) {
        return a.isPersonal ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Obtener empresas disponibles para el usuario (solo admins)
   */
  async getAvailableCompanies(user: UserWithCompany): Promise<SelectableCompany[]> {
    if (user.role !== 'ADMIN') {
      return [];
    }

    try {
      const userCompanies = await userRepository.getUserCompanies(user.id);

      return userCompanies.map(uc => ({
        id: uc.company.id,
        name: uc.company.name,
        isSelected: false,
      }));
    } catch {
      // Si falla, retornar solo la empresa actual
      return [
        {
          id: user.companyId,
          name: user.company.name,
          isSelected: false,
        },
      ];
    }
  }

  /**
   * Aplicar filtros y obtener resultado
   */
  applyFilters(filterState: MovementFilterState): FilterApplicationResult {
    const activeFilters = this.countActiveFilters(filterState);

    const summary = this.generateFilterSummary(filterState);

    return {
      filtersApplied: activeFilters,
      summary,
      isEmpty: activeFilters === 0,
    };
  }

  /**
   * Generar resumen de filtros aplicados
   */
  private generateFilterSummary(filterState: MovementFilterState): string {
    const parts: string[] = [];

    if (filterState.period) {
      parts.push(`📅 ${filterState.period.label}`);
    }

    if (filterState.type && filterState.type !== 'all') {
      const typeLabel = filterState.type === 'expense' ? 'Solo Gastos' : 'Solo Ingresos';
      parts.push(`💰 ${typeLabel}`);
    }

    if (filterState.categories && filterState.categories.length > 0) {
      parts.push(
        `📁 ${filterState.categories.length} categoría${filterState.categories.length > 1 ? 's' : ''}`,
      );
    }

    if (filterState.scope && filterState.scope !== 'all') {
      const scopeLabel = filterState.scope === 'company' ? 'Solo Empresariales' : 'Solo Personales';
      parts.push(`🏢 ${scopeLabel}`);
    }

    if (filterState.companies && filterState.companies.length > 0) {
      parts.push(
        `🏭 ${filterState.companies.length} empresa${filterState.companies.length > 1 ? 's' : ''}`,
      );
    }

    return parts.length > 0 ? parts.join(' • ') : 'Sin filtros aplicados';
  }

  /**
   * Contar filtros activos
   */
  private countActiveFilters(filterState: MovementFilterState): number {
    let count = 0;

    if (filterState.period) count++;
    if (filterState.type && filterState.type !== 'all') count++;
    if (filterState.categories && filterState.categories.length > 0) count++;
    if (filterState.scope && filterState.scope !== 'all') count++;
    if (filterState.companies && filterState.companies.length > 0) count++;

    return count;
  }

  /**
   * Verificar si hay otros filtros activos (excluyendo el actual)
   */
  private hasOtherFilters(currentState: MovementFilterState): boolean {
    const count = this.countActiveFilters(currentState);
    return count > 1;
  }

  /**
   * Verificar si hay filtros activos
   */
  private hasAnyActiveFilters(filterState: MovementFilterState): boolean {
    return this.countActiveFilters(filterState) > 0;
  }

  /**
   * Obtener rango de fechas para "hoy"
   */
  private getTodayDateRange(): { dateFrom: Date; dateTo: Date } {
    // Obtener fecha actual en UTC para evitar problemas de zona horaria
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    return { dateFrom: today, dateTo: tomorrow };
  }

  /**
   * Obtener rango de fechas para "esta semana"
   */
  private getWeekDateRange(): { dateFrom: Date; dateTo: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const firstDay = new Date(today);
    firstDay.setUTCDate(today.getUTCDate() - today.getUTCDay());
    firstDay.setUTCHours(0, 0, 0, 0);

    const lastDay = new Date(firstDay);
    lastDay.setUTCDate(lastDay.getUTCDate() + 7);
    return { dateFrom: firstDay, dateTo: lastDay };
  }

  /**
   * Obtener rango de fechas para "este mes"
   */
  private getMonthDateRange(): { dateFrom: Date; dateTo: Date } {
    const now = new Date();
    const firstDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const lastDay = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
    return { dateFrom: firstDay, dateTo: lastDay };
  }

  /**
   * Obtener rango de fechas para "últimos 3 meses"
   */
  private getQuarterDateRange(): { dateFrom: Date; dateTo: Date } {
    const now = new Date();
    const threeMonthsAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 3, 1));
    const lastDay = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
    return { dateFrom: threeMonthsAgo, dateTo: lastDay };
  }
}
