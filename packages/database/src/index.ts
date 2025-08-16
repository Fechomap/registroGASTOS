export { default as prisma } from './client';
export * from '@prisma/client';
export * from './repositories';
export type { UserWithCompany } from './repositories/user.repository';
export type { MovementWithRelations } from './repositories/movement.repository';
export type { CategoryWithRelations } from './repositories/category.repository';