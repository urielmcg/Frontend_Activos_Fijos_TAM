<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import Swal from 'sweetalert2';

const loading = ref(true);
const resumenIA = ref({ total_activos: 0, riesgo_critico: 0, salud_degradada: 0, mantenimientos_pendientes: 0 });
const activos = ref([]);
const activoDetalle = ref(null);
const modalVisible = ref(false);

const obtenerDatos = async () => {
  try {
    const [resResumen, resActivos] = await Promise.all([
      api.get('activos/resumen_ia/'),
      api.get('gestion-activos/?ordering=-probabilidad_falla')
    ]);
    resumenIA.value = resResumen.data;
    activos.value = (resActivos.data.results || resActivos.data);
  } catch (error) {
    Swal.fire('Error', 'No se pudieron cargar los datos predictivos.', 'error');
  } finally {
    loading.value = false;
  }
};

const verDetalle = async (activoId) => {
  try {
    const res = await api.get(`activos/${activoId}/`);
    activoDetalle.value = res.data;
    modalVisible.value = true;
  } catch (error) {
    Swal.fire('Error', 'No se pudo cargar el detalle del activo.', 'error');
  }
};

const cerrarModal = () => {
  modalVisible.value = false;
  activoDetalle.value = null;
};

const colorRiesgo = (prob) => {
  if (!prob && prob !== 0) return 'text-muted';
  if (prob >= 70) return 'text-danger';
  if (prob >= 40) return 'text-warning';
  return 'text-success';
};

const badgeRiesgo = (estadoIA) => {
  if (!estadoIA) return 'bg-secondary';
  const lower = estadoIA.toLowerCase();
  if (lower.includes('alto') || lower.includes('crít')) return 'bg-danger';
  if (lower.includes('moder') || lower.includes('medio')) return 'bg-warning';
  return 'bg-success';
};

const colorSalud = (valor) => {
  if (!valor && valor !== 0) return 'text-muted';
  if (valor >= 70) return 'text-success';
  if (valor >= 40) return 'text-warning';
  return 'text-danger';
};

onMounted(() => {
  obtenerDatos();
});
</script>

<template>
  <div class="container-fluid py-4">
    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-grow text-primary" role="status"></div>
      <h5 class="mt-3">Procesando Modelo Predictivo...</h5>
    </div>

    <div v-else>
      <!-- KPI Cards -->
      <div class="row mb-4">
        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <div class="card">
            <div class="card-body p-3">
              <div class="row">
                <div class="col-8">
                  <div class="numbers">
                    <p class="text-sm mb-0 text-uppercase font-weight-bold">Activos Monitoreados</p>
                    <h5 class="font-weight-bolder">{{ resumenIA.total_activos }}</h5>
                  </div>
                </div>
                <div class="col-4 text-end">
                  <div class="icon icon-shape bg-gradient-primary shadow-primary text-center border-radius-md">
                    <i class="ni ni-laptop text-lg opacity-10"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <div class="card">
            <div class="card-body p-3">
              <div class="row">
                <div class="col-8">
                  <div class="numbers">
                    <p class="text-sm mb-0 text-uppercase font-weight-bold">Riesgo Crítico</p>
                    <h5 class="font-weight-bolder text-danger">{{ resumenIA.riesgo_critico }}</h5>
                  </div>
                </div>
                <div class="col-4 text-end">
                  <div class="icon icon-shape bg-gradient-danger shadow-danger text-center border-radius-md">
                    <i class="ni ni-active-40 text-lg opacity-10"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <div class="card">
            <div class="card-body p-3">
              <div class="row">
                <div class="col-8">
                  <div class="numbers">
                    <p class="text-sm mb-0 text-uppercase font-weight-bold">Salud Degradada</p>
                    <h5 class="font-weight-bolder text-warning">{{ resumenIA.salud_degradada }}</h5>
                  </div>
                </div>
                <div class="col-4 text-end">
                  <div class="icon icon-shape bg-gradient-warning shadow-warning text-center border-radius-md">
                    <i class="ni ni-sound-wave text-lg opacity-10"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-sm-6">
          <div class="card">
            <div class="card-body p-3">
              <div class="row">
                <div class="col-8">
                  <div class="numbers">
                    <p class="text-sm mb-0 text-uppercase font-weight-bold">Mant. Pendientes</p>
                    <h5 class="font-weight-bolder text-info">{{ resumenIA.mantenimientos_pendientes }}</h5>
                  </div>
                </div>
                <div class="col-4 text-end">
                  <div class="icon icon-shape bg-gradient-info shadow-info text-center border-radius-md">
                    <i class="ni ni-settings text-lg opacity-10"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Activos por Riesgo -->
      <div class="card shadow-lg">
        <div class="card-header pb-0">
          <h6 class="mb-0"><i class="ni ni-atom text-primary me-2"></i>Activos Ordenados por Probabilidad de Falla</h6>
          <p class="text-xs text-secondary mb-0">Modelo Random Forest - Análisis predictivo de confiabilidad</p>
        </div>
        <div class="card-body px-0 pt-0 pb-2">
          <div class="table-responsive p-0">
            <table class="table align-items-center mb-0">
              <thead>
                <tr>
                  <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Activo</th>
                  <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Regional</th>
                  <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Custodio</th>
                  <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Prob. Falla</th>
                  <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Estado IA</th>
                  <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Situación</th>
                  <th class="text-secondary opacity-7"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="activos.length === 0">
                  <td colspan="7" class="text-center py-4 text-muted">No hay datos disponibles.</td>
                </tr>
                <tr v-for="a in activos" :key="a.id">
                  <td>
                    <div class="d-flex px-2 py-1">
                      <div class="d-flex flex-column justify-content-center">
                        <h6 class="mb-0 text-sm">{{ a.nombre_especifico }}</h6>
                        <p class="text-xs text-secondary mb-0">{{ a.codigo_tamep }}</p>
                      </div>
                    </div>
                  </td>
                  <td><p class="text-xs font-weight-bold mb-0">{{ a.regional_nombre || '-' }}</p></td>
                  <td><p class="text-xs mb-0">{{ a.custodio_actual || 'Sin asignar' }}</p></td>
                  <td class="text-center">
                    <span :class="['text-sm font-weight-bolder', colorRiesgo(a.probabilidad_falla)]">
                      {{ a.probabilidad_falla != null ? a.probabilidad_falla.toFixed(1) + '%' : '-' }}
                    </span>
                  </td>
                  <td class="text-center">
                    <span :class="['badge badge-sm', badgeRiesgo(a.estado_ia)]">{{ a.estado_ia || 'Sin datos' }}</span>
                  </td>
                  <td class="text-center">
                    <span class="text-xs font-weight-bold">{{ a.situacion_activo }}</span>
                  </td>
                  <td class="align-middle">
                    <a href="javascript:;" class="text-secondary font-weight-bold text-xs" @click="verDetalle(a.id)">
                      Ver Detalle
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Detalle Predictivo -->
    <div v-if="modalVisible && activoDetalle" class="modal-overlay" @click.self="cerrarModal">
      <div class="modal-container">
        <div class="modal-header-pred p-3">
          <h6 class="mb-0 text-white"><i class="ni ni-atom me-2"></i>Análisis Predictivo - {{ activoDetalle.codigo_tamep }}</h6>
          <button @click="cerrarModal" class="btn-close-custom">&times;</button>
        </div>
        <div class="p-4 bg-white">
          <h6 class="font-weight-bold mb-3">{{ activoDetalle.nombre_especifico }}</h6>

          <div class="row text-center mb-4" v-if="activoDetalle.prediccion">
            <div class="col-3">
              <h4 :class="colorSalud(activoDetalle.prediccion.indice_salud_fuzzy)">{{ activoDetalle.prediccion.indice_salud_fuzzy }}%</h4>
              <p class="text-xxs text-uppercase font-weight-bold mb-0">Salud Fuzzy</p>
            </div>
            <div class="col-3">
              <h4 class="text-dark">{{ activoDetalle.prediccion.mtbf }}</h4>
              <p class="text-xxs text-uppercase font-weight-bold mb-0">MTBF (hrs)</p>
            </div>
            <div class="col-3">
              <h4 class="text-warning">{{ activoDetalle.prediccion.mttr }}</h4>
              <p class="text-xxs text-uppercase font-weight-bold mb-0">MTTR (hrs)</p>
            </div>
            <div class="col-3">
              <h4 class="text-danger">{{ (activoDetalle.prediccion.probabilidad_falla || 0).toFixed(1) }}%</h4>
              <p class="text-xxs text-uppercase font-weight-bold mb-0">Prob. Falla</p>
            </div>
          </div>

          <div v-if="activoDetalle.prediccion?.recomendacion_ia" class="bg-gray-100 p-3 border-radius-lg mb-3">
            <h6 class="text-sm mb-1">Recomendación IA:</h6>
            <p class="text-sm mb-0">{{ activoDetalle.prediccion.recomendacion_ia }}</p>
          </div>

          <div class="row">
            <div class="col-6">
              <p class="text-xs text-secondary mb-1">Estado Físico: <strong>{{ activoDetalle.estado_actual }}</strong></p>
              <p class="text-xs text-secondary mb-1">Perfil de Uso: <strong>{{ activoDetalle.perfil_uso }}</strong></p>
            </div>
            <div class="col-6">
              <p class="text-xs text-secondary mb-1">Fallas Registradas: <strong>{{ activoDetalle.contador_fallas }}</strong></p>
              <p class="text-xs text-secondary mb-1">Horas Soporte: <strong>{{ activoDetalle.prediccion?.horas_soporte_acumuladas || 0 }} hrs</strong></p>
            </div>
          </div>

          <div class="text-end mt-3">
            <button @click="$router.push(`/activo/detalle/${activoDetalle.id}`)" class="btn btn-sm btn-dark me-2">Ver Ficha Completa</button>
            <button @click="cerrarModal" class="btn btn-sm btn-outline-secondary">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 51, 102, 0.8); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal-container { background: white; width: 90%; max-width: 600px; border-radius: 8px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.3); }
.modal-header-pred { background: linear-gradient(135deg, #003366 0%, #001d3d 100%); display: flex; justify-content: space-between; align-items: center; }
.btn-close-custom { background: transparent; border: none; color: white; font-size: 24px; cursor: pointer; }
</style>
