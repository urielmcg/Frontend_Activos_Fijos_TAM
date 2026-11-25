<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue';
import api from "@/services/api.js";
import logo from "@/assets/img/fondotam-blanco.png";

// --- ESTADOS ---
const activos = ref([]);
const regionales = ref([]);
const gruposContables = ref([]);
const tiposActivos = ref([]);
const cargando = ref(false);

const filtros = reactive({
  search: '',
  ubicacion_actual__regional: '',
  grupo_contable_seleccionado: '',
  tipo_activo: '',
  situacion_activo: '',
  estado_actual: ''
});

// --- NUEVO: ESTADO DE PAGINACIÓN ---
const paginacion = reactive({
  paginaActual: 1,
  itemsPorPagina: 10
});

// --- LÓGICA DE DATOS ---
const cargarParametrosIniciales = async () => {
  try {
    const [resReg, resGrupos] = await Promise.all([
      api.get("regionales/"),
      api.get("grupos-contables/")
    ]);
    regionales.value = resReg.data;
    gruposContables.value = resGrupos.data;
  } catch (e) {
    console.error("Error cargando parámetros iniciales", e);
  }
};

watch(() => filtros.grupo_contable_seleccionado, async (nuevoGrupo) => {
  filtros.tipo_activo = '';
  if (nuevoGrupo) {
    try {
      const res = await api.get(`tipos-activos/?grupo_contable=${nuevoGrupo}`);
      tiposActivos.value = res.data;
    } catch (e) {
      console.error("Error al cargar tipos", e);
    }
  } else {
    tiposActivos.value = [];
  }
});

const realizarBusqueda = async () => {
  cargando.value = true;
  paginacion.paginaActual = 1; // Resetea a la primera página en cada nueva búsqueda
  try {
    const response = await api.get("gestion-activos/", {
      params: filtros
    });
    activos.value = response.data;
  } catch (error) {
    console.error("Error en la consulta profesional", error);
  } finally {
    cargando.value = false;
  }
};

onMounted(() => {
  cargarParametrosIniciales();
  realizarBusqueda();
});

// --- NUEVO: LÓGICA COMPUTADA PARA PAGINACIÓN ---
const totalPaginas = computed(() => {
  return Math.ceil(activos.value.length / paginacion.itemsPorPagina) || 1;
});

const activosPaginados = computed(() => {
  const inicio = (paginacion.paginaActual - 1) * paginacion.itemsPorPagina;
  const fin = inicio + paginacion.itemsPorPagina;
  return activos.value.slice(inicio, fin);
});

const cambiarPagina = (pagina) => {
  if (pagina >= 1 && pagina <= totalPaginas.value) {
    paginacion.paginaActual = pagina;
  }
};

// --- ESTILOS DE BADGES ---
const getBadgeClass = (situacion) => {
  const base = 'status-badge shadow-sm ';
  if (!situacion) return base + 'status-disponible';
  const s = situacion.toLowerCase();
  if (s.includes('asignado')) return base + 'status-asignado';
  if (s.includes('baja')) return base + 'status-baja';
  if (s.includes('mantenimiento')) return base + 'status-mantenimiento';
  return base + 'status-disponible';
};
</script>

<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-lg-12">
        <div class="card border-0 shadow-lg border-radius-xl overflow-hidden">

          <div class="header-tamep d-flex justify-content-between align-items-center px-4 py-3">
            <div class="d-flex align-items-center">
              <div class="logo-container-left me-3 shadow-sm">
                <img :src="logo" alt="TAMEP Logo" class="logo-img">
              </div>
              <div class="border-start ps-3 border-white opacity-8">
                <h6 class="mb-0 text-white text-uppercase ls-1 font-weight-bolder">Gestión de Inventario Institucional
                </h6>
                <small class="text-white opacity-7">Control de Activos Fijos - TAMEP</small>
              </div>
            </div>
            <div class="text-end text-white">
              <h5 class="mb-0 text-white font-weight-bolder">CONSULTA PROFESIONAL</h5>
              <span class="badge bg-white text-dark mt-1">{{ activos.length }} Registros</span>
            </div>
          </div>

          <div class="card-body p-4 bg-light">
            <div class="bg-white border-radius-lg shadow-sm p-4 mb-4">
              <div class="section-title mb-4 d-flex align-items-center">
                <div class="step-number me-2"><i class="fas fa-filter"></i></div>
                <h6 class="font-weight-bolder mb-0 text-azul-tamep text-uppercase">Buscador Inteligente</h6>
              </div>

              <div class="row g-3">
                <div class="col-md-4">
                  <label class="label-custom">Búsqueda (Código/Serie/Nombre)</label>
                  <div class="input-group">
                    <span class="input-group-text bg-gray-100 border-end-0"><i
                        class="fas fa-search text-secondary"></i></span>
                    <input type="text" v-model="filtros.search" @keyup.enter="realizarBusqueda"
                      class="form-control ps-2 bg-gray-100" placeholder="Ej: Laptop, TAMEP-001...">
                  </div>
                </div>

                <div class="col-md-3">
                  <label class="label-custom">Sede / Regional</label>
                  <select v-model="filtros.ubicacion_actual__regional" @change="realizarBusqueda"
                    class="form-select-custom bg-gray-100">
                    <option value="">TODAS LAS SEDES</option>
                    <option v-for="r in regionales" :key="r.id" :value="r.id">{{ r.nombre }}</option>
                  </select>
                </div>

                <div class="col-md-3">
                  <label class="label-custom">Situación de Gestión</label>
                  <select v-model="filtros.situacion_activo" @change="realizarBusqueda"
                    class="form-select-custom bg-gray-100">
                    <option value="">CUALQUIERA</option>
                    <option value="Disponible">DISPONIBLE</option>
                    <option value="Asignado">ASIGNADO</option>
                    <option value="Mantenimiento">EN MANTENIMIENTO</option>
                    <option value="Baja">DADO DE BAJA</option>
                  </select>
                </div>

                <div class="col-md-2 d-flex align-items-end">
                  <button @click="realizarBusqueda" class="btn-tamep-primary w-100 py-2 shadow-sm mb-0">
                    <i v-if="cargando" class="fas fa-spinner fa-spin me-2"></i>
                    <span v-else><i class="fas fa-sync-alt me-2"></i>ACTUALIZAR</span>
                  </button>
                </div>
              </div>

              <div class="row g-3 mt-1">
                <div class="col-md-4">
                  <label class="label-custom">Grupo Contable</label>
                  <select v-model="filtros.grupo_contable_seleccionado" @change="realizarBusqueda"
                    class="form-select-custom bg-gray-100">
                    <option value="">TODOS LOS GRUPOS</option>
                    <option v-for="g in gruposContables" :key="g.id" :value="g.id">{{ g.nombre }}</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="label-custom">Tipo de Activo</label>
                  <select v-model="filtros.tipo_activo" @change="realizarBusqueda"
                    class="form-select-custom bg-gray-100" :disabled="!tiposActivos.length">
                    <option value="">TODOS LOS TIPOS</option>
                    <option v-for="t in tiposActivos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="label-custom">Estado Físico Actual</label>
                  <select v-model="filtros.estado_actual" @change="realizarBusqueda"
                    class="form-select-custom bg-gray-100">
                    <option value="">TODOS LOS ESTADOS</option>
                    <option value="Bueno">BUENO</option>
                    <option value="Regular">REGULAR</option>
                    <option value="Malo">MALO</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="bg-white border-radius-lg shadow-sm">
              <div class="table-responsive min-vh-50">
                <table class="table align-items-center mb-0 table-hover">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Activo /
                        Codificación</th>
                      <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Sede /
                        Ubicación</th>
                      <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                        Situación / Estado</th>
                      <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Ficha
                      </th>
                      <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                        Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="cargando">
                      <td colspan="5" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status"></div>
                        <p class="mt-2 text-sm font-weight-bold text-secondary text-uppercase">Procesando Consulta...
                        </p>
                      </td>
                    </tr>
                    <tr v-else-if="activos.length === 0">
                      <td colspan="5" class="text-center py-5">
                        <i class="fas fa-search-minus fa-3x text-light mb-3"></i>
                        <p class="text-secondary text-sm font-weight-bold">No se encontraron registros que coincidan con
                          los filtros.</p>
                      </td>
                    </tr>

                    <tr v-for="a in activosPaginados" :key="a.id" class="border-bottom hover-row" v-else>
                      <td>
                        <div class="d-flex px-3 py-2">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm font-weight-bold text-dark">{{ a.nombre_especifico }}</h6>
                            <p class="text-xs font-weight-bold text-azul-tamep mb-0">COD: {{ a.codigo_tamep }}</p>
                            <span class="text-xxs text-secondary">S/N: {{ a.serie || 'N/A' }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="text-xs font-weight-bold text-dark">{{ a.ubicacion_nombre || 'No definida'
                          }}</span><br>
                        <span class="text-xxs font-weight-bold text-secondary"><i
                            class="fas fa-map-marker-alt me-1 text-danger"></i>{{ a.regional_nombre || 'Sin Regional'
                          }}</span>
                      </td>
                      <td class="align-middle text-center">
                        <span :class="getBadgeClass(a.situacion_activo)">{{ a.situacion_activo }}</span>
                        <div class="mt-2">
                          <span class="text-xxs font-weight-bolder border rounded px-2 py-1"
                            :class="{ 'text-success border-success bg-success-light': a.estado_actual === 'Bueno', 'text-warning border-warning bg-warning-light': a.estado_actual === 'Regular', 'text-danger border-danger bg-danger-light': a.estado_actual === 'Malo' }">
                            <i class="fas fa-heartbeat me-1"></i>{{ a.estado_actual }}
                          </span>
                        </div>
                      </td>
                      <td class="align-middle text-center">
                        <router-link :to="'/activo/detalle/' + a.id" class="btn btn-outline-dark btn-sm mb-0 px-3">
                          <i class="fas fa-file-pdf me-1"></i> FICHA
                        </router-link>
                      </td>
                      <td class="text-center align-middle">
                        <router-link :to="'/activo/gestion/' + a.id"
                          class="btn btn-link text-azul-tamep p-0 mb-0 font-weight-bold">
                          <i class="fas fa-tools text-lg"></i>
                        </router-link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="activos.length > 0 && !cargando"
                class="d-flex justify-content-between align-items-center px-4 py-3 border-top bg-gray-100">
                <span class="text-xs font-weight-bold text-secondary">
                  Mostrando {{ (paginacion.paginaActual - 1) * paginacion.itemsPorPagina + 1 }} a
                  {{ Math.min(paginacion.paginaActual * paginacion.itemsPorPagina, activos.length) }}
                  de {{ activos.length }} activos
                </span>
                <ul class="pagination pagination-sm m-0">
                  <li class="page-item" :class="{ disabled: paginacion.paginaActual === 1 }">
                    <button class="page-link" @click="cambiarPagina(paginacion.paginaActual - 1)">
                      <i class="fas fa-angle-left"></i>
                    </button>
                  </li>
                  <li class="page-item" v-for="pag in totalPaginas" :key="pag"
                    :class="{ active: pag === paginacion.paginaActual }">
                    <button class="page-link font-weight-bold" @click="cambiarPagina(pag)">{{ pag }}</button>
                  </li>
                  <li class="page-item" :class="{ disabled: paginacion.paginaActual === totalPaginas }">
                    <button class="page-link" @click="cambiarPagina(paginacion.paginaActual + 1)">
                      <i class="fas fa-angle-right"></i>
                    </button>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-tamep {
  background: linear-gradient(135deg, #003366 0%, #001d3d 100%);
}

.logo-container-left {
  background: white;
  padding: 5px 12px;
  border-radius: 8px;
}

.logo-img {
  max-height: 35px;
}

.text-azul-tamep {
  color: #003366;
}

.label-custom {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #8392ab;
  margin-bottom: 5px;
  display: block;
}

.form-select-custom {
  display: block;
  width: 100%;
  padding: 0.55rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid #d2d6da;
  border-radius: 0.5rem;
  background-color: white;
  font-weight: 600;
  outline: none;
  transition: 0.3s;
}

.form-select-custom:focus {
  border-color: #003366;
}

.bg-gray-100 {
  background-color: #f8f9fa !important;
}

.min-vh-50 {
  min-height: 50vh;
}

/* BADGES PROFESIONALES */
.status-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  border: 1px solid transparent;
  letter-spacing: 0.5px;
}

.status-asignado {
  background-color: #d1e7dd;
  color: #0f5132;
  border-color: #badbcc;
}

.status-disponible {
  background-color: #cfe2ff;
  color: #084298;
  border-color: #b6d4fe;
}

.status-mantenimiento {
  background-color: #fff3cd;
  color: #856404;
  border-color: #ffeeba;
}

.status-baja {
  background-color: #f8d7da;
  color: #842029;
  border-color: #f5c6cb;
}

/* COLORES ESTADO FÍSICO */
.bg-success-light {
  background-color: #e8f5e9;
}

.bg-warning-light {
  background-color: #fff8e1;
}

.bg-danger-light {
  background-color: #ffebee;
}

.step-number {
  background: #003366;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
}

.btn-tamep-primary {
  background: #003366;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.75rem;
  transition: 0.3s;
}

.btn-tamep-primary:hover {
  background: #004a94;
  transform: translateY(-2px);
}

.hover-row:hover {
  background-color: #f8f9fa;
  transition: 0.2s;
}

/* PAGINACIÓN TAMEP */
.pagination .page-item.active .page-link {
  background-color: #003366;
  border-color: #003366;
  color: white;
}

.pagination .page-link {
  color: #003366;
  border: none;
  margin: 0 2px;
  border-radius: 4px;
}
</style>