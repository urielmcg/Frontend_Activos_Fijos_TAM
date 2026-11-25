# 🖥️ Frontend — Sistema de Activos Fijos TAMEP (SIAEM)

> Documentación técnica completa del frontend construido con **Vue 3** + **Argon Dashboard 2**.  
> URL de producción: `https://siaem.tamep.bo/`  
> URL local de desarrollo: `http://localhost:8080/`

---

## 📑 Índice

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Punto de Entrada y Configuración](#3-punto-de-entrada-y-configuración)
4. [Capa de Comunicación con la API](#4-capa-de-comunicación-con-la-api)
5. [Sistema de Rutas](#5-sistema-de-rutas)
6. [Gestión de Estado (Vuex)](#6-gestión-de-estado-vuex)
7. [Layout Principal (App.vue)](#7-layout-principal-appvue)
8. [Navegación Lateral (Sidenav)](#8-navegación-lateral-sidenav)
9. [Módulos Funcionales](#9-módulos-funcionales)
   - [Autenticación (Login/Registro)](#91-autenticación-loginregistro)
   - [Dashboard](#92-dashboard)
   - [Gestión de Activos](#93-gestión-de-activos)
   - [Registro de Activos](#94-registro-de-activos)
   - [Asignación de Activos](#95-asignación-de-activos)
   - [Transferencias](#96-transferencias)
   - [Baja de Activos](#97-baja-de-activos)
   - [Solicitudes de Mantenimiento](#98-solicitudes-de-mantenimiento)
   - [Historial de Mantenimiento](#99-historial-de-mantenimiento)
   - [Reportes y Estadísticas](#910-reportes-y-estadísticas)
   - [Monitoreo por Regional](#911-monitoreo-por-regional)
   - [Módulo Predictivo (IA)](#912-módulo-predictivo-ia)
   - [Configuración Difusa](#913-configuración-difusa)
   - [Perfil de Usuario](#914-perfil-de-usuario)
   - [Administración de Usuarios](#915-administración-de-usuarios)
10. [Componentes Reutilizables (Argon)](#10-componentes-reutilizables-argon)
11. [Dependencias del Proyecto](#11-dependencias-del-proyecto)

---

## 1. Stack Tecnológico

| Componente         | Tecnología                                     | Versión  |
|--------------------|-------------------------------------------------|----------|
| Framework          | Vue.js 3 (Composition API / `<script setup>`)   | 3.4.19   |
| Router             | Vue Router                                       | 4.3.0    |
| Estado             | Vuex                                             | 4.1.0    |
| HTTP Client        | Axios                                            | 1.13.4   |
| UI Kit             | Argon Dashboard 2 (Creative Tim) + Bootstrap 5   | 4.0.0    |
| Gráficos           | Chart.js + vue-chartjs                           | 4.4.1    |
| PDF Export         | jsPDF + jspdf-autotable + html2pdf.js            | 4.1.0    |
| Alertas            | SweetAlert2                                      | 11.26.18 |
| Calendario         | Flatpickr (vue-flatpickr)                        | 11.0.4   |
| Build Tool         | Vue CLI                                          | 5.0.8    |
| Preprocesador CSS  | Sass                                             | 1.71.1   |

---

## 2. Estructura del Proyecto

```
src/
├── main.js                     ← Entry point (crea la app Vue)
├── App.vue                     ← Layout raíz (sidenav + navbar + router-view)
├── argon-dashboard.js          ← Plugin de Argon Dashboard
├── axios.js                    ← Instancia Axios alternativa (legacy)
│
├── services/
│   └── api.js                  ← Instancia Axios principal con interceptores JWT
│
├── store/
│   └── index.js                ← Vuex store (estado de UI/layout)
│
├── router/
│   └── index.js                ← Definición de rutas + guard de autenticación
│
├── components/                 ← Componentes base de Argon Dashboard
│   ├── ArgonAlert.vue
│   ├── ArgonAvatar.vue
│   ├── ArgonBadge.vue
│   ├── ArgonButton.vue
│   ├── ArgonCheckbox.vue
│   ├── ArgonInput.vue
│   ├── ArgonPagination[Item].vue
│   ├── ArgonProgress.vue
│   ├── ArgonRadio.vue
│   ├── ArgonSwitch.vue
│   └── ArgonTextarea.vue
│
├── examples/                   ← Componentes de layout de Argon
│   ├── Sidenav/                ← index.vue, SidenavList.vue, SidenavItem.vue
│   ├── Navbars/Navbar.vue      ← Barra superior
│   ├── Footer.vue              ← Pie de página
│   ├── Configurator.vue        ← Panel de configuración visual
│   ├── Breadcrumbs.vue         ← Migas de pan
│   ├── Cards/                  ← MiniStatisticsCard, etc.
│   └── Charts/                 ← GradientLineChart, DoughnutChart
│
├── views/                      ← Páginas principales
│   ├── Dashboard.vue           ← Dashboard con KPIs de IA
│   ├── Signin.vue              ← Login
│   ├── Signup.vue              ← Registro
│   ├── Profile.vue             ← Perfil del usuario
│   ├── Telemetria.vue          ← Gestión de baja (telemetría)
│   │
│   ├── components/             ← Módulos funcionales del sistema
│   │   ├── ManagementActivos.vue        ← Gestión y tabla de activos
│   │   ├── NewActivos.vue               ← Formulario de registro de activos
│   │   ├── AsingActivos.vue             ← Asignación de activos
│   │   ├── Transferencias.vue           ← Transferencia entre funcionarios
│   │   ├── Reportes.vue                 ← Reportes con exportación PDF/Excel
│   │   ├── Monitoreo.vue                ← Monitoreo por regional
│   │   ├── ModuloPredictivo.vue         ← Pronóstico de fallas (IA)
│   │   ├── ConfiguracionDifusa.vue      ← Configuración de lógica difusa
│   │   ├── Solicitud-mantenimiento.vue  ← Crear tickets de soporte
│   │   ├── HistorialMantenimiento.vue   ← Historial de intervenciones
│   │   ├── NewUsers.vue                 ← Crear usuarios
│   │   ├── UsuariosRegistrados.vue      ← Administrar usuarios
│   │   ├── NewRegional.vue              ← Crear regionales
│   │   ├── NewCargos.vue                ← Crear cargos
│   │   ├── DetalleActivo.vue            ← Componente de detalle inline
│   │   └── ...                          ← Otros componentes UI
│   │
│   ├── Items/                  ← Vistas de detalle y acciones
│   │   ├── ViewDetails.vue     ← Vista detallada de activo (~25KB)
│   │   ├── GestionActivo.vue   ← Gestión individual de activo (~19KB)
│   │   └── RealizarBaja.vue    ← Proceso de desincorporación
│   │
│   └── Tickets/                ← (Módulo de tickets)
│
└── assets/                     ← Recursos estáticos (imágenes, CSS, iconos)
    └── css/
        ├── nucleo-icons.css
        └── nucleo-svg.css
```

---

## 3. Punto de Entrada y Configuración

### `main.js`

```javascript
import { createApp } from "vue";
import App from "./App.vue";
import store from "./store";
import router from "./router";
import ArgonDashboard from "./argon-dashboard";

const appInstance = createApp(App);
appInstance.use(store);          // Vuex
appInstance.use(router);         // Vue Router  
appInstance.use(ArgonDashboard); // Plugin de UI de Argon
appInstance.mount("#app");
```

### Variables de entorno

| Archivo           | Variable            | Valor                              |
|-------------------|----------------------|------------------------------------|
| `.env`            | `VUE_APP_API_URL`    | `http://localhost:8000/api/`       |
| `.env.production` | `VUE_APP_API_URL`    | `https://siaem.tamep.bo/`         |

### Scripts NPM

| Comando         | Acción                              |
|-----------------|-------------------------------------|
| `npm run serve` | Servidor de desarrollo (port 8080)  |
| `npm run build` | Build de producción en `/dist/`     |
| `npm run lint`  | Linting con ESLint                  |

---

## 4. Capa de Comunicación con la API

### `services/api.js` — Instancia principal de Axios

El archivo centraliza TODA la comunicación HTTP con el backend Django:

**Características:**
1. **Base URL dinámica:** Lee de `VUE_APP_API_URL` o usa `https://siaem.tamep.bo/`.
2. **Interceptor de Request:** Añade automáticamente `Authorization: Bearer <token>` a cada petición.
3. **Interceptor de Response:** Manejo automático de errores 401:
   - Intenta renovar el token usando el `refresh` almacenado en `localStorage`.
   - Si la renovación falla, limpia `localStorage` y redirige al login.
   - Previene loops infinitos con flag `_retry`.

**Flujo de autenticación:**
```
1. Login → guarda access y refresh en localStorage
2. Cada petición → interceptor añade Bearer token
3. Token expirado (401) → intenta refresh automático
4. Refresh falla → limpia storage → redirige a /signin
```

**Datos almacenados en `localStorage`:**

| Key            | Contenido                              |
|----------------|----------------------------------------|
| `access`       | JWT Access Token                       |
| `refresh`      | JWT Refresh Token                      |
| `first_name`   | Nombre del usuario                     |
| `last_name`    | Apellido del usuario                   |
| `cargo_nombre` | Nombre del cargo del usuario           |

---

## 5. Sistema de Rutas

### `router/index.js`

El router define **20 rutas**, organizadas por módulo funcional:

| Ruta                          | Componente                  | Descripción                        |
|-------------------------------|-----------------------------|------------------------------------|
| `/`                           | —                           | Redirige a `/dashboard-default`    |
| `/dashboard-default`          | `Dashboard.vue`             | Panel principal con KPIs de IA     |
| `/signin`                     | `Signin.vue`                | Login                              |
| `/signup`                     | `Signup.vue`                | Registro de cuenta                 |
| `/profile`                    | `Profile.vue`               | Perfil del usuario                 |
| `/Gestion de Activos`         | `ManagementActivos.vue`     | Tabla de gestión de activos        |
| `/Nuevos Activos`             | `NewActivos.vue`            | Formulario de registro             |
| `/Asignar Activos`            | `AsingActivos.vue`          | Asignación a funcionarios          |
| `/Transferencias`             | `Transferencias.vue`        | Transferencia entre personal       |
| `/telemetria`                 | `Telemetria.vue`            | Gestión de baja / telemetría       |
| `/RealizarBaja`               | `RealizarBaja.vue`          | Proceso de desincorporación        |
| `/Reportes`                   | `Reportes.vue`              | Reportes con filtros y exportación |
| `/Monitoreo`                  | `Monitoreo.vue`             | Monitoreo por regional             |
| `/Historial`                  | `HistorialMantenimiento.vue`| Historial de intervenciones        |
| `/Solicitud-mantenimiento`    | `SolicitudMantenimiento.vue`| Crear solicitud de soporte         |
| `/modulo-predictivo`          | `ModuloPredictivo.vue`      | Pronóstico de fallas (IA)          |
| `/Configuracion-difusa`       | `ConfiguracionDifusa.vue`   | Configuración de lógica difusa     |
| `/new-regional`               | `NewRegional.vue`           | Crear regionales                   |
| `/Nuevos Usuarios`            | `NewUsers.vue`              | Crear usuarios                     |
| `/Personal`                   | `UsuariosRegistrados.vue`   | Administrar usuarios               |
| `/activo/detalle/:id`         | `ViewDetails.vue`           | Detalle completo de un activo      |
| `/activo/gestion/:id`         | `GestionActivo.vue`         | Gestión individual de activo       |

### Guard de Autenticación

```javascript
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem("access");
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next("/signin");                    // Sin token → al login
  } else if ((to.path === "/signin" || to.path === "/signup") && isAuthenticated) {
    next("/dashboard-default");         // Ya logueado → al dashboard
  } else {
    next();                             // Continuar normalmente
  }
});
```

---

## 6. Gestión de Estado (Vuex)

### `store/index.js`

El store de Vuex maneja exclusivamente el **estado de la interfaz** (no datos de negocio):

| Estado              | Tipo    | Descripción                           | Default    |
|---------------------|---------|---------------------------------------|------------|
| `hideConfigButton`  | Boolean | Ocultar botón de configurador         | `false`    |
| `isPinned`          | Boolean | Sidenav fijado/pinned                 | `false`    |
| `showConfig`        | Boolean | Mostrar panel configurador            | `false`    |
| `sidebarType`       | String  | Clase CSS del sidebar                 | `bg-white` |
| `isRTL`             | Boolean | Modo derecha-a-izquierda              | `false`    |
| `darkMode`          | Boolean | Modo oscuro                           | `false`    |
| `isNavFixed`        | Boolean | Navbar fijo al scroll                 | `false`    |
| `isAbsolute`        | Boolean | Navbar posición absoluta              | `false`    |
| `showSidenav`       | Boolean | Mostrar barra lateral                 | `true`     |
| `showNavbar`        | Boolean | Mostrar barra superior               | `true`     |
| `showFooter`        | Boolean | Mostrar pie de página                 | `true`     |
| `layout`            | String  | Tipo de layout (`default`/`landing`)  | `default`  |

**Mutations:**
- `toggleConfigurator()` — Toggle del panel de configuración visual.
- `sidebarMinimize()` — Toggle entre sidebar expandido/colapsado.
- `sidebarType(payload)` — Cambiar el tipo de sidebar.
- `navbarFixed()` — Toggle de navbar fijo.

> **Nota:** Los datos de negocio (activos, designaciones, etc.) NO se almacenan en Vuex. Se obtienen directamente de la API en cada componente vía `api.get()`.

---

## 7. Layout Principal (App.vue)

El `App.vue` es el componente raíz que estructura la aplicación:

```
┌──────────────────────────────────────────────────────┐
│  Sidenav (lateral izquierdo, condicional)            │
│  ┌────────────────────────────────────────────────┐  │
│  │  Navbar (barra superior, condicional)          │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  <router-view /> ← Contenido dinámico   │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │  Footer (pie de página, condicional)           │  │
│  └────────────────────────────────────────────────┘  │
│  Configurator (panel lateral derecho, toggle)        │
└──────────────────────────────────────────────────────┘
```

- El **Sidenav**, **Navbar** y **Footer** se muestran/ocultan según el estado de Vuex.
- Las páginas de login/registro ocultan estos elementos para mostrar un layout limpio.
- El `Configurator` permite cambiar colores, modo oscuro y navbar fijo.

---

## 8. Navegación Lateral (Sidenav)

El menú lateral está organizado en **4 secciones** funcionales:

### Sección 1: Activos Fijos
| Ícono | Enlace                     | Destino                      |
|-------|----------------------------|------------------------------|
| 📊    | Inicio                     | `/dashboard-default`         |
| 📋    | Gestión de Activos         | `/Gestion de Activos`        |
| 📦    | Registro de Activos        | `/Nuevos Activos`            |
| ✉️    | Asignación de Activos      | `/Asignar Activos`           |
| 📨    | Transferencia de Activos   | `/Transferencias`            |
| 📉    | Gestión de Baja            | `/telemetria`                |
| 📊    | Reportes y Estadísticas    | `/Reportes`                  |
| 🌍    | Monitoreo por Regional     | `/Monitoreo`                 |

### Sección 2: Informática y Comunicaciones
| Ícono | Enlace                       | Destino                        |
|-------|------------------------------|--------------------------------|
| ⚙️    | Solicitud de Mantenimiento   | `/solicitud-mantenimiento`     |
| 📝    | Historial de Mantenimiento   | `/Historial`                   |

### Sección 3: Analítica Predictiva (IA)
| Ícono | Enlace                   | Destino                      |
|-------|--------------------------|------------------------------|
| ⚛️    | Pronóstico de Fallas     | `/modulo-predictivo`         |
| ⚙️    | Configuración Difusa     | `/configuracion-difusa`      |

### Sección 4: Administración de Usuarios
| Ícono | Enlace               | Destino              |
|-------|-----------------------|----------------------|
| 👤    | Perfil               | `/profile`           |
| 👥    | Crear Usuarios       | `/Nuevos Usuarios`   |
| 🪪    | Administrar Usuarios | `/Personal`          |

---

## 9. Módulos Funcionales

### 9.1. Autenticación (Login/Registro)

#### `Signin.vue` — Página de Login

**Funcionalidad:**
- Formulario con email/contraseña + switch "Recordar sesión".
- Llama a `api.post("login/", { username, password })`.
- Al recibir respuesta exitosa, guarda en `localStorage`:
  - `access`, `refresh`, `first_name`, `last_name`, `cargo_nombre`.
- Redirige a `/dashboard-default` tras 800ms.
- Mensajes de error/éxito con alertas dinámicas coloreadas.

**Estilo visual:**
- Diseño dividido: formulario a la izquierda, imagen corporativa TAMEP a la derecha.
- Colores corporativos: azul TAMEP (`#003366`), amarillo (`#ffcc00`).
- Al entrar al login, se oculta el Sidenav, Navbar y Footer via Vuex.

#### `Signup.vue` — Registro de Usuarios

- Formulario de creación de cuenta.
- Redirige al login tras registro exitoso.

---

### 9.2. Dashboard

#### `Dashboard.vue` — Panel Principal

**Datos consumidos:** `GET /api/dashboard/stats/`

**Sección 1: Tarjetas KPI** (4 cards superiores)
| KPI                       | Fuente                    | Descripción                        |
|---------------------------|---------------------------|------------------------------------|
| Salud Fuzzy Global        | `stats.salud_global`      | Porcentaje de salud promedio (Lógica Difusa) |
| Confiabilidad (MTBF)      | `stats.mtbf_avg`          | Horas promedio entre fallas        |
| Mantenibilidad (MTTR)     | `stats.mttr_avg`          | Horas promedio de reparación       |
| Riesgo Crítico (IA)       | `stats.criticos_ia`       | Activos con probabilidad falla >75%|

**Sección 2: Gráficos**
- **Gráfico de líneas** (`GradientLineChart`): Tendencia de 6 meses de mantenimientos preventivos vs correctivos.
- **Gráfico Doughnut** (`DoughnutChart`): Distribución de activos por perfil de uso (Oficina, Intensivo, Crítico, N/A).

**Sección 3: Tablas**
- **Top 5 Riesgo Inminente:** Lista los 5 activos con mayor probabilidad de falla.
- **Estado de Salud por Regional:** Tabla con nombre regional, cantidad de equipos, barra de progreso de salud fuzzy y estatus (Crítico/Estable).

**Sección 4: Decisión Prescriptiva**
- Card oscuro con recomendación del Random Forest sobre el próximo activo a intervenir.
- Botón "Generar Orden de Trabajo".

---

### 9.3. Gestión de Activos

#### `ManagementActivos.vue` — Tabla de Gestión (~17KB)

**Datos:** `GET /api/gestion-activos/`

- Tabla completa de todos los activos con columnas: código, nombre, tipo, grupo contable, ubicación, regional, estado, situación, probabilidad de falla.
- **Filtros:** Por grupo contable, tipo de activo, regional, ubicación, estado, situación, perfil de uso.
- **Búsqueda global:** Por código TAMEP, nombre, serie, descripción.
- **Acciones por fila:** Ver detalle, gestionar.
- Incluye historial de custodios integrado.

---

### 9.4. Registro de Activos

#### `NewActivos.vue` — Formulario de Registro (~25KB)

**Datos iniciales:** `GET /api/activos/parametros_iniciales/`

**Formulario de múltiples secciones:**
1. **Identificación:** Código TAMEP, código histórico, nombre específico.
2. **Clasificación:** Grupo contable (selector) → Tipo de activo (selector encadenado).
3. **Detalles técnicos:** Serial, descripción, especificaciones.
4. **Datos financieros:** Costo, fecha de adquisición.
5. **Ubicación:** Ubicación base (selector con regional).
6. **Estado:** Estado físico, perfil de uso.
7. **Imágenes:** Foto del activo, foto del serial, foto de placa técnica (upload).

**Comportamiento:**
- Los selectores de tipo de activo se cargan dinámicamente según el grupo contable seleccionado (`api.get("activos/tipos_por_grupo/{id}/")`).
- El perfil de uso se habilita/deshabilita según si el grupo contable tiene IA predictiva.
- Al enviar: `POST /api/activos/` con `FormData` (por las imágenes).

---

### 9.5. Asignación de Activos

#### `AsingActivos.vue` — Módulo de Asignación (~15KB)

**Datos:** `GET /api/designaciones/estructura_completa/`

**Flujo:**
1. Seleccionar un activo disponible de la lista.
2. Seleccionar usuario receptor usando filtros encadenados:
   - Regional → Gerencia → Cargo → Usuario.
3. Definir tipo (Permanente/Temporal).
4. Si es temporal, establecer fecha de devolución.
5. Seleccionar ubicación de destino.
6. Enviar: `POST /api/designaciones/`

**Acción de devolución:** `POST /api/designaciones/{id}/devolver/`

---

### 9.6. Transferencias

#### `Transferencias.vue` — Módulo de Transferencias (~13KB)

**Flujo de búsqueda:** `GET /api/transferencias/buscar-activo/?codigo={codigo}`

**Flujo completo:**
1. Ingresar código TAMEP del activo → Se auto-carga la info del custodio actual (emisor).
2. Seleccionar receptor con filtros encadenados:
   - Regional → Gerencia → Cargo → Usuario.
3. Seleccionar ubicación destino.
4. Ingresar número de acta y motivo.
5. Seleccionar tipo: Transferencia (`TR`) o Devolución (`DE`).
6. Enviar: `POST /api/transferencias/`

**Filtros encadenados del receptor:**
- `GET /api/transferencias/regionales/`
- `GET /api/transferencias/gerencias/?regional={id}`
- `GET /api/transferencias/cargos/?gerencia={id}`
- `GET /api/transferencias/usuarios/?cargo={id}`

---

### 9.7. Baja de Activos

#### `RealizarBaja.vue` — Desincorporación (~9KB)

**Datos iniciales:** `GET /api/operacion-baja/datos_formulario/`

**Formulario:**
- Selección del activo (debe estar Disponible o Asignado).
- Selección del solicitante (solo staff/admin).
- Número correlativo de baja.
- Motivo (Obsolescencia, Daño, Pérdida).
- Descripción técnica / justificación.
- Documento de respaldo (PDF upload).

**Envío:** `POST /api/operacion-baja/`

---

### 9.8. Solicitudes de Mantenimiento

#### `Solicitud-mantenimiento.vue` (~9KB)

**Datos:** `GET /api/solicitudes/`

**Funcionalidad:**
- Los usuarios crean tickets de soporte seleccionando:
  - Activo afectado.
  - Tipo de solicitud (Mantenimiento, Servicio, Ayuda).
  - Severidad (Baja, Media, Alta).
  - Descripción del problema y requerimiento.
- El ticket se genera automáticamente con formato `TKT-{año}-{correlativo}`.
- Tabla de solicitudes con estado derivado: Pendiente / En Proceso / Cerrado.

---

### 9.9. Historial de Mantenimiento

#### `HistorialMantenimiento.vue` (~9KB)

**Datos:** `GET /api/intervenciones/historial/{activo_id}/`

**Funcionalidad:**
- Búsqueda de activo por código.
- Tabla con historial de intervenciones: tipo, categoría, modalidad, diagnóstico, reparación, fechas, costo, técnico.
- Muestra la hoja de vida técnica completa del equipo.

---

### 9.10. Reportes y Estadísticas

#### `Reportes.vue` (~12KB)

**Datos:** `GET /api/gestion-activos/`

**Funcionalidad:**
- Tabla de activos con filtros avanzados (grupo contable, tipo, regional, estado, situación).
- **Exportación a PDF** usando `jsPDF` + `jspdf-autotable`.
- **Exportación a Excel** (formato CSV/XLSX).
- Estadísticas resumidas con contadores.

---

### 9.11. Monitoreo por Regional

#### `Monitoreo.vue` (~12KB)

**Funcionalidad:**
- Vista de activos agrupados por regional.
- Indicadores de salud fuzzy por regional.
- Filtro por regional para ver activos específicos.
- Barras de progreso coloreadas según nivel de salud.

---

### 9.12. Módulo Predictivo (IA)

#### `ModuloPredictivo.vue` (~12KB)

**Datos:** `GET /api/activos/` + `prediccion` (datos del modelo MetricaPredictiva)

**Funcionalidad:**
- Tabla de activos con datos predictivos: MTBF, MTTR, probabilidad de falla, índice de salud fuzzy.
- Iconos de nivel de riesgo (BAJO, MODERADO, CRÍTICO) con colores dinámicos.
- Recomendación de IA para cada equipo.
- Filtros por nivel de riesgo y grupo contable.
- Detalle expandible con métricas completas.

---

### 9.13. Configuración Difusa

#### `ConfiguracionDifusa.vue` (~10KB)

**Funcionalidad:**
- Visualización de los parámetros de la lógica difusa.
- Configuración de umbrales y pesos para el cálculo de salud.
- Vista informativa de las fórmulas utilizadas.

---

### 9.14. Perfil de Usuario

#### `Profile.vue` (~9KB)

**Datos:** `GET /api/me/`

**Funcionalidad:**
- Muestra datos del usuario: nombre, apellido, email, CI, extensión, teléfono, cargo, regional, gerencia.
- Edición de datos personales: `PATCH /api/me/`.
- Cambio de contraseña.
- Información de cargo y departamento (solo lectura).

---

### 9.15. Administración de Usuarios

#### `NewUsers.vue` — Crear Usuarios (~6KB)
- Formulario para crear nuevos usuarios con asignación de regional, gerencia, cargo.

#### `UsuariosRegistrados.vue` — Administrar Usuarios (~10KB)
- Tabla de todos los usuarios registrados.
- Búsqueda y filtros.
- Acciones: editar, activar/desactivar.

---

## 10. Componentes Reutilizables (Argon)

El frontend utiliza la librería de componentes de **Argon Dashboard 2** de Creative Tim:

| Componente              | Descripción                                    | Props principales                     |
|-------------------------|------------------------------------------------|---------------------------------------|
| `ArgonButton`           | Botón estilizado con gradientes               | `color`, `size`, `fullWidth`, `type`  |
| `ArgonInput`            | Campo de texto con icono y validación          | `type`, `placeholder`, `size`, `icon` |
| `ArgonAlert`            | Alerta dismissible con colores                | `color`, `dismissible`               |
| `ArgonBadge`            | Etiqueta/badge para estados                   | `color`, `size`, `rounded`           |
| `ArgonAvatar`           | Avatar circular con imagen                    | `img`, `size`, `shadow`              |
| `ArgonCheckbox`         | Checkbox estilizado                           | `id`, `name`                         |
| `ArgonRadio`            | Radio button                                  | `id`, `name`                         |
| `ArgonSwitch`           | Toggle switch                                 | `id`, `name`                         |
| `ArgonTextarea`         | Área de texto                                 | `placeholder`                        |
| `ArgonProgress`         | Barra de progreso                             | `percentage`, `color`                |
| `ArgonPagination`       | Contenedor de paginación                      | —                                    |
| `ArgonPaginationItem`   | Ítem individual de paginación                 | `label`, `active`, `disabled`        |

Además, los componentes de layout incluyen:
- `MiniStatisticsCard` — Cards de KPI con ícono, valor y descripción.
- `GradientLineChart` — Gráfico de líneas con gradiente (Chart.js).
- `DoughnutChart` — Gráfico circular (Chart.js).

---

## 11. Dependencias del Proyecto

### Dependencias de producción

| Paquete                   | Uso                                         |
|---------------------------|---------------------------------------------|
| `vue` (3.4.19)            | Framework reactivo                          |
| `vue-router` (4.3.0)      | Enrutamiento SPA                            |
| `vuex` (4.1.0)            | Gestión de estado global                    |
| `axios` (1.13.4)          | Cliente HTTP para la API REST               |
| `bootstrap` (5.3.3)       | Framework CSS base                          |
| `@popperjs/core` (2.11.8) | Tooltips y popovers de Bootstrap            |
| `chart.js` (4.4.1)        | Motor de renderizado de gráficos            |
| `vue-chartjs` (5.3.3)     | Wrapper de Chart.js para Vue                |
| `jspdf` (4.1.0)           | Generación de documentos PDF                |
| `jspdf-autotable` (5.0.7) | Tablas automáticas en PDF                   |
| `html2pdf.js` (0.14.0)    | Conversión HTML a PDF                       |
| `sweetalert2` (11.26.18)  | Alertas y modales elegantes                 |
| `vue-flatpickr-component` | Selector de fechas avanzado                 |
| `dropzone` (6.0.0-beta.2) | Upload drag-and-drop de archivos            |
| `quill` (1.3.7)           | Editor de texto enriquecido                 |
| `vue-count-to` (1.0.13)   | Animaciones de conteo numérico              |

### Dependencias de desarrollo

| Paquete                    | Uso                                        |
|----------------------------|---------------------------------------------|
| `@vue/cli-service` (5.0.8) | Build y dev server                         |
| `@vue/cli-plugin-babel`    | Transpilación ES6+                          |
| `@vue/cli-plugin-eslint`   | Integración ESLint                          |
| `@vue/cli-plugin-router`   | Plugin de router                            |
| `sass` (1.71.1)            | Preprocesador CSS                           |
| `sass-loader` (13.3.2)     | Loader de Sass para webpack                 |
| `eslint` (8.56.0)          | Linting de código                           |
| `prettier` (3.2.5)         | Formateo de código                          |
| `cross-env` (7.0.3)        | Variables de entorno cross-platform         |

---

> **Resumen:** El frontend es una **SPA** construida sobre Vue 3 con template Argon Dashboard. Consume la API REST de Django mediante una instancia centralizada de Axios con manejo automático de JWT. Incluye módulos de gestión de activos, mantenimiento, transferencias, reportes con exportación PDF/Excel, y un módulo de analítica predictiva con visualización de las métricas de IA (MTBF, MTTR, salud fuzzy, probabilidad de falla del Random Forest).
