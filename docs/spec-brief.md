# Gastos Compartidos — Brief Inicial (MVP)

## Objetivo
App para dividir gastos entre un grupo de personas (tipo Splitwise chico) y saber quién le debe a quién.

## Stack
- Backend: Node.js + Express
- Frontend: Angular 16 (NgModules, Angular Material v15)
- DB: SQLite (simple, sin infra extra para un MVP)
- Auth: JWT simple (email + password)

## Modelo de datos (borrador)
- **User**: id, email, password_hash, nombre
- **Group**: id, nombre, owner_id
- **GroupMember**: group_id, user_id
- **Expense**: id, group_id, descripcion, monto_total, pagado_por (user_id), fecha
- **ExpenseSplit**: expense_id, user_id, monto_adeudado
- **Settlement**: id, group_id, de_user_id, a_user_id, monto, fecha (registro de un pago que liquida deuda)

## Features MVP (alcance)
1. Registro/login de usuario.
2. Crear grupo e invitar miembros (por email, sin verificación compleja).
3. Agregar gasto a un grupo: monto, descripción, quién pagó, cómo se divide (por ahora: dividir en partes iguales entre los miembros del grupo).
4. Ver balance por grupo: cuánto le debe cada miembro a cada otro (simplificado, sin algoritmo de minimización de transacciones todavía).
5. Registrar un "settlement" (pago) que reduce la deuda entre dos usuarios.
6. Listado de gastos de un grupo, ordenado por fecha.

## Fuera de alcance (explícito, para que la IA no se vaya de tema)
- Split desigual por porcentaje o montos fijos (queda para v2).
- Notificaciones push/email.
- Multi-moneda.
- App mobile nativa.

## Criterios de aceptación (ejemplos)
- Un usuario puede crear un grupo y ver que aparece en su lista de grupos.
- Al agregar un gasto de $300 pagado por A en un grupo de 3 personas, el balance muestra que B y C le deben $100 cada uno a A.
- Al registrar un settlement de B a A por $100, el balance de B con A pasa a $0.

## Notas de arquitectura para la fase de diseño
- Priorizar simplicidad sobre escalabilidad — es un proyecto de exploración del stack Gentle-AI, no un producto real.
- El frontend puede empezar como un módulo Angular por feature (`auth`, `groups`, `expenses`) siguiendo la convención NgModule que ya usás en tu trabajo.
