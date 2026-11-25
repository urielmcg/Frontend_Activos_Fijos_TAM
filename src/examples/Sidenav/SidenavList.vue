<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import { tieneAcceso, seccionVisible } from "@/utils/roles.js";

import SidenavItem from "./SidenavItem.vue";

const store = useStore();
const isRTL = computed(() => store.state.isRTL);

const getRoute = () => {
  const route = useRoute();
  const routeArr = route.path.split("/");
  return routeArr[1];
};
</script>

<template>
  <div class="navbar-collapse w-auto" id="sidenav-collapse-main">
    <ul class="navbar-nav">
      <li class="nav-item">
        <sidenav-item to="/dashboard-default" :class="getRoute() === 'dashboard-default' ? 'active' : ''"
          :navText="isRTL ? 'لوحة القيادة' : 'Inicio'">
          <template v-slot:icon>
            <i class="ni ni-tv-2 text-primary text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <!-- === SECCION: ACTIVOS FIJOS === -->
      <li class="mt-3 nav-item" v-if="seccionVisible('activos_fijos')">
        <h6 class="text-xs ps-4 text-uppercase font-weight-bolder opacity-6" :class="isRTL ? 'me-4' : 'ms-2'">
          Activos Fijos
        </h6>
      </li>
      <li class="nav-item" v-if="tieneAcceso('Gestion de Activos')">
        <sidenav-item to="/Gestion de Activos" :class="getRoute() === 'Gestion de Activos' ? 'active' : ''"
          :navText="'Gestión de Activos'">
          <template v-slot:icon>
            <i class="ni ni-bullet-list-67 text-warning text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>
      <li class="nav-item" v-if="tieneAcceso('Nuevos Activos')">
        <sidenav-item to="/Nuevos Activos" :class="getRoute() === 'Nuevos Activos' ? 'active' : ''"
          :navText="'Registro de Activos'">
          <template v-slot:icon>
            <i class="ni ni-archive-2 text-warning text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <li class="nav-item" v-if="tieneAcceso('Asignar Activos')">
        <sidenav-item to="/Asignar Activos" :class="getRoute() === 'Asignar Activos' ? 'active' : ''"
          :navText="'Asignación de Activos'">
          <template v-slot:icon>
            <i class="ni ni-send text-warning text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>
      <li class="nav-item" v-if="tieneAcceso('Transferencias')">
        <sidenav-item to="/Transferencias" :class="getRoute() === 'Transferencias' ? 'active' : ''"
          :navText="'Transferencia de Activos'">
          <template v-slot:icon>
            <i class="ni ni-send text-warning text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <li class="nav-item" v-if="tieneAcceso('telemetria')">
        <sidenav-item to="/telemetria" :class="getRoute() === 'telemetria' ? 'active' : ''"
          :navText="'Gestion de Baja'">
          <template v-slot:icon>
            <i class="ni ni-chart-pie-35 text-info text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <li class="nav-item" v-if="tieneAcceso('Reportes')">
        <sidenav-item to="/Reportes" :class="getRoute() === 'Reportes' ? 'active' : ''"
          :navText="'Reportes y Estadísticas'">
          <template v-slot:icon>
            <i class="ni ni-chart-bar-32 text-success text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <li class="nav-item" v-if="tieneAcceso('Monitoreo')">
        <sidenav-item to="/Monitoreo" :class="getRoute() === 'Monitoreo' ? 'active' : ''"
          :navText="'Monitoreo por Regional'">
          <template v-slot:icon>
            <i class="ni ni-world-2 text-danger text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <!-- === SECCION: SOPORTE === -->
      <li class="mt-3 nav-item" v-if="seccionVisible('soporte')">
        <h6 class="text-xs ps-4 text-uppercase font-weight-bolder opacity-6" :class="isRTL ? 'me-4' : 'ms-2'">
          Informatica Y Comunicaciones
        </h6>
      </li>

      <li class="nav-item" v-if="tieneAcceso('solicitud-mantenimiento')">
        <sidenav-item to="/solicitud-mantenimiento" :class="getRoute() === 'solicitud-mantenimiento' ? 'active' : ''"
          :navText="'Solicitud de Mantenimiento'">
          <template v-slot:icon>
            <i class="ni ni-settings text-success text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>
      <li class="nav-item" v-if="tieneAcceso('Historial')">
        <sidenav-item to="/Historial" :class="getRoute() === 'Historial' ? 'active' : ''"
          :navText="'Historial de Mantenimiento'">
          <template v-slot:icon>
            <i class="ni ni-bullet-list-67 text-danger text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <!-- === SECCION: IA === -->
      <li class="mt-3 nav-item" v-if="seccionVisible('ia')">
        <h6 class="text-xs ps-4 text-uppercase font-weight-bolder opacity-6" :class="isRTL ? 'me-4' : 'ms-2'">
          Analitica Predictiva (IA)
        </h6>
      </li>

      <li class="nav-item" v-if="tieneAcceso('modulo-predictivo')">
        <sidenav-item to="/modulo-predictivo" :class="getRoute() === 'modulo-predictivo' ? 'active' : ''"
          :navText="'Pronóstico de Fallas'">
          <template v-slot:icon>
            <i class="ni ni-atom text-info text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <li class="nav-item" v-if="tieneAcceso('configuracion-difusa')">
        <sidenav-item to="/configuracion-difusa" :class="getRoute() === 'configuracion-difusa' ? 'active' : ''"
          :navText="'Configuración Difusa'">
          <template v-slot:icon>
            <i class="ni ni-settings-gear-65 text-dark text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <!-- === SECCION: USUARIOS === -->
      <li class="mt-3 nav-item" v-if="seccionVisible('usuarios')">
        <h6 class="text-xs ps-4 text-uppercase font-weight-bolder opacity-6" :class="isRTL ? 'me-4' : 'ms-2'">
          Administracion de Usuarios
        </h6>
      </li>

      <li class="nav-item">
        <sidenav-item to="/profile" :class="getRoute() === 'profile' ? 'active' : ''"
          :navText="'Perfil'">
          <template v-slot:icon>
            <i class="ni ni-single-02 text-dark text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <li class="nav-item" v-if="tieneAcceso('Nuevos Usuarios')">
        <sidenav-item to="/Nuevos Usuarios" :class="getRoute() === 'Nuevos Usuarios' ? 'active' : ''"
          :navText="'Crear Usuarios'">
          <template v-slot:icon>
            <i class="ni ni-circle-08 text-danger text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <li class="nav-item" v-if="tieneAcceso('Personal')">
        <sidenav-item to="/Personal" :class="getRoute() === 'Personal' ? 'active' : ''"
          :navText="'Administrar Usuarios'">
          <template v-slot:icon>
            <i class="ni ni-badge text-warning text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

      <li class="nav-item" v-if="store.state.mostrarAuditoria && tieneAcceso('auditoria')">
        <sidenav-item to="/auditoria" :class="getRoute() === 'auditoria' ? 'active' : ''"
          :navText="'Auditoría'">
          <template v-slot:icon>
            <i class="ni ni-collection text-dark text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

    </ul>
  </div>
</template>
<style>
/* 1. El contenedor principal (Aside) DEBE permitir que el contenido fluya */
.sidenav {
  overflow: hidden !important;
}

/* 2. El contenedor de la lista (Collapse) debe tener SCROLL activo pero oculto */
#sidenav-collapse-main {
  /* Permitimos el movimiento vertical */
  overflow-y: auto !important;
  overflow-x: hidden !important;

  /* Ajustamos la altura para que no choque con el logo */
  height: calc(100vh - 120px) !important;

  /* OCULTAR BARRA EN FIREFOX */
  scrollbar-width: none !important;

  /* OCULTAR BARRA EN IE/EDGE */
  -ms-overflow-style: none !important;
}

/* 3. OCULTAR BARRA EN CHROME, SAFARI Y BRAVE (WebKit) */
#sidenav-collapse-main::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  background: transparent !important;
}

/* 4. Limpieza de sombras y elementos que tapan el menú */
.navbar-vertical .navbar-collapse:after {
  display: none !important;
}

.sidenav-footer {
  display: none !important;
}

/* 5. OPCIONAL: Agrega un padding al final de la lista
      para que el último ítem no quede pegado al borde al bajar */
.navbar-nav {
  padding-bottom: 40px !important;
}
</style>
