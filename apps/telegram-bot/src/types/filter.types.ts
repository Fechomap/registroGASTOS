import { MovementType } from '@financial-bot/database';

/**
 * Estado completo de filtros para movimientos
 */
export interface MovementFilterState {
  period?: PeriodFilter;
  type?: MovementTypeFilter;
  categories?: string[];
  scope?: ScopeFilter;
  companies?: string[];
  isActive: boolean;
}

/**
 * Filtro de período de tiempo
 */
export interface PeriodFilter {
  type: 'today' | 'week' | 'month' | 'quarter' | 'custom';
  dateFrom?: Date;
  dateTo?: Date;
  label: string;
}

/**
 * Filtro de tipo de movimiento
 */
export type MovementTypeFilter = 'all' | 'expense' | 'income';

/**
 * Filtro de alcance (empresarial/personal)
 */
export type ScopeFilter = 'all' | 'company' | 'personal';

/**
 * Configuración de filtro de período predefinido
 */
export interface PeriodFilterConfig {
  type: PeriodFilter['type'];
  label: string;
  icon: string;
  dateGenerator: () => { dateFrom: Date; dateTo: Date };
}

/**
 * Configuración de filtro de tipo
 */
export interface TypeFilterConfig {
  type: MovementTypeFilter;
  label: string;
  icon: string;
  movementType?: MovementType;
}

/**
 * Configuración de filtro de alcance
 */
export interface ScopeFilterConfig {
  type: ScopeFilter;
  label: string;
  icon: string;
  description: string;
}

/**
 * Categoría seleccionable para filtros
 */
export interface SelectableCategory {
  id: string;
  name: string;
  icon?: string;
  isPersonal: boolean;
  isSelected: boolean;
}

/**
 * Empresa seleccionable para filtros
 */
export interface SelectableCompany {
  id: string;
  name: string;
  isSelected: boolean;
}

/**
 * Contexto de navegación en filtros
 */
export interface FilterNavigationContext {
  currentSection: 'main' | 'period' | 'type' | 'categories' | 'scope' | 'companies';
  previousSection?: FilterNavigationContext['currentSection'];
  breadcrumb: string[];
}

/**
 * Resultado de aplicación de filtros
 */
export interface FilterApplicationResult {
  filtersApplied: number;
  summary: string;
  isEmpty: boolean;
}

/**
 * Opciones para el generador de keyboards de filtros
 */
export interface FilterKeyboardOptions {
  userRole: 'ADMIN' | 'OPERATOR';
  currentFilters: MovementFilterState;
  navigation: FilterNavigationContext;
  availableCategories: SelectableCategory[];
  availableCompanies?: SelectableCompany[];
}

/**
 * Badge de filtro activo para mostrar en UI
 */
export interface FilterBadge {
  type: keyof MovementFilterState;
  label: string;
  value: string;
  icon: string;
}

/**
 * Estadísticas de filtros aplicados
 */
export interface FilterStats {
  totalFiltersActive: number;
  badges: FilterBadge[];
  summary: string;
}
