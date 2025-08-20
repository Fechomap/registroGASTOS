import { User, Company, Prisma, UserRole } from '@prisma/client';
import prisma from '../client';

export type UserWithCompany = User & { company: Company };

export class UserRepository {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
  }

  async findByTelegramId(telegramId: string): Promise<UserWithCompany | null> {
    return prisma.user.findUnique({
      where: { telegramId },
      include: { company: true },
    });
  }

  async findByChatId(chatId: string): Promise<UserWithCompany | null> {
    return prisma.user.findUnique({
      where: { chatId },
      include: { company: true },
    });
  }

  async findByCompany(companyId: string, where?: Prisma.UserWhereInput): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        companyId,
        ...where,
      },
      include: { company: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAdmins(companyId: string): Promise<User[]> {
    return this.findByCompany(companyId, {
      role: UserRole.ADMIN,
      isActive: true,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
      include: { company: true },
    });
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    return this.update(id, { role });
  }

  async deactivate(id: string): Promise<User> {
    return this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<User> {
    return this.update(id, { isActive: true });
  }

  async delete(id: string): Promise<User> {
    // Eliminar relaciones que no tienen Cascade
    await prisma.movement.deleteMany({
      where: { userId: id },
    });

    await prisma.auditLog.deleteMany({
      where: { userId: id },
    });

    // Las demás relaciones tienen onDelete: Cascade y se eliminan automáticamente
    return prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Obtener todas las empresas a las que pertenece un usuario
   */
  async getUserCompanies(userId: string) {
    return prisma.userCompany.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        company: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Agregar usuario a una empresa (crear relación UserCompany)
   */
  async addUserToCompany(userId: string, companyId: string, role: UserRole = UserRole.OPERATOR) {
    // Importar permisos por defecto
    const { permissionsService } = await import('../services/permissions.service');
    const defaultPermissions = permissionsService.getDefaultPermissionsByRole(role);

    // Crear la relación UserCompany
    const userCompany = await prisma.userCompany.create({
      data: {
        userId,
        companyId,
        role,
      },
      include: {
        company: true,
        user: true,
      },
    });

    // Actualizar permisos con SQL directo
    await prisma.$executeRaw`
      UPDATE user_companies 
      SET permissions = ${JSON.stringify(defaultPermissions)}
      WHERE "userId" = ${userId} AND "companyId" = ${companyId}
    `;

    return userCompany;
  }

  /**
   * Actualizar permisos de un usuario en una empresa
   */
  async updateUserCompanyPermissions(
    userId: string,
    companyId: string,
    permissions: Record<string, unknown>,
  ) {
    return prisma.$executeRaw`
      UPDATE user_companies 
      SET permissions = ${JSON.stringify(permissions)}
      WHERE "userId" = ${userId} AND "companyId" = ${companyId}
    `;
  }

  /**
   * Obtener permisos específicos de un usuario en una empresa
   */
  async getUserCompanyPermissions(userId: string, companyId: string) {
    const result = await prisma.$queryRaw<{ permissions: string }[]>`
      SELECT permissions 
      FROM user_companies 
      WHERE "userId" = ${userId} AND "companyId" = ${companyId}
    `;

    if (!result.length || !result[0].permissions) {
      return null;
    }

    try {
      return typeof result[0].permissions === 'string'
        ? JSON.parse(result[0].permissions)
        : result[0].permissions;
    } catch {
      return null;
    }
  }
}

export const userRepository = new UserRepository();
