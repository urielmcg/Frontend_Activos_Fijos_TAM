<script setup>
/* eslint-disable */
import { ref, reactive, onMounted, computed, watch } from 'vue';
import api from '@/services/api';
import Swal from 'sweetalert2';

// --- ESTADOS Y DATOS ---
const usuarios = ref([]);
const mensajeUsuarios = ref('');

// --- LISTAS PARA SELECTORES ---
const regionales = ref([]);
const gerencias = ref([]);
const cargos = ref([]);

const EXTENSIONES = [
  { value: 'LP', label: 'La Paz' },
  { value: 'OR', label: 'Oruro' },
  { value: 'PT', label: 'Potosí' },
  { value: 'CB', label: 'Cochabamba' },
  { value: 'SC', label: 'Santa Cruz' },
  { value: 'BN', label: 'Beni' },
  { value: 'PA', label: 'Pando' },
  { value: 'TJ', label: 'Tarija' },
  { value: 'CH', label: 'Chuquisaca' },
];

const ROLES = [
  { value: 'admin_informatico', label: 'Administrador Informático' },
  { value: 'admin_principal', label: 'Administrador Principal' },
  { value: 'admin_regional', label: 'Administrador Regional' },
  { value: 'usuario', label: 'Usuario' },
  { value: 'consultor', label: 'Consultor' },
];

// --- FILTROS Y PAGINACIÓN ---
const filtros = reactive({
  busqueda: '',
  estado: ''
});

const paginacion = reactive({
  paginaActual: 1,
  itemsPorPagina: 8
});

// --- MODAL DE EDICIÓN ---
const modalEdicion = ref(false);
const guardando = ref(false);
const cargandoUsuario = ref(false);
const usuarioEditando = reactive({
  id: null,
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  is_active: true,
  is_staff: false,
  rol: 'usuario',
  regional_id: null,
  gerencia_id: null,
  cargo_id: null,
  ci: '',
  extension: '',
  telefono: '',
});

// --- CARGA DE DATOS ---
const obtenerUsuarios = async () => {
  mensajeUsuarios.value = '';
  try {
    const response = await api.get('users/');
    usuarios.value = response.data;
  } catch (error) {
    mensajeUsuarios.value = 'Error al cargar los usuarios: ' + (error.response?.data?.detail || error.message);
  }
};

const cargarRegionales = async () => {
  try {
    const { data } = await api.get('regionales/');
    regionales.value = data;
  } catch (error) {
    console.error('Error al cargar regionales:', error);
  }
};

const cargarGerencias = async (regionalId) => {
  if (!regionalId) {
    gerencias.value = [];
    return;
  }
  try {
    const { data } = await api.get(`gerencias/?regional=${regionalId}`);
    gerencias.value = data;
  } catch (error) {
    console.error('Error al cargar gerencias:', error);
  }
};

const cargarCargos = async (gerenciaId) => {
  if (!gerenciaId) {
    cargos.value = [];
    return;
  }
  try {
    const { data } = await api.get(`cargos/?gerencia=${gerenciaId}`);
    cargos.value = data;
  } catch (error) {
    console.error('Error al cargar cargos:', error);
  }
};

// --- CASCADING: cuando cambia regional → recargar gerencias ---
const onRegionalChange = () => {
  usuarioEditando.gerencia_id = null;
  usuarioEditando.cargo_id = null;
  cargos.value = [];
  cargarGerencias(usuarioEditando.regional_id);
};

// --- CASCADING: cuando cambia gerencia → recargar cargos ---
const onGerenciaChange = () => {
  usuarioEditando.cargo_id = null;
  cargarCargos(usuarioEditando.gerencia_id);
};

onMounted(() => {
  obtenerUsuarios();
  cargarRegionales();
});

// --- LÓGICA COMPUTADA (FILTROS Y PAGINACIÓN) ---

const nombreCompleto = (user) => {
  const nombre = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return nombre || user.username;
};

const obtenerLabelRol = (rolValue) => {
  const rol = ROLES.find(r => r.value === rolValue);
  return rol ? rol.label : 'Usuario';
};

const usuariosFiltrados = computed(() => {
  return usuarios.value.filter(user => {
    const termino = filtros.busqueda.toLowerCase();
    const coincideTexto = !termino ||
      nombreCompleto(user).toLowerCase().includes(termino) ||
      (user.email && user.email.toLowerCase().includes(termino)) ||
      (user.username && user.username.toLowerCase().includes(termino));

    let coincideEstado = true;
    if (filtros.estado !== '') {
      const isActivoFiltro = filtros.estado === 'activo';
      coincideEstado = user.is_active === isActivoFiltro;
    }

    return coincideTexto && coincideEstado;
  });
});

const totalPaginas = computed(() => {
  return Math.ceil(usuariosFiltrados.value.length / paginacion.itemsPorPagina) || 1;
});

const usuariosPaginados = computed(() => {
  const inicio = (paginacion.paginaActual - 1) * paginacion.itemsPorPagina;
  const fin = inicio + paginacion.itemsPorPagina;
  return usuariosFiltrados.value.slice(inicio, fin);
});

const cambiarPagina = (pagina) => {
  if (pagina >= 1 && pagina <= totalPaginas.value) {
    paginacion.paginaActual = pagina;
  }
};

// --- FUNCIONES DEL MODAL ---
const abrirModalEdicion = async (userId) => {
  try {
    cargandoUsuario.value = true;
    const { data } = await api.get(`users/${userId}/`);
    Object.assign(usuarioEditando, {
      id: data.id,
      username: data.username || '',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email || '',
      is_active: data.is_active !== undefined ? data.is_active : true,
      is_staff: data.is_staff !== undefined ? data.is_staff : false,
      rol: data.rol || 'usuario',
      regional_id: data.regional_id || null,
      gerencia_id: data.gerencia_id || null,
      cargo_id: data.cargo_id || null,
      ci: data.ci || '',
      extension: data.extension || '',
      telefono: data.telefono || '',
    });

    // Cargar gerencias y cargos para los valores actuales
    if (data.regional_id) {
      await cargarGerencias(data.regional_id);
    }
    if (data.gerencia_id) {
      await cargarCargos(data.gerencia_id);
    }

    modalEdicion.value = true;
  } catch (error) {
    Swal.fire('Error', 'No se pudo cargar la información del usuario.', 'error');
  } finally {
    cargandoUsuario.value = false;
  }
};

const guardarEdicion = async () => {
  if (!usuarioEditando.username.trim()) {
    Swal.fire('Atención', 'El nombre de usuario es obligatorio.', 'warning');
    return;
  }
  guardando.value = true;
  try {
    const payload = {
      username: usuarioEditando.username,
      first_name: usuarioEditando.first_name,
      last_name: usuarioEditando.last_name,
      email: usuarioEditando.email,
      is_active: usuarioEditando.is_active,
      is_staff: usuarioEditando.is_staff,
      rol: usuarioEditando.rol,
      regional_id: usuarioEditando.regional_id,
      gerencia_id: usuarioEditando.gerencia_id,
      cargo_id: usuarioEditando.cargo_id,
      ci: usuarioEditando.ci,
      extension: usuarioEditando.extension,
      telefono: usuarioEditando.telefono,
    };
    await api.patch(`users/${usuarioEditando.id}/`, payload);
    Swal.fire({ title: '¡Actualizado!', text: 'El usuario fue modificado exitosamente.', icon: 'success', timer: 2000, showConfirmButton: false });
    modalEdicion.value = false;
    await obtenerUsuarios();
  } catch (error) {
    if (error.response?.status === 403) {
      Swal.fire('Sin permisos', 'No tiene permisos para editar este usuario.', 'error');
    } else {
      Swal.fire('Error', 'No se pudo guardar los cambios.', 'error');
    }
  } finally {
    guardando.value = false;
  }
};

const toggleActivacion = async (user) => {
  const accion = user.is_active ? 'desactivar' : 'activar';
  const resultado = await Swal.fire({
    title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario?`,
    text: `${nombreCompleto(user)} será ${user.is_active ? 'desactivado y no podrá acceder al sistema' : 'activado y podrá iniciar sesión'}.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: `Sí, ${accion}`,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: user.is_active ? '#dc3545' : '#28a745',
  });

  if (resultado.isConfirmed) {
    try {
      await api.patch(`users/${user.id}/`, { is_active: !user.is_active });
      await obtenerUsuarios();
      Swal.fire({ title: '¡Listo!', text: `Usuario ${accion}do exitosamente.`, icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Error', `No se pudo ${accion} el usuario.`, 'error');
    }
  }
};

const cerrarModal = () => { modalEdicion.value = false; };
</script>

<template>
  <div class="card shadow-lg border-0 border-radius-xl">
    <div class="card-header pb-0 border-bottom">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 class="mb-0 text-uppercase font-weight-bolder text-azul-tamep">Usuarios del Sistema</h6>
          <p class="text-xs mb-0 text-secondary">Gestión y control de accesos institucionales.</p>
        </div>
        <span class="badge bg-gradient-dark">{{ usuariosFiltrados.length }} Registros</span>
      </div>

      <div class="row g-2 mb-3 pb-3">
        <div class="col-md-6">
          <div class="input-group input-group-sm">
            <span class="input-group-text bg-white"><i class="fas fa-search"></i></span>
            <input type="text" v-model="filtros.busqueda" class="form-control" placeholder="Buscar por nombre, correo o usuario..." @input="paginacion.paginaActual = 1">
          </div>
        </div>
        <div class="col-md-3">
          <select v-model="filtros.estado" class="form-select form-select-sm" @change="paginacion.paginaActual = 1">
            <option value="">Todos los Estados</option>
            <option value="activo">Solo Activos</option>
            <option value="inactivo">Solo Inactivos</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card-body px-0 pt-0 pb-2">
      <p v-if="mensajeUsuarios" class="text-danger text-sm px-4 pt-3">{{ mensajeUsuarios }}</p>
      <div class="table-responsive p-0 min-vh-50">
        <table class="table align-items-center mb-0 table-hover">
          <thead class="bg-gray-100">
            <tr>
              <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Usuario</th>
              <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Cargo / Rol</th>
              <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Regional</th>
              <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Estado</th>
              <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Fecha de Registro</th>
              <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="usuariosPaginados.length === 0">
              <td colspan="6" class="text-center py-5 text-secondary">
                <i class="fas fa-folder-open fa-3x mb-3 opacity-5"></i>
                <p class="mb-0">No se encontraron usuarios con los filtros actuales.</p>
              </td>
            </tr>
            <tr v-for="user in usuariosPaginados" :key="user.id">
              <td>
                <div class="d-flex px-3 py-1">
                  <div class="d-flex flex-column justify-content-center">
                    <h6 class="mb-0 text-sm font-weight-bold">{{ nombreCompleto(user) }}</h6>
                    <p class="text-xs text-secondary mb-0">{{ user.email || 'Sin correo' }}</p>
                  </div>
                </div>
              </td>
              <td>
                <p class="text-xs font-weight-bold mb-0 text-dark">{{ user.cargo_nombre || 'Sin asignar' }}</p>
                <p class="text-xxs text-secondary mb-0">{{ obtenerLabelRol(user.rol) }}</p>
              </td>
              <td>
                <p class="text-xs font-weight-bold mb-0 text-dark">{{ user.regional_nombre || 'Sin asignar' }}</p>
              </td>
              <td class="align-middle text-center text-sm">
                <span
                  class="badge badge-sm cursor-pointer"
                  :class="user.is_active ? 'bg-gradient-success' : 'bg-gradient-secondary'"
                  @click="toggleActivacion(user)"
                  :title="user.is_active ? 'Clic para desactivar' : 'Clic para activar'"
                >
                  {{ user.is_active ? 'ACTIVO' : 'INACTIVO' }}
                </span>
              </td>
              <td class="align-middle text-center">
                <span class="text-secondary text-xs font-weight-bold">
                  {{ user.date_joined ? new Date(user.date_joined).toLocaleDateString('es-ES') : '---' }}
                </span>
              </td>
              <td class="align-middle text-center">
                <button @click="abrirModalEdicion(user.id)" class="btn btn-link text-dark px-3 mb-0">
                  <i class="fas fa-pencil-alt text-dark me-2"></i>Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="d-flex justify-content-between align-items-center px-4 pt-4 border-top">
        <span class="text-xs text-secondary">
          Mostrando {{ (paginacion.paginaActual - 1) * paginacion.itemsPorPagina + 1 }} a
          {{ Math.min(paginacion.paginaActual * paginacion.itemsPorPagina, usuariosFiltrados.length) }}
          de {{ usuariosFiltrados.length }}
        </span>
        <ul class="pagination pagination-sm m-0">
          <li class="page-item" :class="{ disabled: paginacion.paginaActual === 1 }">
            <button class="page-link" @click="cambiarPagina(paginacion.paginaActual - 1)">
              <i class="fas fa-angle-left"></i>
            </button>
          </li>
          <li class="page-item" v-for="pag in totalPaginas" :key="pag" :class="{ active: pag === paginacion.paginaActual }">
            <button class="page-link text-white" @click="cambiarPagina(pag)">{{ pag }}</button>
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

  <!-- MODAL DE EDICIÓN -->
  <div v-if="modalEdicion" class="modal-overlay" @click.self="cerrarModal">
    <div class="card shadow-lg modal-card">
      <div class="card-header pb-0 d-flex justify-content-between align-items-center">
        <h6 class="mb-0 font-weight-bolder text-azul-tamep">Editar Usuario</h6>
        <button class="btn btn-link text-secondary p-0" @click="cerrarModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="card-body modal-body-scroll">
        <!-- Datos de Cuenta -->
        <div class="mb-3">
          <label class="form-label text-xs text-uppercase font-weight-bolder">Usuario</label>
          <input type="text" class="form-control form-control-sm" v-model="usuarioEditando.username">
        </div>
        <div class="row mb-3">
          <div class="col-6">
            <label class="form-label text-xs text-uppercase font-weight-bolder">Nombres</label>
            <input type="text" class="form-control form-control-sm" v-model="usuarioEditando.first_name">
          </div>
          <div class="col-6">
            <label class="form-label text-xs text-uppercase font-weight-bolder">Apellidos</label>
            <input type="text" class="form-control form-control-sm" v-model="usuarioEditando.last_name">
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label text-xs text-uppercase font-weight-bolder">Correo</label>
          <input type="email" class="form-control form-control-sm" v-model="usuarioEditando.email">
        </div>
        <div class="d-flex gap-4 mb-3">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" v-model="usuarioEditando.is_active" id="switchActivo">
            <label class="form-check-label text-sm" for="switchActivo">Cuenta Activa</label>
          </div>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" v-model="usuarioEditando.is_staff" id="switchAdmin">
            <label class="form-check-label text-sm" for="switchAdmin">Administrador</label>
          </div>
        </div>

        <!-- Separador: Información del Perfil -->
        <hr class="horizontal dark my-3">
        <h6 class="text-xs text-uppercase font-weight-bolder opacity-6 mb-3">Información del Perfil</h6>

        <!-- CI + Extensión -->
        <div class="row mb-3">
          <div class="col-8">
            <label class="form-label text-xs text-uppercase font-weight-bolder">Cédula de Identidad</label>
            <input type="text" class="form-control form-control-sm" v-model="usuarioEditando.ci" placeholder="Ej: 12345678">
          </div>
          <div class="col-4">
            <label class="form-label text-xs text-uppercase font-weight-bolder">Extensión</label>
            <select class="form-select form-select-sm" v-model="usuarioEditando.extension">
              <option value="">--</option>
              <option v-for="ext in EXTENSIONES" :key="ext.value" :value="ext.value">{{ ext.label }}</option>
            </select>
          </div>
        </div>

        <!-- Teléfono + Rol -->
        <div class="row mb-3">
          <div class="col-6">
            <label class="form-label text-xs text-uppercase font-weight-bolder">Teléfono</label>
            <input type="text" class="form-control form-control-sm" v-model="usuarioEditando.telefono" placeholder="Ej: 71234567">
          </div>
          <div class="col-6">
            <label class="form-label text-xs text-uppercase font-weight-bolder">Rol del Sistema</label>
            <select class="form-select form-select-sm" v-model="usuarioEditando.rol">
              <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
        </div>

        <!-- Separador: Ubicación Organizacional -->
        <hr class="horizontal dark my-3">
        <h6 class="text-xs text-uppercase font-weight-bolder opacity-6 mb-3">Ubicación Organizacional</h6>

        <!-- Regional -->
        <div class="mb-3">
          <label class="form-label text-xs text-uppercase font-weight-bolder">Regional</label>
          <select class="form-select form-select-sm" v-model="usuarioEditando.regional_id" @change="onRegionalChange">
            <option :value="null">-- Sin asignar --</option>
            <option v-for="reg in regionales" :key="reg.id" :value="reg.id">{{ reg.nombre }}</option>
          </select>
        </div>

        <!-- Gerencia -->
        <div class="mb-3">
          <label class="form-label text-xs text-uppercase font-weight-bolder">Gerencia</label>
          <select class="form-select form-select-sm" v-model="usuarioEditando.gerencia_id" @change="onGerenciaChange" :disabled="!usuarioEditando.regional_id">
            <option :value="null">{{ usuarioEditando.regional_id ? '-- Seleccionar Gerencia --' : '-- Seleccione Regional primero --' }}</option>
            <option v-for="ger in gerencias" :key="ger.id" :value="ger.id">{{ ger.nombre }}</option>
          </select>
        </div>

        <!-- Cargo -->
        <div class="mb-3">
          <label class="form-label text-xs text-uppercase font-weight-bolder">Cargo</label>
          <select class="form-select form-select-sm" v-model="usuarioEditando.cargo_id" :disabled="!usuarioEditando.gerencia_id">
            <option :value="null">{{ usuarioEditando.gerencia_id ? '-- Seleccionar Cargo --' : '-- Seleccione Gerencia primero --' }}</option>
            <option v-for="car in cargos" :key="car.id" :value="car.id">{{ car.nombre }}</option>
          </select>
        </div>
      </div>
      <div class="card-footer d-flex justify-content-end gap-2 pt-0">
        <button class="btn btn-sm btn-outline-secondary" @click="cerrarModal">Cancelar</button>
        <button class="btn btn-sm btn-azul-tamep" @click="guardarEdicion" :disabled="guardando">
          {{ guardando ? 'Guardando...' : 'Guardar Cambios' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-azul-tamep { color: #003366; }
.min-vh-50 { min-height: 50vh; }
.cursor-pointer { cursor: pointer; }

.btn-azul-tamep {
  background: linear-gradient(310deg, #003366 0%, #00509d 100%);
  color: white;
  border: none;
}

.pagination .page-item.active .page-link {
  background-color: #003366;
  border-color: #003366;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-card {
  width: 540px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-body-scroll {
  overflow-y: auto;
  max-height: calc(90vh - 120px);
  scrollbar-width: thin;
}

.modal-body-scroll::-webkit-scrollbar {
  width: 4px;
}

.modal-body-scroll::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}
</style>
