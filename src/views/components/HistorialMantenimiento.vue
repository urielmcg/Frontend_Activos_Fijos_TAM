<script setup>
/* eslint-disable */
import { ref, reactive, onMounted, computed } from 'vue';
import api from '@/services/api';
import Swal from 'sweetalert2';
import TurnstileWidget from '@/components/TurnstileWidget.vue';

// --- Variables reactivas ---
const intervenciones = ref([]);
const solicitudes = ref([]);
const activos = ref([]);
const mensajeHistorial = ref('');
const loading = ref(true);
const mostrarFormulario = ref(false);
const enviando = ref(false);
const turnstileToken = ref('');

// --- Filtros ---
const filtroTipo = ref('');

// --- Formulario ---
const form = reactive({
  solicitud: null,
  activo: null,
  tipo_mantenimiento: 'Correctivo',
  categoria_falla: 'Hardware',
  modalidad: 'Sitio',
  diagnostico_previo: '',
  detalles_reparacion: '',
  recomendacion_tecnica: '',
  observaciones_entrega: '',
  verificado_por: '',
  conclusion: '',
  fecha_inicio: '',
  fecha_fin: '',
  lectura_uso_equipo: 0,
  costo_materiales: 0,
  severidad_falla: 1,
  estado_post_intervencion: 'Bueno',
});

// --- Carga de datos ---
const obtenerIntervenciones = async () => {
  mensajeHistorial.value = '';
  try {
    const url = filtroTipo.value ? `intervenciones/?tipo_mantenimiento=${filtroTipo.value}` : 'intervenciones/';
    const res = await api.get(url);
    intervenciones.value = res.data.results || res.data;
  } catch (error) {
    mensajeHistorial.value = 'Error al cargar las intervenciones: ' + (error.response?.data?.detail || error.message);
  }
};

const obtenerSolicitudes = async () => {
  try {
    const res = await api.get('solicitudes/');
    solicitudes.value = res.data.results || res.data;
  } catch (error) {
    console.error('Error al cargar solicitudes:', error);
  }
};

const obtenerActivos = async () => {
  try {
    const res = await api.get('activos/');
    activos.value = res.data.results || res.data;
  } catch (error) {
    console.error('Error al cargar activos:', error);
  }
};

onMounted(async () => {
  await Promise.all([obtenerIntervenciones(), obtenerSolicitudes(), obtenerActivos()]);
  loading.value = false;
});

// --- Formateo ---
const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const badgeTipo = (tipo) => {
  const map = {
    'Preventivo': 'bg-gradient-info',
    'Correctivo': 'bg-gradient-danger',
    'Servicio': 'bg-gradient-warning',
    'Mejora': 'bg-gradient-success',
  };
  return map[tipo] || 'bg-secondary';
};

const badgeEstado = (estado) => {
  const map = {
    'Bueno': 'bg-gradient-success',
    'Regular': 'bg-gradient-warning',
    'Malo': 'bg-gradient-danger',
    'Baja': 'bg-dark',
  };
  return map[estado] || 'bg-secondary';
};

// --- Guardar intervencion ---
const guardarIntervencion = async () => {
  if (!turnstileToken.value) return Swal.fire('Atención', 'Complete la verificación Turnstile.', 'warning');
  if (!form.solicitud) return Swal.fire('Atención', 'Debe seleccionar una solicitud.', 'warning');
  if (!form.activo) return Swal.fire('Atención', 'Debe seleccionar un activo.', 'warning');
  if (!form.diagnostico_previo.trim()) return Swal.fire('Atención', 'Debe completar el diagnóstico previo.', 'warning');
  if (!form.detalles_reparacion.trim()) return Swal.fire('Atención', 'Debe describir el trabajo realizado.', 'warning');
  if (!form.verificado_por.trim()) return Swal.fire('Atención', 'Debe indicar quién verificó.', 'warning');
  if (!form.fecha_inicio || !form.fecha_fin) return Swal.fire('Atención', 'Debe indicar las fechas de inicio y fin.', 'warning');

  enviando.value = true;
  try {
    await api.post('intervenciones/', {
      solicitud: form.solicitud,
      activo: form.activo,
      tipo_mantenimiento: form.tipo_mantenimiento,
      categoria_falla: form.categoria_falla,
      modalidad: form.modalidad,
      diagnostico_previo: form.diagnostico_previo,
      detalles_reparacion: form.detalles_reparacion,
      recomendacion_tecnica: form.recomendacion_tecnica,
      observaciones_entrega: form.observaciones_entrega,
      verificado_por: form.verificado_por,
      conclusion: form.conclusion,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      lectura_uso_equipo: form.lectura_uso_equipo,
      costo_materiales: form.costo_materiales,
      severidad_falla: form.severidad_falla,
      estado_post_intervencion: form.estado_post_intervencion,
      turnstile_token: turnstileToken.value,
    });
    turnstileToken.value = '';
    await Swal.fire({ title: '¡Registrado!', text: 'La intervención fue registrada exitosamente.', icon: 'success', timer: 2000, showConfirmButton: false });
    resetForm();
    mostrarFormulario.value = false;
    await obtenerIntervenciones();
  } catch (error) {
    const detail = error.response?.data?.detail || JSON.stringify(error.response?.data) || error.message;
    Swal.fire('Error', detail, 'error');
  } finally {
    enviando.value = false;
  }
};

const resetForm = () => {
  Object.assign(form, {
    solicitud: null, activo: null, tipo_mantenimiento: 'Correctivo',
    categoria_falla: 'Hardware', modalidad: 'Sitio', diagnostico_previo: '',
    detalles_reparacion: '', recomendacion_tecnica: '', observaciones_entrega: '',
    verificado_por: '', conclusion: '', fecha_inicio: '', fecha_fin: '',
    lectura_uso_equipo: 0, costo_materiales: 0, severidad_falla: 1,
    estado_post_intervencion: 'Bueno',
  });
};

const aplicarFiltro = () => {
  obtenerIntervenciones();
};
</script>

<template>
  <div class="container-fluid py-4">
    <div class="card shadow-lg">
      <div class="card-header pb-0">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-0">Historial de Mantenimientos</h6>
            <p class="text-xs text-secondary mb-0">Registro y consulta de intervenciones técnicas.</p>
          </div>
          <button class="btn btn-sm mb-0" :class="mostrarFormulario ? 'btn-outline-secondary' : 'btn-primary'"
            @click="mostrarFormulario = !mostrarFormulario">
            {{ mostrarFormulario ? 'Cancelar' : 'Registrar Nuevo Mantenimiento' }}
          </button>
        </div>
        <p v-if="mensajeHistorial"
          :class="{ 'text-success': !mensajeHistorial.includes('Error'), 'text-danger': mensajeHistorial.includes('Error') }"
          class="text-sm mt-2 mb-0">
          {{ mensajeHistorial }}
        </p>
      </div>

      <!-- Formulario de Nueva Intervención -->
      <div v-if="mostrarFormulario" class="card-body border-bottom">
        <div class="row g-3">
          <!-- Solicitud y Activo -->
          <div class="col-md-6">
            <label class="form-label text-xs font-weight-bold text-uppercase">Solicitud asociada</label>
            <select class="form-select form-select-sm" v-model="form.solicitud" required>
              <option :value="null" disabled>-- Seleccionar solicitud --</option>
              <option v-for="sol in solicitudes" :key="sol.id" :value="sol.id">
                S-{{ sol.id }} | {{ sol.activo_codigo }} - {{ sol.tipo_solicitud }}
              </option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label text-xs font-weight-bold text-uppercase">Activo</label>
            <select class="form-select form-select-sm" v-model="form.activo" required>
              <option :value="null" disabled>-- Seleccionar activo --</option>
              <option v-for="act in activos" :key="act.id" :value="act.id">
                {{ act.codigo_tamep }} - {{ act.nombre_especifico }}
              </option>
            </select>
          </div>

          <!-- Tipo, Categoría, Modalidad -->
          <div class="col-md-4">
            <label class="form-label text-xs font-weight-bold text-uppercase">Tipo de Mantenimiento</label>
            <select class="form-select form-select-sm" v-model="form.tipo_mantenimiento">
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
              <option value="Servicio">Servicio Técnico</option>
              <option value="Mejora">Mejora / Upgrade</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label text-xs font-weight-bold text-uppercase">Categoría de Falla</label>
            <select class="form-select form-select-sm" v-model="form.categoria_falla">
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label text-xs font-weight-bold text-uppercase">Modalidad</label>
            <select class="form-select form-select-sm" v-model="form.modalidad">
              <option value="Sitio">En Sitio</option>
              <option value="Taller">En Taller</option>
            </select>
          </div>

          <!-- Diagnóstico y Detalles -->
          <div class="col-md-6">
            <label class="form-label text-xs font-weight-bold text-uppercase">Diagnóstico Previo</label>
            <textarea class="form-control form-control-sm" v-model="form.diagnostico_previo" rows="3"
              placeholder="Diagnóstico y/o servicio requerido..."></textarea>
          </div>
          <div class="col-md-6">
            <label class="form-label text-xs font-weight-bold text-uppercase">Detalles de Reparación</label>
            <textarea class="form-control form-control-sm" v-model="form.detalles_reparacion" rows="3"
              placeholder="Descripción técnica del trabajo realizado..."></textarea>
          </div>

          <!-- Recomendación y Observaciones -->
          <div class="col-md-6">
            <label class="form-label text-xs font-weight-bold text-uppercase">Recomendación Técnica</label>
            <textarea class="form-control form-control-sm" v-model="form.recomendacion_tecnica" rows="2"
              placeholder="Opcional..."></textarea>
          </div>
          <div class="col-md-6">
            <label class="form-label text-xs font-weight-bold text-uppercase">Observaciones de Entrega</label>
            <textarea class="form-control form-control-sm" v-model="form.observaciones_entrega" rows="2"
              placeholder="Opcional..."></textarea>
          </div>

          <!-- Fechas -->
          <div class="col-md-3">
            <label class="form-label text-xs font-weight-bold text-uppercase">Fecha Inicio</label>
            <input type="datetime-local" class="form-control form-control-sm" v-model="form.fecha_inicio" required>
          </div>
          <div class="col-md-3">
            <label class="form-label text-xs font-weight-bold text-uppercase">Fecha Fin</label>
            <input type="datetime-local" class="form-control form-control-sm" v-model="form.fecha_fin" required>
          </div>
          <div class="col-md-3">
            <label class="form-label text-xs font-weight-bold text-uppercase">Lectura Uso (hrs)</label>
            <input type="number" class="form-control form-control-sm" v-model="form.lectura_uso_equipo" step="0.1"
              min="0">
          </div>
          <div class="col-md-3">
            <label class="form-label text-xs font-weight-bold text-uppercase">Costo Materiales (Bs.)</label>
            <input type="number" class="form-control form-control-sm" v-model="form.costo_materiales" step="0.01"
              min="0">
          </div>

          <!-- Severidad, Estado, Verificado -->
          <div class="col-md-3">
            <label class="form-label text-xs font-weight-bold text-uppercase">Severidad Falla</label>
            <select class="form-select form-select-sm" v-model="form.severidad_falla">
              <option :value="1">1 - Leve</option>
              <option :value="2">2 - Menor</option>
              <option :value="3">3 - Moderada</option>
              <option :value="4">4 - Grave</option>
              <option :value="5">5 - Crítica</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label text-xs font-weight-bold text-uppercase">Estado Post-Intervención</label>
            <select class="form-select form-select-sm" v-model="form.estado_post_intervencion">
              <option value="Bueno">Bueno</option>
              <option value="Regular">Regular</option>
              <option value="Malo">Malo</option>
              <option value="Baja">Sugerir Baja</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label text-xs font-weight-bold text-uppercase">Verificado por</label>
            <input type="text" class="form-control form-control-sm" v-model="form.verificado_por"
              placeholder="Nombre del verificador" required>
          </div>
          <div class="col-md-3">
            <label class="form-label text-xs font-weight-bold text-uppercase">Conclusión</label>
            <input type="text" class="form-control form-control-sm" v-model="form.conclusion"
              placeholder="Opcional...">
          </div>

          <div class="col-12">
            <TurnstileWidget v-model="turnstileToken" />
          </div>
          <div class="col-12 text-end">
            <button class="btn btn-outline-secondary btn-sm me-2" @click="resetForm(); mostrarFormulario = false;">
              Cancelar
            </button>
            <button class="btn btn-dark btn-sm" @click="guardarIntervencion" :disabled="enviando">
              <span v-if="enviando" class="spinner-border spinner-border-sm me-2"></span>
              Registrar Intervención
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <!-- Filtro y Tabla -->
      <div v-else class="card-body px-0 pt-0 pb-2">
        <div class="px-4 pt-3 pb-2">
          <div class="row g-2">
            <div class="col-md-3">
              <select class="form-select form-select-sm" v-model="filtroTipo" @change="aplicarFiltro">
                <option value="">Todos los tipos</option>
                <option value="Preventivo">Preventivo</option>
                <option value="Correctivo">Correctivo</option>
                <option value="Servicio">Servicio Técnico</option>
                <option value="Mejora">Mejora / Upgrade</option>
              </select>
            </div>
          </div>
        </div>

        <div class="table-responsive p-0">
          <table class="table align-items-center mb-0 table-hover">
            <thead class="bg-gray-100">
              <tr>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Activo</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Tipo</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Técnico</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Diagnóstico</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Fechas
                </th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Costo</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Estado
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="intervenciones.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">No hay intervenciones registradas.</td>
              </tr>
              <tr v-for="inter in intervenciones" :key="inter.id">
                <td>
                  <div class="d-flex px-2 py-1">
                    <div class="d-flex flex-column justify-content-center">
                      <h6 class="mb-0 text-sm">{{ inter.activo_nombre || 'N/A' }}</h6>
                      <p class="text-xs text-secondary mb-0">{{ inter.activo_codigo || '' }}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span :class="['badge badge-sm', badgeTipo(inter.tipo_mantenimiento)]">
                    {{ inter.tipo_mantenimiento }}
                  </span>
                </td>
                <td>
                  <p class="text-xs font-weight-bold mb-0">{{ inter.tecnico_nombre || 'N/A' }}</p>
                </td>
                <td>
                  <p class="text-xs text-secondary mb-0"
                    style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                    :title="inter.diagnostico_previo">
                    {{ inter.diagnostico_previo }}
                  </p>
                </td>
                <td class="align-middle text-center">
                  <p class="text-xs mb-0">{{ formatearFecha(inter.fecha_inicio) }}</p>
                  <p class="text-xxs text-secondary mb-0">a {{ formatearFecha(inter.fecha_fin) }}</p>
                </td>
                <td class="align-middle text-center">
                  <span class="text-xs font-weight-bold">{{ inter.costo_materiales || '0.00' }} Bs.</span>
                </td>
                <td class="align-middle text-center">
                  <span :class="['badge badge-sm', badgeEstado(inter.estado_post_intervencion)]">
                    {{ inter.estado_post_intervencion }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
