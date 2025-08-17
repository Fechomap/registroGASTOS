# Telegram Bot - Estructura del Proyecto

## 📁 Organización de Archivos

### `/commands/`

Comandos principales del bot que inician flujos o acciones directas.

- `expense.command.ts` - Comando `/gasto` que inicia el flujo de registro

### `/conversations/`

Centralizador de todas las conversaciones y flujos interactivos.

- `index.ts` - Exportaciones centralizadas

### `/handlers/`

Lógica de negocio para manejar diferentes tipos de interacciones.

- `conversation.handler.ts` - Maneja el flujo completo de registro de gastos

### `/callbacks/`

Manejadores para callbacks de botones InlineKeyboard.

- `menu.callbacks.ts` - Callbacks del menú principal
- `expense.callbacks.ts` - Callbacks específicos del flujo de gastos
- `index.ts` - Exportaciones centralizadas

### `/menus/`

Definiciones de menús y mensajes de la interfaz.

- `main.menu.ts` - Menú principal y submenús de administración
- `expense.menu.ts` - Menús específicos para registro de gastos
- `index.ts` - Exportaciones centralizadas

## 🎯 Flujo de Registro de Gastos

### Para Operadores:

```
/gasto → [Empresa única] → Monto → Descripción → Categoría → Confirmar
```

### Para Administradores:

```
/gasto → Tipo (Empresa/Personal) → [Si Empresa: Seleccionar] → Monto → Descripción → Categoría → Confirmar
```

## 🏗️ Arquitectura de Datos

### Base de Datos:

- **UserCompany**: Junction table para multi-empresa
- **PersonalMovement**: Gastos personales de administradores
- **PersonalCategory**: Categorías personales
- **Movement**: Gastos empresariales (existente)

### Tipos TypeScript:

```typescript
interface RegisterFlowData {
  step: 'expense_type' | 'company_select' | 'amount' | 'description' | 'category' | 'confirm';
  expenseType?: 'COMPANY' | 'PERSONAL';
  companyId?: string;
  amount?: number;
  description?: string;
  categoryId?: string;
}
```

## 🔄 Estados del Flujo

1. **expense_type** - Selección tipo (solo admins)
2. **company_select** - Selección empresa (si múltiples)
3. **amount** - Ingreso de monto
4. **description** - Ingreso de descripción
5. **category** - Selección de categoría
6. **confirm** - Confirmación final

## 🎛️ Callbacks Principales

- `main_expense` - Iniciar registro
- `expense_type_company` - Seleccionar empresa
- `expense_type_personal` - Seleccionar personal
- `expense_company_{id}` - Seleccionar empresa específica
- `category_select_{id}` - Seleccionar categoría
- `expense_confirm_save` - Guardar gasto
- `expense_cancel` - Cancelar flujo

## 📦 Buenas Prácticas Implementadas

1. **Separación de responsabilidades**: Cada archivo tiene una función específica
2. **Exportaciones centralizadas**: Archivos index.ts en cada directorio
3. **Tipado fuerte**: Interfaces TypeScript para todos los datos
4. **Flujo condicional**: Se adapta automáticamente al número de empresas
5. **Sin estado persistente**: Cada gasto decide su tipo dinámicamente
6. **Interfaz visual**: Todo funciona con botones, no comandos de texto
