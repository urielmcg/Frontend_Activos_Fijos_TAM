<script setup>
/* eslint-disable */
import { reactive, ref, onMounted } from 'vue';
// IMPORTANTE: Usamos la instancia configurada que ya tiene la baseURL y el Token
import api from "@/services/api.js";
import ArgonInput from '@/components/ArgonInput.vue';
import logo from "@/assets/img/fondotam-blanco.png";
import Swal from "sweetalert2";
import TurnstileWidget from "@/components/TurnstileWidget.vue";

// --- ESTADOS ---
const activoEncontrado = ref(null);
const codigoBusqueda = ref('');
const cargando = ref(false);
const turnstileToken = ref("");

const formulario = reactive({
  activo: '',
  usuario: '',
  regional: '',
  gerencia: '',
  cargo: '',
  ubicacion: '',
  tipo: 'Permanente',
  esta_activa: true,
  num_acta: '',
  fecha_fin_estimada: '',
  observaciones: '',
  documento_designacion: null
});

const listas = reactive({
  regionales: [],
  gerencias: [],
  cargos: [],
  usuarios: [],
  ubicaciones: []
});
const listaPersonalMaster = ref([]);

// --- CARGA INICIAL ---
onMounted(async () => {
  try {
    cargando.value = true;

    // Usamos rutas relativas. Api les pegará la baseURL de siaem.tamep.bo o localhost
    const [resParams, resUbis, resPers] = await Promise.all([
      api.get('operacion-baja/datos_formulario/'),
      api.get('activos/ubicaciones_list/'),
      api.get('designaciones/estructura_completa/')
    ]);

    listas.regionales = resParams.data.regionales;
    listas.ubicaciones = resUbis.data;
    listaPersonalMaster.value = resPers.data;

  } catch (e) {
    console.error("Error de carga:", e);
    if (e.response?.status === 401) {
      Swal.fire("Sesión Expirada", "Por favor, inicie sesión nuevamente.", "error");
    } else {
      Swal.fire("Error", "No se pudieron obtener los datos base del servidor.", "error");
    }
  } finally { cargando.value = false; }
});

// --- LÓGICA DE FILTRADO JERÁRQUICO ---
const filtrarGerencias = () => {
  const filtrados = listaPersonalMaster.value.filter(p => p.regional_id === formulario.regional);
  listas.gerencias = [...new Map(filtrados.map(item => [item.gerencia_id, { id: item.gerencia_id, nombre: item.gerencia_nombre }])).values()];
  formulario.gerencia = ''; formulario.cargo = ''; formulario.usuario = '';
};

const filtrarCargos = () => {
  const filtrados = listaPersonalMaster.value.filter(p => p.gerencia_id === formulario.gerencia);
  listas.cargos = [...new Map(filtrados.map(item => [item.cargo_id, { id: item.cargo_id, nombre: item.cargo_nombre }])).values()];
  formulario.cargo = ''; formulario.usuario = '';
};

const filtrarUsuarios = () => {
  listas.usuarios = listaPersonalMaster.value.filter(p => p.cargo_id === formulario.cargo);
  formulario.usuario = '';
};

// --- BÚSQUEDA DE ACTIVO DISPONIBLE ---
const buscarActivo = async () => {
  if (!codigoBusqueda.value) return;
  cargando.value = true;
  activoEncontrado.value = null;

  try {
    const query = codigoBusqueda.value.trim();
    // Buscamos directamente en el endpoint de activos usando la instancia central
    const { data } = await api.get(`activos/?search=${query}`);

    if (data && data.length > 0) {
      const activo = data[0];
      // Verificamos si el activo se puede asignar
      if (activo.situacion_activo !== 'Disponible') {
        Swal.fire("No Disponible", `El activo ya está ${activo.situacion_activo}. Para cambiar de dueño use Transferencias.`, "warning");
      } else {
        activoEncontrado.value = activo;
        formulario.activo = activo.id;
        Swal.fire({ icon: 'success', title: 'Activo Encontrado', text: activo.nombre_especifico, timer: 1500, showConfirmButton: false });
      }
    } else {
      Swal.fire("No Encontrado", "No existe un activo con ese código.", "error");
    }
  } catch (e) {
    Swal.fire("Error", "No se pudo realizar la búsqueda.", "error");
  } finally { cargando.value = false; }
};

const handleFile = (e) => { formulario.documento_designacion = e.target.files[0]; };

// --- GUARDAR DESIGNACIÓN ---
const guardarAsignacion = async () => {
  if (!turnstileToken.value) {
    return Swal.fire("Atención", "Complete la verificación Turnstile.", "warning");
  }
  if (!formulario.num_acta) {
    Swal.fire("Falta el Acta", "Debe ingresar el número de acta física para continuar.", "warning");
    return;
  }
  if (!formulario.usuario || !formulario.ubicacion) {
    Swal.fire("Campos Incompletos", "Debe asignar un Responsable y una Ubicación física.", "warning");
    return;
  }

  cargando.value = true;
  const fd = new FormData();

  // Llenamos el FormData de forma limpia
  Object.keys(formulario).forEach(key => {
    if (formulario[key] !== null && formulario[key] !== '') {
      fd.append(key, formulario[key]);
    }
  });
  fd.append("turnstile_token", turnstileToken.value);

  try {
    // La instancia central ya sabe que si enviamos un FormData debe manejar el boundary
    await api.post('designaciones/', fd);
    turnstileToken.value = "";

    Swal.fire({
      title: "Asignación Registrada",
      text: "El activo ahora tiene un custodio legal asignado.",
      icon: "success",
      confirmButtonText: "Aceptar",
      confirmButtonColor: "#2dce89"
    });
    resetForm();
  } catch (error) {
    if (error.response?.status === 403) {
      Swal.fire("Permiso Denegado", "No tiene permisos para asignar activos. Solo administradores pueden realizar esta acción.", "warning");
    } else {
      const msg = error.response?.data ? Object.values(error.response.data).flat().join(" ") : "Error en el servidor";
      Swal.fire("Error de Registro", msg, "error");
    }
  } finally { cargando.value = false; }
};

const resetForm = () => {
  activoEncontrado.value = null;
  codigoBusqueda.value = '';
  Object.assign(formulario, {
    activo: '', usuario: '', regional: '', gerencia: '', cargo: '',
    ubicacion: '', tipo: 'Permanente', esta_activa: true, fecha_fin_estimada: '',
    observaciones: '', documento_designacion: null
  });
};
</script>

<template>
  <div class="container-fluid py-4 bg-gray-100 min-vh-100">
    <div class="row justify-content-center">
      <div class="col-lg-11">
        <div class="card shadow-lg border-0 border-radius-xl">
          <div class="card-header p-0 position-relative mt-n4 mx-3 z-index-2">
            <div
              class="bg-gradient-dark-tamep shadow-dark border-radius-lg pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
              <div>
                <h5 class="text-white text-uppercase mb-0 font-weight-bolder">Asignación de Activos (Custodia)</h5>
                <p class="text-white opacity-8 text-sm mb-0">Registro oficial de entrega de bienes a funcionarios</p>
              </div>
              <div class="bg-white p-2 border-radius-md">
                <img :src="logo" class="logo-header">
              </div>
            </div>
          </div>

          <div class="card-body p-4 pt-5">
            <div class="row">
              <div class="col-lg-5 border-end">
                <div class="d-flex align-items-center mb-3">
                  <span class="badge-step me-2">1</span>
                  <h6 class="mb-0 font-weight-bold text-uppercase">Seleccionar Activo</h6>
                </div>

                <div class="row g-2 mb-4">
                  <div class="col-8">
                    <input v-model="codigoBusqueda" class="form-control border-2" placeholder="Código TAMEP o TAB..."
                      @keyup.enter="buscarActivo">
                  </div>
                  <div class="col-4">
                    <button @click="buscarActivo" class="btn btn-tamep-dark w-100 mb-0" :disabled="cargando">
                      <i class="fas fa-search"></i>
                    </button>
                  </div>
                </div>

                <div v-if="activoEncontrado"
                  class="asset-preview p-3 border-radius-lg bg-gray-100 animate__animated animate__fadeIn">
                  <img :src="activoEncontrado.imagen_activo"
                    class="w-100 border-radius-lg shadow mb-3 img-fluid main-asset-img">
                  <h6 class="mb-1">{{ activoEncontrado.nombre_especifico }}</h6>
                  <p class="text-xs text-secondary mb-2">Serie: {{ activoEncontrado.serie }}</p>
                  <div class="d-flex justify-content-between border-top pt-2">
                    <small class="font-weight-bold">Código:</small>
                    <small>{{ activoEncontrado.codigo_tamep }}</small>
                  </div>
                </div>
                <div v-else class="text-center py-5 opacity-4">
                  <i class="fas fa-barcode fa-4x mb-3"></i>
                  <p>Escanee o ingrese un código para comenzar</p>
                </div>
              </div>

              <div class="col-lg-7 ps-lg-4">
                <div v-if="activoEncontrado" class="animate__animated animate__fadeIn">
                  <div class="d-flex align-items-center mb-3">
                    <span class="badge-step me-2">2</span>
                    <h6 class="mb-0 font-weight-bold text-uppercase">Datos del Custodio</h6>
                  </div>

                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="label-custom">Regional</label>
                      <select v-model="formulario.regional" @change="filtrarGerencias" class="form-select-tamep">
                        <option value="">Seleccione...</option>
                        <option v-for="r in listas.regionales" :key="r.id" :value="r.id">{{ r.nombre }}</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="label-custom">Gerencia</label>
                      <select v-model="formulario.gerencia" @change="filtrarCargos" :disabled="!formulario.regional"
                        class="form-select-tamep">
                        <option v-for="g in listas.gerencias" :key="g.id" :value="g.id">{{ g.nombre }}</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="label-custom">Cargo</label>
                      <select v-model="formulario.cargo" @change="filtrarUsuarios" :disabled="!formulario.gerencia"
                        class="form-select-tamep">
                        <option v-for="c in listas.cargos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="label-custom">Funcionario Receptor</label>
                      <select v-model="formulario.usuario" :disabled="!formulario.cargo"
                        class="form-select-tamep border-primary-light">
                        <option v-for="u in listas.usuarios" :key="u.id" :value="u.id">{{ u.nombre_completo }}</option>
                      </select>
                    </div>

                    <div class="col-12">
                      <hr class="horizontal dark">
                    </div>

                    <div class="d-flex align-items-center mb-2">
                      <span class="badge-step me-2">3</span>
                      <h6 class="mb-0 font-weight-bold text-uppercase">Detalles de Entrega</h6>
                    </div>
                    <div class="col-md-12">
                      <label class="label-custom text-primary">Número de Acta de Designación (Manual)</label>
                      <div class="input-group">
                        <span class="input-group-text bg-gray-200 border-2"><i class="fas fa-file-signature"></i></span>
                        <input v-model="formulario.num_acta" type="text"
                          class="form-control border-2 ps-2 font-weight-bold" placeholder="Ej: DES-2026-0001"
                          style="text-transform: uppercase;">
                      </div>
                      <small class="text-xxs text-muted">Debe coincidir exactamente con el documento físico
                        foliado.</small>
                    </div>

                    <div class="col-md-6">
                      <label class="label-custom">Ubicación Física (Sala)</label>
                      <select v-model="formulario.ubicacion" class="form-select-tamep">
                        <option v-for="u in listas.ubicaciones" :key="u.id" :value="u.id">{{ u.nombre_sala }}</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="label-custom">Tipo de Asignación</label>
                      <select v-model="formulario.tipo" class="form-select-tamep">
                        <option value="Permanente">Asignación Permanente (Cargo)</option>
                        <option value="Temporal">Préstamo Temporal</option>
                      </select>
                    </div>
                    <div class="col-md-6" v-if="formulario.tipo === 'Temporal'">
                      <label class="label-custom">Fecha de Devolución Estimada</label>
                      <input type="date" v-model="formulario.fecha_fin_estimada" class="form-control-tamep">
                    </div>
                    <div class="col-md-6">
                      <label class="label-custom">Acta de Designación (PDF)</label>
                      <input type="file" @change="handleFile" class="form-control" accept=".pdf">
                    </div>
                    <div class="col-12">
                      <label class="label-custom">Observaciones de Entrega</label>
                      <textarea v-model="formulario.observaciones" class="form-control border-2" rows="2"></textarea>
                    </div>
                  </div>

                  <TurnstileWidget v-model="turnstileToken" />
                  <button @click="guardarAsignacion" class="btn btn-tamep-primary w-100 mt-4 shadow-lg py-3"
                    :disabled="cargando">
                    <i class="fas fa-save me-2"></i> {{ cargando ? 'REGISTRANDO...' : 'FINALIZAR ASIGNACIÓN' }}
                  </button>
                </div>

                <div v-else class="h-100 d-flex align-items-center justify-content-center text-center opacity-5">
                  <div>
                    <i class="fas fa-user-tag fa-3x mb-3"></i>
                    <p>Complete el paso 1 para habilitar la asignación</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-gradient-dark-tamep {
  background: linear-gradient(135deg, #001d3d 0%, #003366 100%);
}

.logo-header {
  max-height: 40px;
}

.badge-step {
  background: #003366;
  color: white;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.8rem;
}

.label-custom {
  font-size: 0.65rem;
  font-weight: 800;
  color: #8392ab;
  text-transform: uppercase;
  margin-bottom: 5px;
  display: block;
}

.form-select-tamep,
.form-control-tamep {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 2px solid #e9ecef;
  font-size: 0.85rem;
}

.form-select-tamep:focus {
  border-color: #003366;
  outline: none;
}

.btn-tamep-dark {
  background-color: #001d3d;
  color: white;
  font-weight: bold;
}

.btn-tamep-primary {
  background-color: #003366;
  color: white;
  font-weight: bold;
  border-radius: 10px;
}

.btn-tamep-primary:hover {
  background-color: #001d3d;
}

.main-asset-img {
  max-height: 250px;
  object-fit: cover;
}

.border-primary-light {
  border-color: #00336680 !important;
}
</style>