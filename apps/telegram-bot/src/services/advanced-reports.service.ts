import {
  movementRepository,
  personalMovementRepository,
  userRepository,
  companyRepository,
  permissionsService,
  MovementWithRelations,
  PersonalMovementWithRelations,
  Permission,
  ReportScope,
} from '@financial-bot/database';
import { MovementFilterBuilder } from '@financial-bot/reports';
import { InlineKeyboard } from 'grammy';

export interface AdvancedReportFilters {
  period: 'today' | 'week' | 'month' | 'custom';
  companyIds?: string[]; // Empresas específicas para el reporte
  userIds?: string[]; // Usuarios específicos
  categoryId?: string;
  type: 'EXPENSE' | 'INCOME' | 'ALL';
  scope: 'COMPANY' | 'PERSONAL' | 'ALL';
  includeSubordinates?: boolean; // Para admins que ven sus operadores
}

export interface AdvancedReportSummary {
  totalMovements: number;
  totalExpenses: number;
  totalIncomes: number;
  balance: number;
  appliedFilters: AdvancedReportFilters;
  companiesSummary: Array<{
    companyId: string;
    companyName: string;
    movements: number;
    expenses: number;
    incomes: number;
  }>;
  usersSummary: Array<{
    userId: string;
    userName: string;
    movements: number;
    expenses: number;
    incomes: number;
  }>;
}

export class AdvancedReportsService {
  /**
   * Generar reporte respetando permisos del usuario
   */
  async generateReport(
    userId: string,
    filters: AdvancedReportFilters,
  ): Promise<AdvancedReportSummary> {
    // Determinar el alcance de reportes del usuario
    const reportScope = await permissionsService.getUserReportScope(userId);

    // Verificar si es Super Admin
    const user = await userRepository.findById(userId);
    const isSuperAdmin = user ? await permissionsService.isSuperAdmin(user.telegramId) : false;

    // Obtener empresas según el tipo de usuario
    let targetCompanies: string[];

    if (isSuperAdmin && reportScope === ReportScope.ALL_MOVEMENTS) {
      // Super Admin puede ver TODAS las empresas del sistema
      const allCompanies = await companyRepository.findApprovedCompanies();
      targetCompanies = allCompanies.map(company => company.id);

      // Si se especifican empresas en filtros, usar esas (sin restricción para Super Admin)
      if (filters.companyIds && filters.companyIds.length > 0) {
        targetCompanies = filters.companyIds;
      }
    } else {
      // Usuarios normales: solo empresas accesibles
      const accessibleCompanies = await permissionsService.getUserAccessibleCompanies(userId);
      targetCompanies = accessibleCompanies;

      // Filtrar empresas según permisos
      if (filters.companyIds && filters.companyIds.length > 0) {
        targetCompanies = filters.companyIds.filter(id => accessibleCompanies.includes(id));
      }
    }

    let allMovements: (MovementWithRelations | PersonalMovementWithRelations)[] = [];
    const companiesSummary: AdvancedReportSummary['companiesSummary'] = [];
    const usersSummary: AdvancedReportSummary['usersSummary'] = [];

    // Procesar según el scope del usuario
    switch (reportScope) {
      case ReportScope.ALL_MOVEMENTS:
        // Super Admin - puede ver todo
        allMovements = await this.getAllMovements(targetCompanies, filters);
        break;

      case ReportScope.COMPANY_MOVEMENTS:
        // Admin con permisos de reporte - solo empresas asignadas
        allMovements = await this.getCompanyMovements(userId, targetCompanies, filters);
        break;

      case ReportScope.OWN_MOVEMENTS:
      default:
        // Operador - solo movimientos propios (personales y empresariales)
        allMovements = await this.getOwnMovements(userId, targetCompanies, filters);
        break;
    }

    // Generar resúmenes por empresa y usuario
    if (reportScope !== ReportScope.OWN_MOVEMENTS) {
      for (const companyId of targetCompanies) {
        const companyMovements = allMovements.filter(
          m => 'companyId' in m && m.companyId === companyId,
        );

        if (companyMovements.length > 0) {
          const company = await this.getCompanyInfo(companyId);
          companiesSummary.push({
            companyId,
            companyName: company?.name || 'Empresa',
            movements: companyMovements.length,
            expenses: companyMovements
              .filter(m => m.type === 'EXPENSE')
              .reduce((sum, m) => sum + Number(m.amount), 0),
            incomes: companyMovements
              .filter(m => m.type === 'INCOME')
              .reduce((sum, m) => sum + Number(m.amount), 0),
          });
        }
      }
    }

    // Calcular totales generales
    const expenses = allMovements.filter(m => m.type === 'EXPENSE');
    const incomes = allMovements.filter(m => m.type === 'INCOME');

    const totalExpenses = expenses.reduce((sum, m) => sum + Number(m.amount), 0);
    const totalIncomes = incomes.reduce((sum, m) => sum + Number(m.amount), 0);

    return {
      totalMovements: allMovements.length,
      totalExpenses,
      totalIncomes,
      balance: totalIncomes - totalExpenses,
      appliedFilters: filters,
      companiesSummary,
      usersSummary,
    };
  }

  /**
   * Crear teclado de reportes según permisos del usuario
   */
  async createReportsKeyboard(
    userId: string,
    filters: AdvancedReportFilters,
  ): Promise<InlineKeyboard> {
    const keyboard = new InlineKeyboard();
    const reportScope = await permissionsService.getUserReportScope(userId);

    // Filtros de período (todos los usuarios)
    keyboard
      .text(filters.period === 'today' ? '📅 Hoy ✓' : '📅 Hoy', 'report_period_today')
      .text(filters.period === 'week' ? '📅 Semana ✓' : '📅 Semana', 'report_period_week')
      .row()
      .text(filters.period === 'month' ? '📅 Mes ✓' : '📅 Mes', 'report_period_month')
      .text('📅 Personalizado', 'report_period_custom')
      .row();

    // Filtros de tipo (todos los usuarios)
    keyboard
      .text(filters.type === 'EXPENSE' ? '💸 Gastos ✓' : '💸 Gastos', 'report_type_expense')
      .text(filters.type === 'INCOME' ? '💰 Ingresos ✓' : '💰 Ingresos', 'report_type_income')
      .row();

    // Filtros avanzados según permisos
    if (reportScope === ReportScope.ALL_MOVEMENTS) {
      // Super Admin - todas las opciones
      keyboard
        .text('🏢 Seleccionar Empresas', 'report_select_companies')
        .text('👥 Seleccionar Usuarios', 'report_select_users')
        .row()
        .text(
          filters.scope === 'COMPANY' ? '🏢 Solo Empresas ✓' : '🏢 Solo Empresas',
          'report_scope_company',
        )
        .text(
          filters.scope === 'PERSONAL' ? '👤 Solo Personal ✓' : '👤 Solo Personal',
          'report_scope_personal',
        )
        .row();
    } else if (reportScope === ReportScope.COMPANY_MOVEMENTS) {
      // Admin - filtros de sus empresas
      keyboard
        .text('🏢 Mis Empresas', 'report_my_companies')
        .text(
          filters.scope === 'COMPANY' ? '🏢 Empresarial ✓' : '🏢 Empresarial',
          'report_scope_company',
        )
        .row();
    } else if (reportScope === ReportScope.OWN_MOVEMENTS) {
      // Operador - solo opciones básicas
      keyboard.text('📋 Categorías', 'report_categories').row();
    }

    // Botones de generación
    keyboard
      .text('📊 Generar Excel', 'report_generate_excel')
      .text('📄 Generar PDF', 'report_generate_pdf')
      .row()
      .text('🔄 Actualizar', 'report_refresh')
      .text('◀️ Menú Principal', 'main_menu');

    return keyboard;
  }

  /**
   * Verificar si un usuario puede generar reportes de una empresa
   */
  async canGenerateReports(userId: string, companyId: string): Promise<boolean> {
    const user = await userRepository.findById(userId);
    if (!user) return false;

    // Super Admin puede todo
    if (await permissionsService.isSuperAdmin(user.telegramId)) {
      return true;
    }

    // Verificar permiso específico de reportes
    const permission = await permissionsService.hasPermission(
      userId,
      companyId,
      Permission.GENERATE_REPORTS,
    );

    return permission.hasPermission;
  }

  /**
   * Obtener todas las empresas disponibles para reportes del usuario
   */
  async getAvailableCompaniesForReports(
    userId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const user = await userRepository.findById(userId);
    const isSuperAdmin = user ? await permissionsService.isSuperAdmin(user.telegramId) : false;

    let companiesWithReports: Array<{ id: string; name: string }> = [];

    if (isSuperAdmin) {
      // Super Admin puede ver todas las empresas aprobadas
      const allCompanies = await companyRepository.findApprovedCompanies();
      companiesWithReports = allCompanies.map(company => ({
        id: company.id,
        name: company.name,
      }));
    } else {
      // Usuarios normales: solo empresas con permisos de reporte
      const accessibleCompanies = await permissionsService.getUserAccessibleCompanies(userId);

      for (const companyId of accessibleCompanies) {
        if (await this.canGenerateReports(userId, companyId)) {
          const company = await this.getCompanyInfo(companyId);
          if (company) {
            companiesWithReports.push({
              id: companyId,
              name: company.name,
            });
          }
        }
      }
    }

    return companiesWithReports;
  }

  // Métodos privados de ayuda
  private async getAllMovements(
    companyIds: string[],
    filters: AdvancedReportFilters,
  ): Promise<(MovementWithRelations | PersonalMovementWithRelations)[]> {
    const allMovements: (MovementWithRelations | PersonalMovementWithRelations)[] = [];

    // Movimientos empresariales
    if (filters.scope === 'COMPANY' || filters.scope === 'ALL') {
      for (const companyId of companyIds) {
        const filterBuilder = new MovementFilterBuilder(companyId);
        this.applyFilters(filterBuilder, filters);
        const companyMovements = await movementRepository.findMany(filterBuilder.build());
        allMovements.push(...companyMovements);
      }
    }

    // Movimientos personales (TODO: implementar según necesidades)
    if (filters.scope === 'PERSONAL' || filters.scope === 'ALL') {
      // Lógica para movimientos personales de múltiples usuarios
    }

    return allMovements;
  }

  private async getCompanyMovements(
    userId: string,
    companyIds: string[],
    filters: AdvancedReportFilters,
  ): Promise<(MovementWithRelations | PersonalMovementWithRelations)[]> {
    const allMovements: (MovementWithRelations | PersonalMovementWithRelations)[] = [];

    for (const companyId of companyIds) {
      if (await this.canGenerateReports(userId, companyId)) {
        const filterBuilder = new MovementFilterBuilder(companyId);
        this.applyFilters(filterBuilder, filters);
        const companyMovements = await movementRepository.findMany(filterBuilder.build());
        allMovements.push(...companyMovements);
      }
    }

    return allMovements;
  }

  private async getOwnMovements(
    userId: string,
    companyIds: string[],
    filters: AdvancedReportFilters,
  ): Promise<(MovementWithRelations | PersonalMovementWithRelations)[]> {
    const allMovements: (MovementWithRelations | PersonalMovementWithRelations)[] = [];

    // Movimientos empresariales del usuario (solo los que él registró)
    if (filters.scope === 'COMPANY' || filters.scope === 'ALL') {
      for (const companyId of companyIds) {
        const filterBuilder = new MovementFilterBuilder(companyId);
        this.applyFilters(filterBuilder, filters);

        // CRUCIAL: Filtrar solo por movimientos del usuario actual
        filterBuilder.byUser(userId);

        const userCompanyMovements = await movementRepository.findMany(filterBuilder.build());
        allMovements.push(...userCompanyMovements);
      }
    }

    // Movimientos personales del usuario
    if (filters.scope === 'PERSONAL' || filters.scope === 'ALL') {
      const personalFilters = {
        type: filters.type !== 'ALL' ? filters.type : undefined,
        // TODO: Agregar filtros de fecha según período
      };
      const personalMovements = await personalMovementRepository.findByUser(
        userId,
        personalFilters,
      );
      allMovements.push(...personalMovements);
    }

    return allMovements;
  }

  /**
   * Obtener movimientos filtrados para exportación (Excel/PDF)
   * Respeta permisos del usuario
   */
  async getMovementsForExport(
    userId: string,
    filters: AdvancedReportFilters,
  ): Promise<MovementWithRelations[]> {
    const reportScope = await permissionsService.getUserReportScope(userId);
    const user = await userRepository.findById(userId);
    const isSuperAdmin = user ? await permissionsService.isSuperAdmin(user.telegramId) : false;

    let targetCompanies: string[];

    if (isSuperAdmin && reportScope === ReportScope.ALL_MOVEMENTS) {
      const allCompanies = await companyRepository.findApprovedCompanies();
      targetCompanies = allCompanies.map(company => company.id);
      if (filters.companyIds && filters.companyIds.length > 0) {
        targetCompanies = filters.companyIds;
      }
    } else {
      const accessibleCompanies = await permissionsService.getUserAccessibleCompanies(userId);
      targetCompanies = accessibleCompanies;
      if (filters.companyIds && filters.companyIds.length > 0) {
        targetCompanies = filters.companyIds.filter(id => accessibleCompanies.includes(id));
      }
    }

    // Obtener solo movimientos empresariales (no personales para Excel/PDF)
    let allMovements: MovementWithRelations[] = [];

    switch (reportScope) {
      case ReportScope.ALL_MOVEMENTS:
        allMovements = await this.getAllCompanyMovements(targetCompanies, filters);
        break;
      case ReportScope.COMPANY_MOVEMENTS:
        allMovements = await this.getCompanyMovementsOnly(userId, targetCompanies, filters);
        break;
      case ReportScope.OWN_MOVEMENTS:
      default:
        allMovements = await this.getOwnCompanyMovements(userId, targetCompanies, filters);
        break;
    }

    return allMovements;
  }

  private async getAllCompanyMovements(
    companyIds: string[],
    filters: AdvancedReportFilters,
  ): Promise<MovementWithRelations[]> {
    const allMovements: MovementWithRelations[] = [];

    for (const companyId of companyIds) {
      const filterBuilder = new MovementFilterBuilder(companyId);
      this.applyFilters(filterBuilder, filters);
      const companyMovements = await movementRepository.findMany(filterBuilder.build());
      allMovements.push(...companyMovements);
    }

    return allMovements;
  }

  private async getCompanyMovementsOnly(
    userId: string,
    companyIds: string[],
    filters: AdvancedReportFilters,
  ): Promise<MovementWithRelations[]> {
    const allMovements: MovementWithRelations[] = [];

    for (const companyId of companyIds) {
      if (await this.canGenerateReports(userId, companyId)) {
        const filterBuilder = new MovementFilterBuilder(companyId);
        this.applyFilters(filterBuilder, filters);
        const companyMovements = await movementRepository.findMany(filterBuilder.build());
        allMovements.push(...companyMovements);
      }
    }

    return allMovements;
  }

  private async getOwnCompanyMovements(
    userId: string,
    companyIds: string[],
    filters: AdvancedReportFilters,
  ): Promise<MovementWithRelations[]> {
    const allMovements: MovementWithRelations[] = [];

    for (const companyId of companyIds) {
      const filterBuilder = new MovementFilterBuilder(companyId);
      this.applyFilters(filterBuilder, filters);

      // CRÍTICO: Filtrar solo por movimientos del usuario actual
      filterBuilder.byUser(userId);

      const userCompanyMovements = await movementRepository.findMany(filterBuilder.build());
      allMovements.push(...userCompanyMovements);
    }

    return allMovements;
  }

  private applyFilters(filterBuilder: MovementFilterBuilder, filters: AdvancedReportFilters) {
    switch (filters.period) {
      case 'today':
        filterBuilder.today();
        break;
      case 'week':
        filterBuilder.thisWeek();
        break;
      case 'month':
        filterBuilder.thisMonth();
        break;
    }

    if (filters.categoryId) {
      filterBuilder.byCategory(filters.categoryId);
    }

    if (filters.userIds && filters.userIds.length > 0) {
      // TODO: Implementar filtro por múltiples usuarios
    }

    if (filters.type !== 'ALL') {
      filterBuilder.byType(filters.type as 'EXPENSE' | 'INCOME');
    }
  }

  private async getCompanyInfo(companyId: string) {
    try {
      const company = await companyRepository.findById(companyId);
      return company;
    } catch {
      return null;
    }
  }
}

export const advancedReportsService = new AdvancedReportsService();
