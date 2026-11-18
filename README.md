# Gastos Compartidos (Shared Expenses)

Sistema para dividir gastos entre grupos de personas y gestionar el balance de deudas. Desarrollado como proyecto de exploración del stack Gentle-AI.

## 🚀 Stack Tecnológico
- **Backend**: Node.js + Express + Better-SQLite3.
- **Frontend**: Angular 16 + Angular Material v16.
- **Arquitectura**: Layered Architecture (Repository $\rightarrow$ Service $\rightarrow$ Controller) y Core/Feature split en el frontend.

## ✨ Características Implementadas (MVP)
- **Gestión de Grupos**: Creación de grupos e invitación/remoción de miembros.
- **Gestión de Gastos**: 
    - Registro de gastos con división equitativa automática.
    - Algoritmo de redondeo determinístico para evitar pérdidas de centavos.
    - Listado de gastos ordenado por fecha.
- **Balances y Liquidaciones**:
    - Cálculo de balances detallados con regla FIFO (First-In-First-Out) para el desglose por gasto.
    - Registro de pagos (settlements) entre usuarios con validación de no-sobrepago.
    - Persistencia de deudas "congeladas" para usuarios removidos del grupo.

## 🛠 Desarrollo y Calidad
- **Strict TDD**: Implementación basada en tests primero.
- **Sdd Workflow**: Planificación mediante Spec-Driven Development (Proposal $\rightarrow$ Spec $\rightarrow$ Design $\rightarrow$ Tasks).

## 📌 Estado Actual del Proyecto
**ESTADO: PAUSADO**

El proyecto se encuentra en una fase de pausa técnica. Se han completado las funcionalidades core, pero quedan pendientes los siguientes "mini-slices" para cerrar el ciclo de entrega:
1. **Shared Layout/Shell**: Implementación de una navegación global (nav bar/sidebar) para conectar los módulos de Grupos y Gastos.
2. **Final QA**: Ronda de pruebas manuales integrales y fixeo de bugs menores.

El desarrollo se retomará en una etapa posterior para completar estos puntos.
