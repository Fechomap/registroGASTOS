# 📋 COMANDOS COMPLETOS - Financial Bot Multi-Tenant

**Fecha**: 16 de Enero 2025  
**Estado**: Lista completa de comandos implementados

---

## 🎯 ÍNDICE RÁPIDO

1. [Comandos de Super Admin (Sistema)](#comandos-de-super-admin-sistema)
2. [Comandos Públicos (Sin registro)](#comandos-públicos-sin-registro)
3. [Comandos Básicos (Todos los usuarios)](#comandos-básicos-todos-los-usuarios)
4. [Comandos de Administrador (Solo admins)](#comandos-de-administrador-solo-admins)
5. [Comandos de Operador (Solo operadores)](#comandos-de-operador-solo-operadores)
6. [Sistema de Menús Interactivos](#sistema-de-menús-interactivos)
7. [Flujos de Usuario Paso a Paso](#flujos-de-usuario-paso-a-paso)

---

## 🔴 COMANDOS DE SUPER ADMIN (SISTEMA)

**Nota**: Solo para gestionar el sistema multi-tenant completo

### `/setup_super_admin`

- **Función**: Configurar primer super administrador del sistema
- **Quién**: Solo funciona si NO hay super admins existentes
- **Resultado**: Te convierte en SystemAdmin
- **Ejemplo**:

  ```
  /setup_super_admin

  ✅ ¡Super Administrador Configurado!
  Ahora puedes aprobar empresas con /admin_companies
  ```

### `/admin_companies`

- **Función**: Ver todas las empresas pendientes de aprobación
- **Quién**: Solo super admins
- **Resultado**: Lista con botones para aprobar/rechazar
- **Ejemplo**:

  ```
  📋 Empresas Pendientes de Aprobación:

  🏢 Mi Empresa SA
  📧 admin@miempresa.com
  👤 Solicitado por: Juan Pérez
  📅 15/01/2025

  [✅ Aprobar] [❌ Rechazar]
  ```

### `/approve_company [company_id]`

- **Función**: Aprobar empresa y activar sistema
- **Quién**: Solo super admins
- **Resultado**: Empresa APPROVED + usuario admin creado + categorías
- **Ejemplo**:

  ```
  /approve_company comp_123abc

  ✅ ¡Empresa Aprobada!
  - Usuario administrador creado
  - Categorías por defecto agregadas
  - Notificación enviada al solicitante
  ```

### `/reject_company [company_id] [razón]`

- **Función**: Rechazar empresa con razón
- **Quién**: Solo super admins
- **Resultado**: Empresa REJECTED + notificación
- **Ejemplo**:

  ```
  /reject_company comp_123abc Información incompleta

  ❌ Empresa Rechazada
  Razón: Información incompleta
  Notificación enviada al solicitante
  ```

---

## 🟡 COMANDOS PÚBLICOS (SIN REGISTRO)

**Nota**: Funcionan sin estar registrado en ninguna empresa

### `/start`

- **Función**: Comando de inicio inteligente
- **Quién**: Cualquier usuario
- **Resultado**: Redirige según estado del usuario
- **Flujo**:
  ```
  SI es super admin → Menú de super admin
  SI tiene empresa aprobada → /menu principal
  SI NO → Instrucciones para registrar empresa
  ```

### `/register_company [nombre] [email]`

- **Función**: Solicitar registro de nueva empresa
- **Quién**: Cualquier usuario sin empresa
- **Resultado**: Empresa creada con status PENDING
- **Ejemplo**:

  ```
  /register_company "Mi Empresa SA" admin@miempresa.com

  📋 ¡Solicitud Enviada!
  🏢 Empresa: Mi Empresa SA
  📧 Email: admin@miempresa.com
  ⏳ Estado: Pendiente de aprobación

  Un super administrador revisará tu solicitud.
  ```

### `/help` o `/ayuda`

- **Función**: Ayuda contextual según rol del usuario
- **Quién**: Cualquier usuario
- **Resultado**: Lista de comandos disponibles
- **Ejemplo**:

  ```
  🤖 Ayuda - Financial Bot

  Comandos disponibles para ti:
  /menu - Menú principal con botones
  /perfil - Ver tu información
  /gasto [monto] [descripción] - Registro rápido

  💡 Tip: Usa /menu para acceso fácil con botones
  ```

---

## 🟢 COMANDOS BÁSICOS (TODOS LOS USUARIOS)

**Nota**: Requieren empresa APROBADA

### `/menu` ⭐ **MÁS IMPORTANTE**

- **Función**: Menú principal interactivo con botones
- **Quién**: Usuarios con empresa aprobada
- **Resultado**: Menú dinámico según rol
- **Admin ve**:

  ```
  🏢 Mi Empresa SA
  ¡Hola Juan! (👑 Administrador)

  🎯 ¿Qué deseas hacer?

  [💰 Registrar Gasto] [📊 Ver Movimientos]
  [👤 Mi Perfil]      [❓ Ayuda]
  [⚙️ Administración] [📈 Reportes]
  [👥 Usuarios]       [📋 Categorías]
  [🔄 Actualizar]
  ```

- **Operator ve**:

  ```
  🏢 Mi Empresa SA
  ¡Hola María! (👷 Operadora)

  🎯 ¿Qué deseas hacer?

  [💰 Registrar Gasto] [📊 Ver Movimientos]
  [👤 Mi Perfil]      [❓ Ayuda]
  [🔄 Actualizar]
  ```

### `/perfil` o `/profile`

- **Función**: Ver información personal del usuario
- **Quién**: Todos los usuarios
- **Resultado**: Datos personales y empresa
- **Ejemplo**:

  ```
  👤 Tu Perfil

  📝 Nombre: Juan Pérez
  🆔 Telegram ID: 123456789
  👑 Rol: Administrador
  🏢 Empresa: Mi Empresa SA
  📅 Registrado: 10/01/2025
  ✅ Estado: Activo
  ```

### `/gasto [monto] [descripción]`

- **Función**: Registro rápido de gasto en una línea
- **Quién**: Todos los usuarios
- **Resultado**: Gasto registrado con categoría automática
- **Ejemplo**:

  ```
  /gasto 150 Comida en restaurante

  ✅ Gasto Registrado Exitosamente!
  📌 Folio: F-0001
  💰 Monto: $150.00 MXN
  📝 Descripción: Comida en restaurante
  📂 Categoría: Sin categoría
  📅 Fecha: 16/01/2025 14:30

  El administrador ha sido notificado.
  ```

### `/movimientos` o `/movements`

- **Función**: Ver movimientos del usuario (filtrados por rol)
- **Quién**: Todos los usuarios
- **Admin ve**: Todos los movimientos de la empresa
- **Operator ve**: Solo sus propios movimientos
- **Ejemplo**:

  ```
  📊 Tus Movimientos Recientes

  📌 F-0003 | 🍽️ Alimentación
  💰 $85.00 | 📅 16/01/2025
  📝 Almuerzo ejecutivo

  📌 F-0002 | 🚗 Transporte
  💰 $45.00 | 📅 15/01/2025
  📝 Uber al aeropuerto

  [📊 Ver Más] [📋 Filtrar] [◀️ Menú]
  ```

---

## 🔵 COMANDOS DE ADMINISTRADOR (SOLO ADMINS)

**Nota**: Solo usuarios con rol ADMIN de cada empresa

### GESTIÓN DE MOVIMIENTOS

#### `/editar [folio]` o `/edit [folio]`

- **Función**: Editar cualquier movimiento de la empresa
- **Quién**: Solo admins
- **Resultado**: Wizard de edición paso a paso
- **Ejemplo**:

  ```
  /editar F-0001

  ✏️ Editando Gasto F-0001
  💰 Monto actual: $150.00
  📝 Descripción: Comida restaurante
  📂 Categoría: 🍽️ Alimentación

  ¿Qué deseas cambiar?
  [💰 Monto] [📝 Descripción] [📂 Categoría] [❌ Cancelar]
  ```

#### `/eliminar [folio]` o `/delete [folio]`

- **Función**: Eliminar cualquier movimiento de la empresa
- **Quién**: Solo admins
- **Resultado**: Confirmación y eliminación
- **Ejemplo**:

  ```
  /eliminar F-0001

  ⚠️ Confirmar Eliminación
  📌 Folio: F-0001
  💰 Monto: $150.00 MXN
  📝 Descripción: Comida restaurante

  [✅ Sí, Eliminar] [❌ Cancelar]
  ```

### GESTIÓN DE EMPRESA

#### `/empresa` o `/company`

- **Función**: Ver y editar información de la empresa
- **Quién**: Solo admins
- **Resultado**: Panel de configuración de empresa
- **Ejemplo**:

  ```
  🏢 Información de Empresa

  📝 Nombre: Mi Empresa SA
  📧 Email: admin@miempresa.com
  📞 Teléfono: +52 555-1234
  ✅ Estado: APROBADA
  📅 Creada: 10/01/2025
  👥 Usuarios: 5 (1 admin, 4 operadores)

  [✏️ Editar Info] [⚙️ Configuración]
  ```

### GESTIÓN DE USUARIOS

#### `/usuario_agregar [chatId] [nombre]`

- **Función**: Agregar nuevo operador a la empresa
- **Quién**: Solo admins
- **Resultado**: Usuario creado con rol OPERATOR
- **Ejemplo**:

  ```
  /usuario_agregar 987654321 María González

  ✅ Usuario Agregado
  👤 Nombre: María González
  🆔 Chat ID: 987654321
  👷 Rol: Operador
  🏢 Empresa: Mi Empresa SA

  María ya puede usar el bot con /start
  ```

#### `/usuario_lista`

- **Función**: Listar todos los usuarios de la empresa
- **Quién**: Solo admins
- **Resultado**: Lista interactiva con opciones
- **Ejemplo**:

  ```
  👥 Usuarios de Mi Empresa SA

  👑 Juan Pérez (Administrador)
  🆔 123456789 | ✅ Activo

  👷 María González (Operadora)
  🆔 987654321 | ✅ Activo

  👷 Carlos López (Operador)
  🆔 555444333 | ❌ Inactivo

  [➕ Agregar] [✏️ Editar Roles] [❌ Eliminar]
  ```

#### `/usuario_rol [chatId] [rol]`

- **Función**: Cambiar rol de usuario (ADMIN/OPERATOR)
- **Quién**: Solo admins
- **Resultado**: Rol actualizado
- **Ejemplo**:

  ```
  /usuario_rol 987654321 ADMIN

  ✅ Rol Actualizado
  👤 María González
  👑 Nuevo rol: Administrador

  María ahora tiene acceso completo de admin.
  ```

#### `/usuario_eliminar [chatId]`

- **Función**: Eliminar usuario de la empresa
- **Quién**: Solo admins
- **Resultado**: Usuario desactivado
- **Ejemplo**:

  ```
  /usuario_eliminar 555444333

  ⚠️ Confirmar Eliminación
  👤 Carlos López
  👷 Rol: Operador

  [✅ Sí, Eliminar] [❌ Cancelar]
  ```

### GESTIÓN DE CATEGORÍAS

#### `/categorias` o `/categories`

- **Función**: Gestionar categorías de la empresa
- **Quién**: Solo admins
- **Resultado**: Panel de gestión completo
- **Ejemplo**:

  ```
  📋 Categorías de Mi Empresa SA

  🍽️ Alimentación (12 gastos)
  🚗 Transporte (8 gastos)
  🏢 Oficina (5 gastos)
  📱 Tecnología (3 gastos)

  [➕ Nueva Categoría] [✏️ Editar] [❌ Eliminar]
  [🎨 Cambiar Iconos] [📊 Estadísticas]
  ```

### REPORTES (PREPARADO PARA FASE 3)

#### `/reporte` o `/report`

- **Función**: Generar reportes de la empresa
- **Quién**: Solo admins
- **Estado**: ⏳ Implementación en Fase 3
- **Preview**:

  ```
  📈 Generador de Reportes

  📅 Período:
  [📆 Hoy] [📅 Esta Semana] [🗓️ Este Mes]
  [📋 Personalizado]

  👥 Usuarios:
  [👤 Todos] [👑 Solo Admins] [👷 Solo Operadores]

  📂 Categorías:
  [📋 Todas] [🍽️ Alimentación] [🚗 Transporte]

  [📄 PDF] [📊 Excel] [📧 Email]
  ```

---

## 🟠 COMANDOS DE OPERADOR (SOLO OPERADORES)

**Nota**: Usuarios con rol OPERATOR - Funcionalidad limitada

### Comandos Permitidos:

- ✅ `/menu` - Menú simplificado
- ✅ `/perfil` - Su información personal
- ✅ `/gasto [monto] [descripción]` - Registrar sus gastos
- ✅ `/movimientos` - Ver solo SUS movimientos
- ✅ `/help` - Ayuda contextual

### Comandos NO Permitidos:

- ❌ `/editar` - No pueden editar
- ❌ `/eliminar` - No pueden eliminar
- ❌ `/usuario_*` - No pueden gestionar usuarios
- ❌ `/categorias` - No pueden gestionar categorías
- ❌ `/empresa` - No pueden ver info de empresa
- ❌ `/reporte` - No pueden generar reportes

### Menú Operator:

```
🏢 Mi Empresa SA
¡Hola María! (👷 Operadora)

🎯 ¿Qué deseas hacer?

[💰 Registrar Gasto] [📊 Ver Mis Movimientos]
[👤 Mi Perfil]      [❓ Ayuda]
[🔄 Actualizar]
```

---

## 🤖 SISTEMA DE MENÚS INTERACTIVOS

**Archivo**: `apps/telegram-bot/src/bot/menus/`

### Navegación Principal

```
/menu → Menú principal
├── 💰 Registrar Gasto → Menú de gastos
│   ├── ✍️ Registro Manual → Formulario directo
│   ├── 📋 Paso a Paso → Wizard guiado
│   └── ◀️ Menú Principal
├── 📊 Ver Movimientos → Lista paginada
├── 👤 Mi Perfil → Información personal
├── ❓ Ayuda → Comandos disponibles
└── [Solo Admin]
    ├── ⚙️ Administración → Panel admin
    │   ├── 👥 Gestionar Usuarios
    │   ├── 📋 Gestionar Categorías
    │   ├── 🏢 Info Empresa
    │   └── ⚙️ Configuración
    ├── 📈 Reportes → Generador reportes
    ├── 👥 Usuarios → Gestión directa
    └── 📋 Categorías → Gestión directa
```

### Callbacks Implementados:

```typescript
// Archivo: apps/telegram-bot/src/bot/callbacks/menu.callbacks.ts

✅ 'main_menu'        → Mostrar menú principal
✅ 'main_expense'     → Menú de gastos
✅ 'main_movements'   → Ver movimientos
✅ 'main_profile'     → Ver perfil
✅ 'main_help'        → Mostrar ayuda
✅ 'main_admin'       → Panel administración
✅ 'main_reports'     → Menú reportes
✅ 'main_users'       → Gestión usuarios
✅ 'main_categories'  → Gestión categorías
✅ 'main_refresh'     → Actualizar menú

⏳ 'expense_manual'   → Registro manual (Pendiente)
⏳ 'expense_wizard'   → Wizard paso a paso (Pendiente)
⏳ 'expense_confirm'  → Confirmar gasto (Pendiente)
```

---

## 🚀 FLUJOS DE USUARIO PASO A PASO

### 🔴 FLUJO SUPER ADMIN (Primera vez)

1. **Configuración inicial**:

   ```
   Usuario: /setup_super_admin
   Bot: ✅ ¡Super Administrador Configurado!
   ```

2. **Gestión de empresas**:

   ```
   Usuario: /admin_companies
   Bot: [Lista de empresas pendientes con botones]

   Usuario: [Clic ✅ Aprobar]
   Bot: ✅ Empresa aprobada y activada
   ```

### 🟡 FLUJO REGISTRO EMPRESA

1. **Solicitud**:

   ```
   Usuario: /register_company "Mi Empresa" admin@empresa.com
   Bot: 📋 Solicitud enviada, esperando aprobación
   ```

2. **Aprobación**:

   ```
   [Super admin aprueba]
   Bot: 🎉 ¡Tu empresa ha sido aprobada!
   ```

3. **Primer uso**:
   ```
   Usuario: /menu
   Bot: [Menú completo con botones]
   ```

### 🟢 FLUJO REGISTRO GASTO (Recomendado)

1. **Acceso por menú**:

   ```
   Usuario: /menu
   Bot: [Menú con botones]

   Usuario: [Clic 💰 Registrar Gasto]
   Bot: [Opciones de registro]

   Usuario: [Clic 📋 Paso a Paso]
   ```

2. **Wizard guiado**:

   ```
   Bot: 💰 ¿Cuánto gastaste?
   Usuario: 150

   Bot: 📝 ¿En qué lo gastaste?
   Usuario: Comida en restaurante

   Bot: 📂 Selecciona categoría:
   [🍽️ Alimentación] [🚗 Transporte] [❌ Sin Categoría]

   Usuario: [Clic 🍽️ Alimentación]
   ```

3. **Confirmación**:

   ```
   Bot: 📋 Resumen del Gasto
   💵 Monto: $150.00 MXN
   📝 Descripción: Comida en restaurante
   📂 Categoría: 🍽️ Alimentación
   📅 Fecha: Hoy

   [✅ Confirmar] [✏️ Editar] [❌ Cancelar]

   Usuario: [Clic ✅ Confirmar]
   Bot: ✅ ¡Gasto Registrado! Folio: F-0001
   ```

### 🔵 FLUJO GESTIÓN USUARIOS (Admin)

1. **Acceso**:

   ```
   Usuario: /menu
   Usuario: [Clic ⚙️ Administración]
   Usuario: [Clic 👥 Gestionar Usuarios]
   ```

2. **Agregar usuario**:

   ```
   Bot: [Lista usuarios + botón ➕ Agregar]
   Usuario: [Clic ➕ Agregar Usuario]

   Bot: 👤 Agregar Nuevo Usuario
   Necesito el Chat ID del usuario.
   El usuario debe enviar /start a @userinfobot

   Usuario: /usuario_agregar 987654321 María González
   Bot: ✅ Usuario agregado exitosamente
   ```

---

## 📊 RESUMEN DE COMANDOS POR ROL

### Super Admin (Sistema Global):

- ✅ `/setup_super_admin` - Configuración inicial
- ✅ `/admin_companies` - Ver empresas pendientes
- ✅ `/approve_company [id]` - Aprobar empresa
- ✅ `/reject_company [id] [razón]` - Rechazar empresa

### Comandos Públicos:

- ✅ `/start` - Inicio inteligente
- ✅ `/register_company [nombre] [email]` - Solicitar empresa
- ✅ `/help` - Ayuda contextual

### Todos los usuarios (Empresa aprobada):

- ⭐ `/menu` - **Menú principal (MÁS IMPORTANTE)**
- ✅ `/perfil` - Información personal
- ✅ `/gasto [monto] [descripción]` - Registro rápido
- ✅ `/movimientos` - Ver movimientos (filtrados)

### Solo Administradores:

- ✅ `/editar [folio]` - Editar movimiento
- ✅ `/eliminar [folio]` - Eliminar movimiento
- ✅ `/empresa` - Info de empresa
- ✅ `/usuario_agregar [chatId] [nombre]` - Agregar usuario
- ✅ `/usuario_lista` - Listar usuarios
- ✅ `/usuario_rol [chatId] [rol]` - Cambiar rol
- ✅ `/usuario_eliminar [chatId]` - Eliminar usuario
- ✅ `/categorias` - Gestionar categorías
- ⏳ `/reporte` - Generar reportes (Fase 3)

### Solo Operadores:

- ✅ Subconjunto limitado: `/menu`, `/perfil`, `/gasto`, `/movimientos`
- ❌ Sin acceso a gestión o administración

---

## 💡 TIPS IMPORTANTES

### Para uso diario:

1. **USA SIEMPRE `/menu`** - Evita memorizar comandos
2. **Todo con botones** - No necesitas escribir comandos complejos
3. **Registro paso a paso** - Más fácil que comando directo
4. **Menú contextual** - Opciones cambian según tu rol

### Para administradores:

1. **Gestión por menús** - Más intuitivo que comandos
2. **Chat IDs** - Usuarios deben enviar `/start` a `@userinfobot`
3. **Roles claros** - ADMIN ve todo, OPERATOR solo lo suyo
4. **Separación total** - Cada empresa es independiente

### Para super admins:

1. **Solo gestión de empresas** - No ves movimientos específicos
2. **Aprobación responsable** - Verifica datos antes de aprobar
3. **También puedes tener empresa** - Ser super admin + admin de tu empresa

---

**Total de comandos**: 20+ implementados  
**Comandos con menú**: 15+ callbacks  
**Más usados**: `/menu` (90%), `/gasto` (30%), `/perfil` (10%)

---

_Última actualización: 16 de Enero 2025_  
_Versión: 1.0.0 - Multi-tenant con UX Interactiva_
