import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear empresa de ejemplo
  const demoCompany = await prisma.company.upsert({
    where: { id: 'demo-company' },
    update: {},
    create: {
      id: 'demo-company',
      name: 'Empresa Demo',
      email: 'admin@empresademo.com',
      phone: '+52 55 1234 5678',
      settings: {
        currency: 'MXN',
        timezone: 'America/Mexico_City',
        notifications: {
          instant: true,
          daily: true,
        },
      },
    },
  });

  console.log('✅ Empresa demo creada:', demoCompany.name);

  // Crear categorías básicas
  const categories = [
    { name: 'Alimentación', icon: '🍽️', color: '#FF6B6B' },
    { name: 'Transporte', icon: '🚗', color: '#4ECDC4' },
    { name: 'Oficina', icon: '🏢', color: '#45B7D1' },
    { name: 'Marketing', icon: '📢', color: '#96CEB4' },
    { name: 'Tecnología', icon: '💻', color: '#FFEAA7' },
    { name: 'Servicios', icon: '🔧', color: '#DDA0DD' },
  ];

  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: {
        companyId_name_parentId: {
          companyId: demoCompany.id,
          name: category.name,
          parentId: null,
        },
      },
      update: {},
      create: {
        companyId: demoCompany.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        order: index,
      },
    });
  }

  console.log('✅ Categorías creadas');

  // Crear subcategorías para Alimentación
  const alimentacionCategory = await prisma.category.findFirst({
    where: {
      companyId: demoCompany.id,
      name: 'Alimentación',
    },
  });

  if (alimentacionCategory) {
    const subcategories = [
      { name: 'Restaurantes', icon: '🍽️' },
      { name: 'Cafeterías', icon: '☕' },
      { name: 'Supermercado', icon: '🛒' },
    ];

    for (const [index, subcategory] of subcategories.entries()) {
      await prisma.category.upsert({
        where: {
          companyId_name_parentId: {
            companyId: demoCompany.id,
            name: subcategory.name,
            parentId: alimentacionCategory.id,
          },
        },
        update: {},
        create: {
          companyId: demoCompany.id,
          name: subcategory.name,
          icon: subcategory.icon,
          parentId: alimentacionCategory.id,
          order: index,
        },
      });
    }

    console.log('✅ Subcategorías de alimentación creadas');
  }

  // Crear usuario administrador de ejemplo
  const adminUser = await prisma.user.upsert({
    where: { telegramId: 'demo-admin' },
    update: {},
    create: {
      telegramId: 'demo-admin',
      chatId: 'demo-admin-chat',
      companyId: demoCompany.id,
      firstName: 'Admin',
      lastName: 'Demo',
      username: 'admin_demo',
      role: UserRole.ADMIN,
    },
  });

  console.log('✅ Usuario administrador creado:', adminUser.firstName);

  // Crear usuario operador de ejemplo
  const operatorUser = await prisma.user.upsert({
    where: { telegramId: 'demo-operator' },
    update: {},
    create: {
      telegramId: 'demo-operator',
      chatId: 'demo-operator-chat',
      companyId: demoCompany.id,
      firstName: 'Operador',
      lastName: 'Demo',
      username: 'operator_demo',
      role: UserRole.OPERATOR,
    },
  });

  console.log('✅ Usuario operador creado:', operatorUser.firstName);

  console.log('🎉 Seed completado exitosamente');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error en seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });