import { UserRole } from '@prisma/client';
import {
  CompanyPermissions,
  DEFAULT_OPERATOR_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_COMPANY_ADMIN_PERMISSIONS,
  DEFAULT_ORGANIZATION_ADMIN_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
  Permission,
  PermissionCheck,
  ReportScope,
  SystemRole,
  getDefaultPermissionsByRole,
  canManageRole,
  getAssignableRoles,
} from '../types/permissions';
import { userRepository } from '../repositories/user.repository';
import { systemAdminRepository } from '../repositories/system-admin.repository';

export class PermissionsService {
  /**
   * Verificar si un usuario es Super Admin
   */
  async isSuperAdmin(telegramId: string): Promise<boolean> {
    try {
      const superAdmin = await systemAdminRepository.findByTelegramId(telegramId);
      return !!superAdmin;
    } catch {
      return false;
    }
  }

  /**
   * Obtener permisos de un usuario en una empresa específica
   */
  async getUserCompanyPermissions(
    userId: string,
    companyId: string,
  ): Promise<CompanyPermissions | null> {
    try {
      const userCompanies = await userRepository.getUserCompanies(userId);
      const userCompany = userCompanies.find(uc => uc.companyId === companyId);

      if (!userCompany) {
        return null;
      }

      // Si es super admin, tiene todos los permisos
      const user = await userRepository.findById(userId);
      if (user && (await this.isSuperAdmin(user.telegramId))) {
        return SUPER_ADMIN_PERMISSIONS;
      }

      // Parsear permisos desde JSON
      const permissions = userCompany.permissions as unknown as CompanyPermissions;
      return {
        canView: permissions.canView ?? true,
        canEdit: permissions.canEdit ?? false,
        canReport: permissions.canReport ?? false,
        canManageUsers: permissions.canManageUsers ?? false,
      };
    } catch (error) {
      console.error('Error getting user company permissions:', error);
      return null;
    }
  }

  /**
   * Verificar si un usuario tiene un permiso específico en una empresa
   */
  async hasPermission(
    userId: string,
    companyId: string,
    permission: Permission,
  ): Promise<PermissionCheck> {
    try {
      const permissions = await this.getUserCompanyPermissions(userId, companyId);

      if (!permissions) {
        return {
          hasPermission: false,
          reason: 'Usuario no pertenece a la empresa',
        };
      }

      const hasPermission = permissions[permission] === true;

      return {
        hasPermission,
        reason: hasPermission ? undefined : `Sin permiso: ${permission}`,
      };
    } catch (error) {
      return {
        hasPermission: false,
        reason: 'Error verificando permisos',
      };
    }
  }

  /**
   * Obtener todas las empresas a las que un usuario tiene acceso
   */
  async getUserAccessibleCompanies(userId: string): Promise<string[]> {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        return [];
      }

      // Si es super admin, tiene acceso a todas las empresas
      if (await this.isSuperAdmin(user.telegramId)) {
        // TODO: Retornar todas las empresas del sistema
        const userCompanies = await userRepository.getUserCompanies(userId);
        return userCompanies.map(uc => uc.companyId);
      }

      // Obtener empresas donde tiene permiso de ver
      const userCompanies = await userRepository.getUserCompanies(userId);
      const accessibleCompanies: string[] = [];

      for (const userCompany of userCompanies) {
        const permissions = userCompany.permissions as unknown as CompanyPermissions;
        if (permissions.canView === true) {
          accessibleCompanies.push(userCompany.companyId);
        }
      }

      return accessibleCompanies;
    } catch (error) {
      console.error('Error getting user accessible companies:', error);
      return [];
    }
  }

  /**
   * Determinar el alcance de reportes que puede generar un usuario
   */
  async getUserReportScope(userId: string): Promise<ReportScope> {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        return ReportScope.OWN_MOVEMENTS;
      }

      // Si es super admin, puede ver todo
      if (await this.isSuperAdmin(user.telegramId)) {
        return ReportScope.ALL_MOVEMENTS;
      }

      // Verificar si tiene permisos de reporte en alguna empresa
      const userCompanies = await userRepository.getUserCompanies(userId);
      const hasReportPermissions = userCompanies.some(uc => {
        const permissions = uc.permissions as unknown as CompanyPermissions;
        return permissions.canReport === true;
      });

      return hasReportPermissions ? ReportScope.COMPANY_MOVEMENTS : ReportScope.OWN_MOVEMENTS;
    } catch (error) {
      console.error('Error determining user report scope:', error);
      return ReportScope.OWN_MOVEMENTS;
    }
  }

  /**
   * Actualizar permisos de un usuario en una empresa
   */
  async updateUserCompanyPermissions(
    adminUserId: string,
    targetUserId: string,
    companyId: string,
    newPermissions: Partial<CompanyPermissions>,
  ): Promise<boolean> {
    try {
      // Verificar que el admin tenga permisos para gestionar usuarios
      const adminCheck = await this.hasPermission(adminUserId, companyId, Permission.MANAGE_USERS);

      if (!adminCheck.hasPermission) {
        return false;
      }

      // Obtener permisos actuales
      const currentPermissions = await this.getUserCompanyPermissions(targetUserId, companyId);
      if (!currentPermissions) {
        return false;
      }

      // Fusionar permisos
      const updatedPermissions = {
        ...currentPermissions,
        ...newPermissions,
      };

      // Actualizar en base de datos
      await userRepository.updateUserCompanyPermissions(
        targetUserId,
        companyId,
        updatedPermissions,
      );

      return true;
    } catch (error) {
      console.error('Error updating user company permissions:', error);
      return false;
    }
  }

  /**
   * Obtener permisos por defecto según el rol
   */
  getDefaultPermissionsByRole(role: UserRole): CompanyPermissions {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return SUPER_ADMIN_PERMISSIONS;
      case UserRole.ORGANIZATION_ADMIN:
        return DEFAULT_ORGANIZATION_ADMIN_PERMISSIONS;
      case UserRole.COMPANY_ADMIN:
        return DEFAULT_COMPANY_ADMIN_PERMISSIONS;
      case UserRole.ADMIN:
        return DEFAULT_ADMIN_PERMISSIONS;
      case UserRole.OPERATOR:
        return DEFAULT_OPERATOR_PERMISSIONS;
      default:
        return DEFAULT_OPERATOR_PERMISSIONS;
    }
  }

  /**
   * Convertir UserRole a SystemRole
   */
  private userRoleToSystemRole(role: UserRole): SystemRole {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return SystemRole.SUPER_ADMIN;
      case UserRole.ORGANIZATION_ADMIN:
        return SystemRole.ORGANIZATION_ADMIN;
      case UserRole.COMPANY_ADMIN:
        return SystemRole.COMPANY_ADMIN;
      case UserRole.ADMIN:
        return SystemRole.ADMIN;
      case UserRole.OPERATOR:
        return SystemRole.OPERATOR;
      default:
        return SystemRole.OPERATOR;
    }
  }

  /**
   * Verificar si un usuario puede gestionar a otro usuario
   */
  async canUserManageUser(managerId: string, targetUserId: string): Promise<boolean> {
    try {
      const manager = await userRepository.findById(managerId);
      const target = await userRepository.findById(targetUserId);

      if (!manager || !target) {
        return false;
      }

      // Super admin puede gestionar a cualquiera
      if (await this.isSuperAdmin(manager.telegramId)) {
        return true;
      }

      const managerRole = this.userRoleToSystemRole(manager.role);
      const targetRole = this.userRoleToSystemRole(target.role);

      return canManageRole(managerRole, targetRole);
    } catch (error) {
      console.error('Error checking user management permissions:', error);
      return false;
    }
  }

  /**
   * Obtener roles que un usuario puede asignar
   */
  async getAssignableRolesByUser(userId: string): Promise<SystemRole[]> {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        return [];
      }

      // Super admin puede asignar cualquier rol
      if (await this.isSuperAdmin(user.telegramId)) {
        return getAssignableRoles(SystemRole.SUPER_ADMIN);
      }

      const userRole = this.userRoleToSystemRole(user.role);
      return getAssignableRoles(userRole);
    } catch (error) {
      console.error('Error getting assignable roles:', error);
      return [];
    }
  }

  /**
   * Verificar si un usuario tiene al menos nivel de administrador
   */
  isAdminLevel(role: UserRole): boolean {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.ORGANIZATION_ADMIN,
      UserRole.COMPANY_ADMIN,
      UserRole.ADMIN,
    ].includes(role);
  }
}

export const permissionsService = new PermissionsService();
