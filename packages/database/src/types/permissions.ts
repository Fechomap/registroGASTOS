/**
 * Tipos para el sistema de permisos granulares
 */

export interface CompanyPermissions {
  canView: boolean;
  canEdit: boolean;
  canReport: boolean;
  canManageUsers: boolean;
}

export const DEFAULT_OPERATOR_PERMISSIONS: CompanyPermissions = {
  canView: true,
  canEdit: true, // Los operadores SOLO pueden crear gastos empresariales (no editar)
  canReport: false, // Operadores pueden generar reportes pero solo de sus propios movimientos
  canManageUsers: false,
};

export const DEFAULT_ADMIN_PERMISSIONS: CompanyPermissions = {
  canView: true,
  canEdit: true,
  canReport: true,
  canManageUsers: true,
};

export const DEFAULT_COMPANY_ADMIN_PERMISSIONS: CompanyPermissions = {
  canView: true,
  canEdit: true,
  canReport: true,
  canManageUsers: true,
};

export const DEFAULT_ORGANIZATION_ADMIN_PERMISSIONS: CompanyPermissions = {
  canView: true,
  canEdit: true,
  canReport: true,
  canManageUsers: true,
};

export const SUPER_ADMIN_PERMISSIONS: CompanyPermissions = {
  canView: true,
  canEdit: true,
  canReport: true,
  canManageUsers: true,
};

/**
 * Jerarquía de roles del sistema
 */
export enum SystemRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

/**
 * Permisos específicos para diferentes acciones
 */
export enum Permission {
  VIEW_MOVEMENTS = 'canView',
  EDIT_MOVEMENTS = 'canEdit',
  GENERATE_REPORTS = 'canReport',
  MANAGE_USERS = 'canManageUsers',
}

/**
 * Obtener permisos por defecto según el rol
 */
export function getDefaultPermissionsByRole(role: SystemRole): CompanyPermissions {
  switch (role) {
    case SystemRole.SUPER_ADMIN:
      return SUPER_ADMIN_PERMISSIONS;
    case SystemRole.ORGANIZATION_ADMIN:
      return DEFAULT_ORGANIZATION_ADMIN_PERMISSIONS;
    case SystemRole.COMPANY_ADMIN:
      return DEFAULT_COMPANY_ADMIN_PERMISSIONS;
    case SystemRole.ADMIN:
      return DEFAULT_ADMIN_PERMISSIONS;
    case SystemRole.OPERATOR:
      return DEFAULT_OPERATOR_PERMISSIONS;
    default:
      return DEFAULT_OPERATOR_PERMISSIONS;
  }
}

/**
 * Verificar si un rol puede gestionar otro rol
 */
export function canManageRole(managerRole: SystemRole, targetRole: SystemRole): boolean {
  const roleHierarchy = {
    [SystemRole.SUPER_ADMIN]: 5,
    [SystemRole.ORGANIZATION_ADMIN]: 4,
    [SystemRole.COMPANY_ADMIN]: 3,
    [SystemRole.ADMIN]: 2,
    [SystemRole.OPERATOR]: 1,
  };

  return roleHierarchy[managerRole] > roleHierarchy[targetRole];
}

/**
 * Obtener roles que puede asignar un rol específico
 */
export function getAssignableRoles(managerRole: SystemRole): SystemRole[] {
  switch (managerRole) {
    case SystemRole.SUPER_ADMIN:
      return [
        SystemRole.ORGANIZATION_ADMIN,
        SystemRole.COMPANY_ADMIN,
        SystemRole.ADMIN,
        SystemRole.OPERATOR,
      ];
    case SystemRole.ORGANIZATION_ADMIN:
      return [SystemRole.COMPANY_ADMIN, SystemRole.ADMIN, SystemRole.OPERATOR];
    case SystemRole.COMPANY_ADMIN:
      return [SystemRole.ADMIN, SystemRole.OPERATOR];
    case SystemRole.ADMIN:
      return [SystemRole.OPERATOR];
    case SystemRole.OPERATOR:
      return [];
    default:
      return [];
  }
}

/**
 * Niveles de acceso a reportes
 */
export enum ReportScope {
  OWN_MOVEMENTS = 'own', // Solo sus propios movimientos
  COMPANY_MOVEMENTS = 'company', // Movimientos de empresas asignadas
  ALL_MOVEMENTS = 'all', // Todos los movimientos (Super Admin)
}

/**
 * Resultado de verificación de permisos
 */
export interface PermissionCheck {
  hasPermission: boolean;
  reason?: string;
  allowedCompanies?: string[];
}
