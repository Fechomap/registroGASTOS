import { InlineKeyboard } from 'grammy';
import {
  MovementFilterState,
  FilterKeyboardOptions,
  PeriodFilterConfig,
  TypeFilterConfig,
  ScopeFilterConfig,
  SelectableCategory,
  SelectableCompany,
  FilterBadge,
  FilterStats,
} from '../types/filter.types';

/**
 * Servicio para generar interfaces de usuario dinámicas para filtros de movimientos
 */
export class MovementsUIService {
  /**
   * Configuraciones predefinidas para filtros de período
   */
  private readonly periodConfigs: PeriodFilterConfig[] = [
    {
      type: 'today',
      label: 'Hoy',
      icon: '📅',
      dateGenerator: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { dateFrom: today, dateTo: tomorrow };
      },
    },
    {
      type: 'week',
      label: 'Esta Semana',
      icon: '📆',
      dateGenerator: () => {
        const today = new Date();
        const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
        firstDay.setHours(0, 0, 0, 0);
        const lastDay = new Date(firstDay);
        lastDay.setDate(lastDay.getDate() + 7);
        return { dateFrom: firstDay, dateTo: lastDay };
      },
    },
    {
      type: 'month',
      label: 'Este Mes',
      icon: '🗓️',
      dateGenerator: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        return { dateFrom: firstDay, dateTo: lastDay };
      },
    },
    {
      type: 'quarter',
      label: 'Últimos 3 Meses',
      icon: '📊',
      dateGenerator: () => {
        const today = new Date();
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        return { dateFrom: threeMonthsAgo, dateTo: lastDay };
      },
    },
    {
      type: 'custom',
      label: 'Personalizado',
      icon: '🎯',
      dateGenerator: () => {
        // Para custom, las fechas se establecen por separado
        const today = new Date();
        return { dateFrom: today, dateTo: today };
      },
    },
  ];

  /**
   * Configuraciones para filtros de tipo
   */
  private readonly typeConfigs: TypeFilterConfig[] = [
    {
      type: 'all',
      label: 'Gastos e Ingresos',
      icon: '💰',
    },
    {
      type: 'expense',
      label: 'Solo Gastos',
      icon: '💸',
      movementType: 'EXPENSE',
    },
    {
      type: 'income',
      label: 'Solo Ingresos',
      icon: '💵',
      movementType: 'INCOME',
    },
  ];

  /**
   * Configuraciones para filtros de alcance
   */
  private readonly scopeConfigs: ScopeFilterConfig[] = [
    {
      type: 'all',
      label: 'Empresariales y Personales',
      icon: '🏢👤',
      description: 'Todos los movimientos',
    },
    {
      type: 'company',
      label: 'Solo Empresariales',
      icon: '🏢',
      description: 'Movimientos de la empresa',
    },
    {
      type: 'personal',
      label: 'Solo Personales',
      icon: '👤',
      description: 'Movimientos personales',
    },
  ];

  /**
   * Crear keyboard principal de Ver Movimientos
   */
  createMainMovementsKeyboard(
    currentFilters: MovementFilterState,
    _userRole: 'ADMIN' | 'OPERATOR',
  ): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Obtener estadísticas de filtros
    const stats = this.getFilterStats(currentFilters);

    // Botón de filtros con indicador
    const filtersLabel =
      stats.totalFiltersActive > 0 ? `🔍 Filtros (${stats.totalFiltersActive})` : '🔍 Filtros';

    keyboard
      .text(filtersLabel, 'movements_filters_main')
      .text('📊 Generar Reporte', 'movements_generate_report')
      .row();

    // Botón limpiar filtros solo si hay filtros activos
    if (stats.totalFiltersActive > 0) {
      keyboard
        .text('🔄 Limpiar Filtros', 'movements_clear_filters')
        .text('◀️ Menú Principal', 'main_menu')
        .row();
    } else {
      keyboard.text('◀️ Menú Principal', 'main_menu').row();
    }

    return keyboard;
  }

  /**
   * Crear keyboard principal de filtros
   */
  createFiltersMainKeyboard(options: FilterKeyboardOptions): InlineKeyboard {
    const { currentFilters, userRole, availableCompanies } = options;
    const keyboard = new InlineKeyboard();

    // Sección de período
    const periodIcon = currentFilters.period ? '✅' : '⭕';
    const periodText = currentFilters.period ? currentFilters.period.label : 'Sin filtrar';
    keyboard.text(`${periodIcon} 📅 Período - ${periodText}`, 'movements_period_select').row();

    // Sección de tipo
    const typeIcon = currentFilters.type ? '✅' : '⭕';
    const typeText = this.getTypeFilterLabel(currentFilters.type);
    keyboard.text(`${typeIcon} 💰 Tipo - ${typeText}`, 'movements_type_select').row();

    // Sección de categorías
    const categoriesIcon =
      currentFilters.categories && currentFilters.categories.length > 0 ? '✅' : '⭕';
    const categoriesText = this.getCategoriesFilterLabel(currentFilters.categories);
    keyboard
      .text(`${categoriesIcon} 📁 Categorías - ${categoriesText}`, 'movements_categories_select')
      .row();

    // Sección de alcance (solo para admins)
    if (userRole === 'ADMIN') {
      const scopeIcon = currentFilters.scope ? '✅' : '⭕';
      const scopeText = this.getScopeFilterLabel(currentFilters.scope);
      keyboard.text(`${scopeIcon} 🏢 Alcance - ${scopeText}`, 'movements_scope_select').row();

      // Sección de empresas (si hay múltiples)
      if (availableCompanies && availableCompanies.length > 1) {
        const companiesIcon =
          currentFilters.companies && currentFilters.companies.length > 0 ? '✅' : '⭕';
        const companiesText = this.getCompaniesFilterLabel(currentFilters.companies);
        keyboard
          .text(`${companiesIcon} 🏭 Empresas - ${companiesText}`, 'movements_companies_select')
          .row();
      }
    }

    // Botones de acción
    const stats = this.getFilterStats(currentFilters);
    if (stats.totalFiltersActive > 0) {
      keyboard.text('🔄 Limpiar Todo', 'movements_clear_all_filters').row();
    }

    keyboard.text('◀️ Ver Movimientos', 'main_movements');

    return keyboard;
  }

  /**
   * Crear keyboard para selección de período
   */
  createPeriodSelectionKeyboard(currentPeriod?: string): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    this.periodConfigs.forEach(config => {
      const isSelected = currentPeriod === config.type;
      const label = isSelected
        ? `✅ ${config.icon} ${config.label}`
        : `${config.icon} ${config.label}`;

      keyboard.text(label, `movements_period_${config.type}`).row();
    });

    keyboard.text('◀️ Volver a Filtros', 'movements_filters_main');

    return keyboard;
  }

  /**
   * Crear keyboard para selección de tipo
   */
  createTypeSelectionKeyboard(currentType?: string): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    this.typeConfigs.forEach(config => {
      const isSelected = currentType === config.type;
      const label = isSelected
        ? `✅ ${config.icon} ${config.label}`
        : `${config.icon} ${config.label}`;

      keyboard.text(label, `movements_type_${config.type}`).row();
    });

    keyboard.text('◀️ Volver a Filtros', 'movements_filters_main');

    return keyboard;
  }

  /**
   * Crear keyboard para selección de categorías
   */
  createCategoriesSelectionKeyboard(
    categories: SelectableCategory[],
    currentSelection: string[] = [],
  ): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Botón para seleccionar/deseleccionar todas
    const allSelected =
      categories.length > 0 && categories.every(c => currentSelection.includes(c.id));
    const selectAllLabel = allSelected ? '❌ Deseleccionar Todas' : '✅ Seleccionar Todas';
    keyboard.text(selectAllLabel, 'movements_categories_toggle_all').row();

    // Lista de categorías
    categories.forEach(category => {
      const isSelected = currentSelection.includes(category.id);
      const checkbox = isSelected ? '✅' : '⬜';
      const typeIcon = category.isPersonal ? '👤' : '🏢';
      const icon = category.icon || '📁';

      const label = `${checkbox} ${typeIcon} ${icon} ${category.name}`;
      keyboard.text(label, `movements_category_toggle_${category.id}`).row();
    });

    // Botones de acción
    if (currentSelection.length > 0) {
      keyboard
        .text(`✅ Aplicar (${currentSelection.length})`, 'movements_categories_apply')
        .text('🔄 Limpiar', 'movements_categories_clear')
        .row();
    }

    keyboard.text('◀️ Volver a Filtros', 'movements_filters_main');

    return keyboard;
  }

  /**
   * Crear keyboard para selección de alcance
   */
  createScopeSelectionKeyboard(currentScope?: string): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    this.scopeConfigs.forEach(config => {
      const isSelected = currentScope === config.type;
      const label = isSelected
        ? `✅ ${config.icon} ${config.label}`
        : `${config.icon} ${config.label}`;

      keyboard.text(label, `movements_scope_${config.type}`).row();
    });

    keyboard.text('◀️ Volver a Filtros', 'movements_filters_main');

    return keyboard;
  }

  /**
   * Crear keyboard para selección de empresas
   */
  createCompaniesSelectionKeyboard(
    companies: SelectableCompany[],
    currentSelection: string[] = [],
  ): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Botón para seleccionar/deseleccionar todas
    const allSelected =
      companies.length > 0 && companies.every(c => currentSelection.includes(c.id));
    const selectAllLabel = allSelected ? '❌ Deseleccionar Todas' : '✅ Seleccionar Todas';
    keyboard.text(selectAllLabel, 'movements_companies_toggle_all').row();

    // Lista de empresas
    companies.forEach(company => {
      const isSelected = currentSelection.includes(company.id);
      const checkbox = isSelected ? '✅' : '⬜';

      const label = `${checkbox} 🏭 ${company.name}`;
      keyboard.text(label, `movements_company_toggle_${company.id}`).row();
    });

    // Botones de acción
    if (currentSelection.length > 0) {
      keyboard
        .text(`✅ Aplicar (${currentSelection.length})`, 'movements_companies_apply')
        .text('🔄 Limpiar', 'movements_companies_clear')
        .row();
    }

    keyboard.text('◀️ Volver a Filtros', 'movements_filters_main');

    return keyboard;
  }

  /**
   * Obtener estadísticas de filtros activos
   */
  getFilterStats(filters: MovementFilterState): FilterStats {
    const badges: FilterBadge[] = [];
    let totalFiltersActive = 0;

    // Filtro de período
    if (filters.period) {
      badges.push({
        type: 'period',
        label: 'Período',
        value: filters.period.label,
        icon: '📅',
      });
      totalFiltersActive++;
    }

    // Filtro de tipo
    if (filters.type && filters.type !== 'all') {
      const typeConfig = this.typeConfigs.find(c => c.type === filters.type);
      if (typeConfig) {
        badges.push({
          type: 'type',
          label: 'Tipo',
          value: typeConfig.label,
          icon: typeConfig.icon,
        });
        totalFiltersActive++;
      }
    }

    // Filtro de categorías
    if (filters.categories && filters.categories.length > 0) {
      badges.push({
        type: 'categories',
        label: 'Categorías',
        value: `${filters.categories.length} seleccionadas`,
        icon: '📁',
      });
      totalFiltersActive++;
    }

    // Filtro de alcance
    if (filters.scope && filters.scope !== 'all') {
      const scopeConfig = this.scopeConfigs.find(c => c.type === filters.scope);
      if (scopeConfig) {
        badges.push({
          type: 'scope',
          label: 'Alcance',
          value: scopeConfig.label,
          icon: scopeConfig.icon,
        });
        totalFiltersActive++;
      }
    }

    // Filtro de empresas
    if (filters.companies && filters.companies.length > 0) {
      badges.push({
        type: 'companies',
        label: 'Empresas',
        value: `${filters.companies.length} seleccionadas`,
        icon: '🏭',
      });
      totalFiltersActive++;
    }

    // Generar resumen
    let summary = '';
    if (totalFiltersActive === 0) {
      summary = 'Sin filtros aplicados';
    } else {
      summary = `${totalFiltersActive} filtro${totalFiltersActive > 1 ? 's' : ''} activo${totalFiltersActive > 1 ? 's' : ''}`;
    }

    return {
      totalFiltersActive,
      badges,
      summary,
    };
  }

  /**
   * Generar etiqueta para botón de filtro
   */
  private getFilterButtonLabel(type: string, currentValue?: string): string {
    if (currentValue) {
      return `${
        type === 'period'
          ? 'Período'
          : type === 'type'
            ? 'Tipo'
            : type === 'categories'
              ? 'Categorías'
              : type === 'scope'
                ? 'Alcance'
                : 'Empresas'
      }: ${currentValue}`;
    }
    return type === 'period'
      ? 'Período'
      : type === 'type'
        ? 'Tipo'
        : type === 'categories'
          ? 'Categorías'
          : type === 'scope'
            ? 'Alcance'
            : 'Empresas';
  }

  /**
   * Obtener etiqueta para filtro de tipo
   */
  private getTypeFilterLabel(type?: string): string {
    if (!type || type === 'all') return 'Sin filtrar';
    const config = this.typeConfigs.find(c => c.type === type);
    return config?.label || 'Sin filtrar';
  }

  /**
   * Obtener etiqueta para filtro de categorías
   */
  private getCategoriesFilterLabel(categories?: string[]): string {
    if (!categories || categories.length === 0) return 'Sin filtrar';
    return `${categories.length} seleccionada${categories.length > 1 ? 's' : ''}`;
  }

  /**
   * Obtener etiqueta para filtro de alcance
   */
  private getScopeFilterLabel(scope?: string): string {
    if (!scope || scope === 'all') return 'Sin filtrar';
    const config = this.scopeConfigs.find(c => c.type === scope);
    return config?.label || 'Sin filtrar';
  }

  /**
   * Obtener etiqueta para filtro de empresas
   */
  private getCompaniesFilterLabel(companies?: string[]): string {
    if (!companies || companies.length === 0) return 'Sin filtrar';
    return `${companies.length} seleccionada${companies.length > 1 ? 's' : ''}`;
  }

  /**
   * Obtener configuraciones de período
   */
  getPeriodConfigs(): PeriodFilterConfig[] {
    return this.periodConfigs;
  }

  /**
   * Obtener configuraciones de tipo
   */
  getTypeConfigs(): TypeFilterConfig[] {
    return this.typeConfigs;
  }

  /**
   * Obtener configuraciones de alcance
   */
  getScopeConfigs(): ScopeFilterConfig[] {
    return this.scopeConfigs;
  }
}
