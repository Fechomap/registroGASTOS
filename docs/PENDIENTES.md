# ⚠️ PENDIENTES CRÍTICOS - No Perder de Vista

**Fecha**: 16 de Enero 2025  
**Estado**: Lista de tareas pendientes organizadas por prioridad

---

## 🚨 CRÍTICO - ESTA SEMANA (16-23 Enero)

### 1. **Railway Deployment** (BLOQUEADOR)

- [ ] **Configurar variables en Railway dashboard**:
  ```
  TELEGRAM_BOT_TOKEN=[configured in Railway dashboard]
  DATABASE_URL=${{ Postgres.DATABASE_URL }}
  NODE_ENV=production
  PORT=3000
  LOG_LEVEL=info
  ```
- [ ] **Ejecutar deployment**: `railway up`
- [ ] **Verificar bot funcional en producción**
- [ ] **Testing basic con /start, /menu**

### 2. **Notificaciones Instantáneas** (ALTA)

- [ ] **Implementar servicio de notificaciones** en packages/core
- [ ] **Conectar notificaciones a comando /gasto**
- [ ] **Testing**: Admin recibe notif cuando operator registra gasto
- [ ] **Configurar webhook o polling para notificaciones**

### 3. **Testing Sistema de Menús** (ALTA)

- [ ] **Probar todos los callbacks de menús** (main_expense, main_movements, etc.)
- [ ] **Implementar funciones de menú faltantes**:
  - [ ] `main_movements` - Ver movimientos del usuario
  - [ ] `main_categories` - Gestión de categorías
  - [ ] `main_reports` - Reportes básicos
- [ ] **Testing flujo completo**: registro → confirmación → notificación

---

## 🔶 ALTO - PRÓXIMA SEMANA (24-31 Enero)

### 4. **Completar Flujos de Menús**

- [ ] **Implementar wizard de registro paso a paso**:
  - [ ] expense_wizard callback
  - [ ] Flujo: monto → descripción → categoría → confirmación
  - [ ] Manejo de estados de conversación
- [ ] **Implementar callbacks de expense**:
  - [ ] expense_manual, expense_photo, expense_voice
  - [ ] expense_confirm, expense_edit, expense_cancel

### 5. **Gestión de Categorías desde Menús**

- [ ] **Implementar callbacks category\_\***:
  - [ ] category_add, category_edit, category_delete
  - [ ] category_parent_selection
  - [ ] category_confirm_delete
- [ ] **UI para selección de categorías** con iconos/colores
- [ ] **CRUD completo desde botones**

### 6. **Gestión de Usuarios desde Menús**

- [ ] **Implementar callbacks users\_\***:
  - [ ] users_add, users_list, users_roles, users_delete
  - [ ] user_delete_confirm, user_role_change
- [ ] **Wizard para agregar usuarios** paso a paso
- [ ] **Lista interactiva de usuarios** con botones de acción

---

## 🔷 MEDIO - FEBRERO

### 7. **Health Check Endpoint** (Para Railway)

- [ ] **Agregar servidor Express** en bot index.ts
- [ ] **Endpoint /health** que responda JSON status
- [ ] **Testing health check** local y remoto

### 8. **Reportes Básicos** (Preparación Fase 3)

- [ ] **Comando /reporte básico** con filtros simples
- [ ] **Export CSV básico** (antes de Excel/PDF)
- [ ] **Filtros por fecha/usuario/categoría**

### 9. **Resúmenes Diarios**

- [ ] **Cron job para resúmenes** (Railway cron o externa)
- [ ] **Template de resumen diario**
- [ ] **Envío automático a admins**

---

## 🔹 BAJO - MARZO (Preparación Fase 2)

### 10. **Estructura para IA**

- [ ] **Setup Cloudflare R2** account y buckets
- [ ] **OpenAI API key** y testing básico
- [ ] **Estructura packages/ai-processor**
- [ ] **Comando /foto placeholder** (preparado para IA)

### 11. **Estructura para Reportes**

- [ ] **Setup ExcelJS** en packages/reports
- [ ] **Templates básicos** para PDF/Excel
- [ ] **Comando /reporte avanzado** placeholder

### 12. **Testing y QA**

- [ ] **Jest setup** para testing automatizado
- [ ] **Testing de integración** bot + database
- [ ] **Testing multi-tenant** con múltiples empresas
- [ ] **Performance testing** con volumen

---

## 📋 FUNCIONES DE MENÚ ESPECÍFICAS PENDIENTES

### Callbacks por implementar:

```typescript
// ❌ PENDIENTES - callbacks críticos
'expense_manual'     → Flujo registro manual
'expense_wizard'     → Wizard paso a paso
'expense_confirm'    → Confirmar gasto
'expense_edit'       → Editar campos del gasto

'main_movements'     → Vista de movimientos del usuario
'main_categories'    → Gestión categorías desde menú
'main_reports'       → Reportes básicos

'users_add'          → Agregar usuario wizard
'users_list'         → Lista interactiva usuarios
'users_roles'        → Cambiar roles

'category_add'       → Agregar categoría
'category_edit'      → Editar categoría
'category_delete'    → Eliminar categoría

'reports_general'    → Reporte general
'reports_period'     → Filtrar por período
'reports_user'       → Filtrar por usuario
```

---

## 🔧 CÓDIGO ESPECÍFICO FALTANTE

### 1. **Notificaciones** (packages/core/src/services/)

```typescript
// ❌ FALTA: notification.service.ts
class NotificationService {
  async notifyExpense(movement: Movement) {}
  async sendDailySummary(companyId: string) {}
  async notifyAdmins(message: string) {}
}
```

### 2. **Health Check** (apps/telegram-bot/src/index.ts)

```typescript
// ❌ FALTA: Express server para health check
import express from 'express';
const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(process.env.PORT || 3000);
```

### 3. **Conversation State** (apps/telegram-bot/src/types/)

```typescript
// ❌ FALTA: Estado para wizards
interface ConversationState {
  step: 'amount' | 'description' | 'category' | 'confirm';
  data: Partial<ExpenseData>;
}
```

---

## 📊 MÉTRICAS DE COMPLETITUD

### Por Área:

- **Backend/DB**: 95% ✅ (solo notificaciones)
- **Bot Commands**: 85% ✅ (faltan callbacks de menús)
- **UX/Menus**: 60% ⚠️ (estructura lista, callbacks pendientes)
- **Deploy**: 80% ⚠️ (configurado, falta testing producción)
- **Testing**: 20% ❌ (solo testing manual)

### Comandos:

- **Implementados**: 15/25 (60%)
- **Callbacks**: 5/20 (25%)
- **Wizards**: 0/5 (0%)
- **Notificaciones**: 0/3 (0%)

---

## 🎯 PLAN DE ACCIÓN INMEDIATO

### HOY (16 Enero):

1. ✅ **Commit plan maestro actualizado**
2. ⏳ **Configurar variables Railway**
3. ⏳ **Deploy y testing básico**

### MAÑANA (17 Enero):

1. **Implementar notificaciones** (2-3 horas)
2. **Health check endpoint** (30 min)
3. **Testing deployment completo** (1 hora)

### ESTA SEMANA:

1. **Callbacks de menús críticos** (expense_wizard, main_movements)
2. **Testing con usuarios reales**
3. **Documentación de deployment exitoso**

---

## ⚠️ RIESGOS DE NO COMPLETAR

### Si no completamos notificaciones:

- **Admins no saben cuándo hay gastos nuevos**
- **Flujo de aprobación roto**
- **Experiencia de usuario incompleta**

### Si no completamos callbacks de menús:

- **Usuarios harán clic en botones que no funcionan**
- **UX frustrante, abandono del sistema**
- **Regreso forzado a comandos de texto**

### Si no completamos deployment:

- **No se puede usar en producción**
- **Testing limitado a desarrollo**
- **Bloquea todo progreso futuro**

---

**RECUERDA**: El 85% del trabajo está hecho, pero el 15% restante es **crítico para usabilidad**. No podemos declarar MVP completo hasta resolver estos pendientes.

---

_Próxima revisión: 20 de Enero 2025_
