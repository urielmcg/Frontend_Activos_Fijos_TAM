<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import Swal from 'sweetalert2';

const loading = ref(true);
const regionalesData = ref([]);
const regionalSeleccionada = ref(null);
const activosRegional = ref([]);
const cargandoDetalle = ref(false);

const cargarDatos = async () => {
  try {
    const res = await api.get('dashboard/stats/');
    regionalesData.value = res.data.regionales || [];
  } catch (error) {
    Swal.fire('Error', 'No se pudieron cargar los datos de monitoreo.', 'error');
  } finally {
    loading.value = false;
  }
};

const verDetalleRegional = async (regional) => {
  regionalSeleccionada.value = regional;
  cargandoDetalle.value = true;
  try {
    // Buscar activos de esta regional usando el nombre
    const res = await api.get(`gestion-activos/?search=${regional.nombre}`);
    activosRegional.value = res.data.results || res.data;
  } catch (error) {
    Swal.fire('Error', 'No se pudieron cargar los activos de esta regional.', 'error');
  } finally {
    cargandoDetalle.value = false;
  }
};

const cerrarDetalle = () => {
  regionalSeleccionada.value = null;
  activosRegional.value = [];
};

const colorSalud = (salud) => {
  if (salud >= 70) return '#2dce89';
  if (salud >= 40) return '#fb6340';
  return '#f5365c';
};

const textoEstado = (salud) => {
  if (salud >= 70) return 'Estable';
  if (salud >= 40) return 'Alerta';
  return 'Crítico';
};

const classBadgeEstado = (salud) => {
  if (salud >= 70) return 'bg-gradient-success';
  if (salud >= 40) return 'bg-gradient-warning';
  return 'bg-gradient-danger';
};

const badgeSituacion = (sit) => {
  const map = {
    'Disponible': 'bg-gradient-info',
    'Asignado': 'bg-gradient-success',
    'Mantenimiento': 'bg-gradient-warning',
    'Baja': 'bg-gradient-danger'
  };
  return map[sit] || 'bg-secondary';
};

onMounted(() => {
  cargarDatos();
});
</script>

<template>
  <div class="container-fluid py-4">
    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-grow text-primary" role="status"></div>
      <h5 class="mt-3">Sincronizando datos por regional...</h5>
    </div>

    <div v-else>
      <!-- Header -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="card bg-gradient-dark">
            <div class="card-body p-4">
              <div class="row align-items-center">
                <div class="col-auto">
                  <div class="icon icon-shape bg-white shadow text-center border-radius-md">
                    <i class="ni ni-world-2 text-dark text-lg"></i>
                  </div>
                </div>
                <div class="col">
                  <h5 class="text-white mb-0">Monitoreo por Regional</h5>
                  <p class="text-white text-sm opacity-8 mb-0">
                    Estado de salud de activos fijos por sede operativa - {{ regionalesData.length }} regionales activas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cards de Regionales -->
      <div class="row" v-if="!regionalSeleccionada">
        <div class="col-xl-4 col-md-6 mb-4" v-for="regional in regionalesData" :key="regional.nombre">
          <div class="card h-100 shadow-lg cursor-pointer" @click="verDetalleRegional(regional)" style="cursor: pointer; transition: transform 0.2s;"
            @mouseenter="$event.currentTarget.style.transform='translateY(-5px)'"
            @mouseleave="$event.currentTarget.style.transform='translateY(0)'">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 class="font-weight-bolder mb-0">{{ regional.nombre }}</h6>
                  <p class="text-xs text-secondary mb-0">{{ regional.cantidad }} activos registrados</p>
                </div>
                <span :class="['badge', classBadgeEstado(regional.salud)]">
                  {{ textoEstado(regional.salud) }}
                </span>
              </div>

              <!-- Barra de salud -->
              <label class="text-xxs font-weight-bold text-uppercase text-secondary mb-1 d-block">Salud Promedio</label>
              <div class="d-flex align-items-center mb-3">
                <div class="progress w-100 me-2" style="height: 10px;">
                  <div class="progress-bar" role="progressbar"
                    :style="{ width: regional.salud + '%', backgroundColor: colorSalud(regional.salud) }">
                  </div>
                </div>
                <span class="text-sm font-weight-bolder" :style="{ color: colorSalud(regional.salud) }">
                  {{ regional.salud }}%
                </span>
              </div>

              <!-- Métricas -->
              <div class="row text-center">
                <div class="col-4">
                  <h5 class="mb-0 font-weight-bolder">{{ regional.cantidad }}</h5>
                  <p class="text-xxs text-secondary text-uppercase mb-0">Total</p>
                </div>
                <div class="col-4">
                  <h5 class="mb-0 font-weight-bolder text-danger">{{ regional.criticos || 0 }}</h5>
                  <p class="text-xxs text-secondary text-uppercase mb-0">Críticos</p>
                </div>
                <div class="col-4">
                  <h5 class="mb-0 font-weight-bolder text-info">{{ regional.salud }}%</h5>
                  <p class="text-xxs text-secondary text-uppercase mb-0">Salud</p>
                </div>
              </div>
            </div>

            <div class="card-footer p-2 text-center border-0">
              <span class="text-xs text-primary font-weight-bold">
                <i class="fas fa-arrow-right me-1"></i> Ver activos
              </span>
            </div>
          </div>
        </div>

        <div v-if="regionalesData.length === 0" class="col-12 text-center py-5">
          <p class="text-muted">No hay datos de regionales disponibles.</p>
        </div>
      </div>

      <!-- Tabla Resumen Comparativo -->
      <div class="card shadow-lg mt-4" v-if="!regionalSeleccionada">
        <div class="card-header pb-0">
          <h6 class="mb-0">Comparativa de Regionales</h6>
          <p class="text-xs text-secondary">Resumen consolidado de todas las sedes</p>
        </div>
        <div class="table-responsive">
          <table class="table align-items-center mb-0">
            <thead>
              <tr>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-4">Regional</th>
                <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Activos</th>
                <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Salud Fuzzy</th>
                <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Críticos</th>
                <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in regionalesData" :key="r.nombre + '-tabla'">
                <td class="ps-4">
                  <h6 class="mb-0 text-sm">{{ r.nombre }}</h6>
                </td>
                <td class="text-center">
                  <span class="text-xs font-weight-bold">{{ r.cantidad }}</span>
                </td>
                <td class="align-middle text-center">
                  <div class="d-flex align-items-center justify-content-center px-4">
                    <span class="me-2 text-xs font-weight-bold">{{ r.salud }}%</span>
                    <div class="progress w-100" style="height: 8px;">
                      <div class="progress-bar" role="progressbar"
                        :style="{ width: r.salud + '%', backgroundColor: colorSalud(r.salud) }">
                      </div>
                    </div>
                  </div>
                </td>
                <td class="text-center">
                  <span :class="['text-xs font-weight-bold', r.criticos > 0 ? 'text-danger' : 'text-success']">
                    {{ r.criticos || 0 }}
                  </span>
                </td>
                <td class="text-center">
                  <span :class="['badge badge-sm', classBadgeEstado(r.salud)]">{{ textoEstado(r.salud) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detalle de Regional -->
      <div v-if="regionalSeleccionada">
        <div class="d-flex align-items-center mb-4">
          <button class="btn btn-sm btn-outline-dark me-3 mb-0" @click="cerrarDetalle">
            <i class="fas fa-arrow-left me-1"></i> Volver
          </button>
          <div>
            <h5 class="mb-0 font-weight-bolder">{{ regionalSeleccionada.nombre }}</h5>
            <p class="text-xs text-secondary mb-0">
              {{ regionalSeleccionada.cantidad }} activos | Salud: {{ regionalSeleccionada.salud }}%
            </p>
          </div>
        </div>

        <div v-if="cargandoDetalle" class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
        </div>

        <div v-else class="card shadow-lg">
          <div class="card-body px-0 pt-0 pb-2">
            <div class="table-responsive p-0">
              <table class="table align-items-center mb-0">
                <thead>
                  <tr>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Activo</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Ubicación</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Custodio</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Situación</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Estado</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Prob. Falla</th>
                    <th class="text-secondary opacity-7"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="activosRegional.length === 0">
                    <td colspan="7" class="text-center py-4 text-muted">No se encontraron activos en esta regional.</td>
                  </tr>
                  <tr v-for="a in activosRegional" :key="a.id">
                    <td>
                      <div class="d-flex px-2 py-1">
                        <div class="d-flex flex-column justify-content-center">
                          <h6 class="mb-0 text-sm">{{ a.nombre_especifico }}</h6>
                          <p class="text-xs text-secondary mb-0">{{ a.codigo_tamep }}</p>
                        </div>
                      </div>
                    </td>
                    <td><p class="text-xs mb-0">{{ a.ubicacion_nombre || '-' }}</p></td>
                    <td><p class="text-xs mb-0">{{ a.custodio_actual || 'Sin asignar' }}</p></td>
                    <td class="text-center">
                      <span :class="['badge badge-sm', badgeSituacion(a.situacion_activo)]">{{ a.situacion_activo }}</span>
                    </td>
                    <td class="text-center"><span class="text-xs font-weight-bold">{{ a.estado_actual }}</span></td>
                    <td class="text-center">
                      <span :class="['text-xs font-weight-bold', a.probabilidad_falla >= 70 ? 'text-danger' : a.probabilidad_falla >= 40 ? 'text-warning' : 'text-success']">
                        {{ a.probabilidad_falla != null ? a.probabilidad_falla.toFixed(1) + '%' : '-' }}
                      </span>
                    </td>
                    <td class="align-middle">
                      <router-link :to="`/activo/detalle/${a.id}`" class="text-secondary font-weight-bold text-xs">
                        Detalle
                      </router-link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
