<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '@/services/api';
import Swal from 'sweetalert2';
import TurnstileWidget from '@/components/TurnstileWidget.vue';

const loading = ref(true);
const enviando = ref(false);
const solicitudes = ref([]);
const mostrarFormulario = ref(false);
const activoBuscado = ref(null);
const codigoBusqueda = ref('');
const turnstileToken = ref('');

const form = reactive({
  activo: null,
  tipo_solicitud: 'MANTENIMIENTO',
  severidad: '2',
  descripcion_problema: '',
  requerimiento: '',
});

const buscarActivo = async () => {
  if (!codigoBusqueda.value) return;
  try {
    const res = await api.get(`activos/?search=${codigoBusqueda.value}`);
    const resultados = res.data.results || res.data;
    if (resultados.length > 0) {
      activoBuscado.value = resultados[0];
      form.activo = resultados[0].id;
      Swal.fire({ icon: 'success', title: 'Activo encontrado', text: resultados[0].nombre_especifico, timer: 1500, showConfirmButton: false });
    } else {
      activoBuscado.value = null;
      form.activo = null;
      Swal.fire('No encontrado', 'No se encontró un activo con ese código.', 'warning');
    }
  } catch (error) {
    Swal.fire('Error', 'Error al buscar el activo.', 'error');
  }
};

const obtenerSolicitudes = async () => {
  try {
    const res = await api.get('solicitudes/');
    solicitudes.value = res.data.results || res.data;
  } catch (error) {
    Swal.fire('Error', 'No se pudieron cargar las solicitudes.', 'error');
  }
};

const enviarSolicitud = async () => {
  if (!turnstileToken.value) return Swal.fire('Atención', 'Complete la verificación Turnstile.', 'warning');
  if (!form.activo) return Swal.fire('Atención', 'Debe buscar y seleccionar un activo.', 'warning');
  if (!form.descripcion_problema.trim()) return Swal.fire('Atención', 'Debe describir el problema.', 'warning');
  if (!form.requerimiento.trim()) return Swal.fire('Atención', 'Debe indicar qué solicita.', 'warning');

  enviando.value = true;
  try {
    await api.post('solicitudes/', {
      activo: form.activo,
      tipo_solicitud: form.tipo_solicitud,
      severidad: form.severidad,
      descripcion_problema: form.descripcion_problema,
      requerimiento: form.requerimiento,
      turnstile_token: turnstileToken.value,
    });
    turnstileToken.value = '';
    await Swal.fire('Solicitud creada', 'Su solicitud fue registrada correctamente.', 'success');
    resetForm();
    mostrarFormulario.value = false;
    await obtenerSolicitudes();
  } catch (error) {
    const msg = error.response?.data?.detail || 'Error al enviar la solicitud.';
    Swal.fire('Error', msg, 'error');
  } finally {
    enviando.value = false;
  }
};

const resetForm = () => {
  form.activo = null;
  form.tipo_solicitud = 'MANTENIMIENTO';
  form.severidad = '2';
  form.descripcion_problema = '';
  form.requerimiento = '';
  activoBuscado.value = null;
  codigoBusqueda.value = '';
};

const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const badgeSeveridad = (sev) => {
  const map = { '1': 'bg-secondary', '2': 'bg-warning', '3': 'bg-danger' };
  return map[sev] || 'bg-secondary';
};

const textoSeveridad = (sev) => {
  const map = { '1': 'Baja', '2': 'Media', '3': 'Alta' };
  return map[sev] || sev;
};

onMounted(async () => {
  await obtenerSolicitudes();
  loading.value = false;
});
</script>

<template>
  <div class="container-fluid py-4">
    <div class="card shadow-lg">
      <div class="card-header pb-0">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-0">Solicitudes de Mantenimiento</h6>
            <p class="text-xs text-secondary mb-0">Gestión de tickets de soporte técnico</p>
          </div>
          <button class="btn btn-sm mb-0" :class="mostrarFormulario ? 'btn-outline-secondary' : 'btn-primary'" @click="mostrarFormulario = !mostrarFormulario">
            {{ mostrarFormulario ? 'Cancelar' : 'Nueva Solicitud' }}
          </button>
        </div>
      </div>

      <!-- Formulario -->
      <div v-if="mostrarFormulario" class="card-body border-bottom">
        <div class="row g-3">
          <div class="col-md-5">
            <label class="form-label text-xs font-weight-bold text-uppercase">Buscar Activo por Código</label>
            <div class="input-group">
              <input type="text" class="form-control" v-model="codigoBusqueda" placeholder="TAMEP-..." @keyup.enter="buscarActivo">
              <button class="btn btn-dark mb-0" @click="buscarActivo"><i class="fas fa-search"></i></button>
            </div>
            <p v-if="activoBuscado" class="text-xs text-success mt-1 mb-0">
              <i class="fas fa-check-circle me-1"></i>{{ activoBuscado.nombre_especifico }} ({{ activoBuscado.codigo_tamep }})
            </p>
          </div>
          <div class="col-md-4">
            <label class="form-label text-xs font-weight-bold text-uppercase">Tipo de Solicitud</label>
            <select class="form-select" v-model="form.tipo_solicitud">
              <option value="MANTENIMIENTO">Mantenimiento</option>
              <option value="SERVICIO">Servicio Técnico</option>
              <option value="AYUDA">Ayudantía / Soporte</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label text-xs font-weight-bold text-uppercase">Severidad</label>
            <select class="form-select" v-model="form.severidad">
              <option value="1">Baja - Funciona con limitaciones</option>
              <option value="2">Media - Afecta tareas principales</option>
              <option value="3">Alta - Equipo inoperativo</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label text-xs font-weight-bold text-uppercase">Descripción del Problema</label>
            <textarea class="form-control" v-model="form.descripcion_problema" rows="3" placeholder="Describa el problema que presenta el equipo..."></textarea>
          </div>
          <div class="col-md-6">
            <label class="form-label text-xs font-weight-bold text-uppercase">¿Qué solicita?</label>
            <textarea class="form-control" v-model="form.requerimiento" rows="3" placeholder="Indique qué tipo de atención requiere..."></textarea>
          </div>
          <div class="col-12">
            <TurnstileWidget v-model="turnstileToken" />
          </div>
          <div class="col-12 text-end">
            <button class="btn btn-dark" @click="enviarSolicitud" :disabled="enviando">
              <span v-if="enviando" class="spinner-border spinner-border-sm me-2"></span>
              Enviar Solicitud
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <!-- Tabla -->
      <div v-else class="card-body px-0 pt-0 pb-2">
        <div class="table-responsive p-0">
          <table class="table align-items-center mb-0">
            <thead>
              <tr>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">ID</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Activo</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Tipo</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Severidad</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Problema</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Estado</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="solicitudes.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">No hay solicitudes registradas.</td>
              </tr>
              <tr v-for="sol in solicitudes" :key="sol.id">
                <td class="ps-3"><span class="text-xs font-weight-bold">S-{{ sol.id }}</span></td>
                <td>
                  <p class="text-xs font-weight-bold mb-0">{{ sol.activo_codigo || '-' }}</p>
                  <p class="text-xxs text-secondary mb-0">{{ sol.activo_nombre || '' }}</p>
                </td>
                <td><span class="text-xs">{{ sol.tipo_solicitud }}</span></td>
                <td><span :class="['badge badge-sm', badgeSeveridad(sol.severidad)]">{{ textoSeveridad(sol.severidad) }}</span></td>
                <td>
                  <p class="text-xs text-secondary mb-0" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    {{ sol.descripcion_problema }}
                  </p>
                </td>
                <td class="text-center">
                  <span :class="['badge badge-sm', sol.estado_texto === 'Pendiente' ? 'bg-warning' : sol.estado_texto === 'En Proceso' ? 'bg-info' : 'bg-success']">
                    {{ sol.estado_texto }}
                  </span>
                </td>
                <td><span class="text-xs">{{ formatearFecha(sol.fecha_solicitud) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
