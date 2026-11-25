<script setup>
/* eslint-disable */
import { ref, onMounted, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from "@/services/api.js";
import Swal from "sweetalert2";

const route = useRoute();
const router = useRouter();
const idActivo = route.params.id;

const cargando = ref(true);
const editando = ref(false);
const esGrupoIA = ref(false);

const activo = reactive({});
const parametros = reactive({
  grupos: [],
  ubicaciones: [],
  tipos: []
});

// Contenedor para imágenes nuevas (si el usuario decide cambiarlas)
const nuevasImagenes = reactive({
  imagen_activo: null,
  imagen_lateral: null,
  imagen_sn: null
});

// --- 1. CARGA DE DATOS ---
const cargarDatos = async () => {
  try {
    const [resActivo, resParams] = await Promise.all([
      api.get(`activos/${idActivo}/`),
      api.get("activos/parametros_iniciales/")
    ]);
    
    Object.assign(activo, resActivo.data);
    parametros.grupos = resParams.data.grupos;
    parametros.ubicaciones = resParams.data.ubicaciones;
    
    // Validar si el grupo actual tiene IA
    if (activo.grupo_contable_seleccionado) {
      const grupo = parametros.grupos.find(g => g.id === activo.grupo_contable_seleccionado);
      esGrupoIA.value = grupo ? grupo.tiene_mantenimiento_predictivo : false;
      
      const resTipos = await api.get(`activos/tipos_por_grupo/${activo.grupo_contable_seleccionado}/`);
      parametros.tipos = resTipos.data;
    }

  } catch (e) {
    console.error("Error al cargar gestión", e);
    Swal.fire("Error", "No se pudo cargar la información del activo", "error");
  } finally {
    cargando.value = false;
  }
};

// --- 2. WATCHER DE IA (Igual que en creación) ---
watch(() => activo.grupo_contable_seleccionado, async (newId, oldId) => {
  if (newId && oldId) { // Solo si el usuario lo cambia manualmente
    const grupo = parametros.grupos.find(g => g.id === newId);
    esGrupoIA.value = grupo ? grupo.tiene_mantenimiento_predictivo : false;

    if (!esGrupoIA.value) {
      activo.perfil_uso = 'N/A';
    } else if (activo.perfil_uso === 'N/A') {
      activo.perfil_uso = 'Oficina'; 
    }

    try {
      const { data } = await api.get(`activos/tipos_por_grupo/${newId}/`);
      parametros.tipos = data;
      activo.tipo_activo = null; // Resetea el tipo porque cambió el grupo
    } catch(e) { console.error(e); }
  }
});

// --- 3. MANEJO DE ARCHIVOS ---
const handleFileUpload = (e, campo) => {
  const file = e.target.files[0];
  if (file) {
    nuevasImagenes[campo] = file;
  }
};

// --- 4. GUARDAR CAMBIOS (PATCH MULTIPART) ---
const guardarCambios = async () => {
  try {
    cargando.value = true;
    const fd = new FormData();

    // Empaquetar datos de texto
    const camposPermitidos = [
      'nombre_especifico', 'serie', 
      'descripcion', 'especificaciones', 'fecha_adquisicion', 'costo',
      'grupo_contable_seleccionado', 'tipo_activo', 'ubicacion_base',
      'estado_actual', 'perfil_uso', 'uso_inicial_estimado'
    ];

    camposPermitidos.forEach(key => {
      // Formatear fecha si existe para evitar errores en Django
      if (key === 'fecha_adquisicion' && activo[key]) {
        fd.append(key, activo[key].split('T')[0]); 
      } else if (activo[key] !== null && activo[key] !== undefined) {
        fd.append(key, activo[key]);
      }
    });

    // Empaquetar imágenes SOLO si el usuario seleccionó una nueva
    if (nuevasImagenes.imagen_activo) fd.append('imagen_activo', nuevasImagenes.imagen_activo);
    if (nuevasImagenes.imagen_lateral) fd.append('imagen_lateral', nuevasImagenes.imagen_lateral);
    if (nuevasImagenes.imagen_sn) fd.append('imagen_sn', nuevasImagenes.imagen_sn);

    await api.patch(`activos/${idActivo}/`, fd);
    
    Swal.fire("Éxito", "Activo actualizado correctamente.", "success");
    editando.value = false;
    
    // Limpiar las variables temporales de imágenes y recargar
    nuevasImagenes.imagen_activo = null;
    nuevasImagenes.imagen_lateral = null;
    nuevasImagenes.imagen_sn = null;
    await cargarDatos();

  } catch (e) {
    console.error(e);
    Swal.fire("Error al actualizar", "Revisa los campos obligatorios. Posible código o serie duplicada.", "error");
  } finally {
    cargando.value = false;
  }
};

onMounted(cargarDatos);
</script>

<template>
  <div class="container-fluid py-4">
    <div v-if="cargando" class="text-center py-5">
      <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div>
      <p class="mt-2 text-secondary font-weight-bold">SINCRONIZANDO DATOS...</p>
    </div>

    <div v-else class="row justify-content-center">
      <div class="col-lg-10">
        <div class="card border-0 shadow-lg border-radius-xl overflow-hidden">
          
          <div class="header-tamep px-4 py-3 d-flex justify-content-between align-items-center" style="background: linear-gradient(135deg, #003366 0%, #001d3d 100%);">
            <div class="d-flex align-items-center">
              <button @click="router.back()" class="btn btn-link text-white p-0 me-3 shadow-none">
                <i class="fas fa-arrow-left fa-lg"></i>
              </button>
              <div>
                <h6 class="mb-0 text-white text-uppercase font-weight-bolder">Edición de Activo</h6>
                <small class="text-white opacity-7">COD: {{ activo.codigo_tamep }} | S/N: {{ activo.serie }}</small>
              </div>
            </div>
            <button @click="editando = !editando" :class="editando ? 'btn-danger' : 'btn-warning'" class="btn btn-sm mb-0 font-weight-bold shadow-sm">
              <i class="fas" :class="editando ? 'fa-times' : 'fa-edit'"></i> 
              {{ editando ? 'BLOQUEAR EDICIÓN' : 'HABILITAR EDICIÓN' }}
            </button>
          </div>

          <div class="card-body p-4 bg-light">
            <form @submit.prevent="guardarCambios">
              
              <div class="bg-white p-4 border-radius-lg shadow-sm mb-4">
                <div class="section-title mb-4 d-flex align-items-center">
                  <div class="step-number me-2 bg-dark text-white rounded-circle d-flex justify-content-center align-items-center" style="width:25px; height:25px; font-size:12px;">1</div>
                  <h6 class="font-weight-bolder mb-0 text-azul-tamep text-uppercase">Identificación y Clasificación</h6>
                </div>
                
                <div class="row g-3">
                 <div class="col-md-3">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Código TAMEP</label>
                    <input type="text" v-model="activo.codigo_tamep" class="form-control bg-gray-200 cursor-not-allowed" disabled>
                    <small class="text-danger" style="font-size: 0.65rem;"><i class="fas fa-lock me-1"></i>Bloqueado (QR)</small>
                  </div>
                  <div class="col-md-3">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Código TAB</label>
                    <input type="text" v-model="activo.codigo_tab" class="form-control bg-gray-200 cursor-not-allowed" disabled>
                    <small class="text-danger" style="font-size: 0.65rem;"><i class="fas fa-lock me-1"></i>Bloqueado (Histórico)</small>
                  </div>
                  <div class="col-md-6">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Nombre Específico / Modelo</label>
                    <input type="text" v-model="activo.nombre_especifico" class="form-control" :disabled="!editando" required>
                  </div>
                  <div class="col-md-4">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Nro. de Serie</label>
                    <input type="text" v-model="activo.serie" class="form-control" :disabled="!editando" required>
                  </div>
                  
                  <div class="col-md-4">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Grupo Contable</label>
                    <select class="form-select" v-model="activo.grupo_contable_seleccionado" :disabled="!editando" required>
                      <option v-for="g in parametros.grupos" :key="g.id" :value="g.id">{{ g.nombre }}</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Tipo de Activo</label>
                    <select class="form-select" v-model="activo.tipo_activo" :disabled="!editando" required>
                      <option v-for="t in parametros.tipos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="bg-white p-4 border-radius-lg shadow-sm mb-4 border-start border-4" :class="esGrupoIA ? 'border-warning' : 'border-secondary'">
                <div class="section-title mb-4 d-flex align-items-center">
                  <div class="step-number me-2 bg-dark text-white rounded-circle d-flex justify-content-center align-items-center" style="width:25px; height:25px; font-size:12px;">
                    <i class="fas fa-robot"></i>
                  </div>
                  <h6 class="font-weight-bolder mb-0 text-azul-tamep text-uppercase">Estado Operativo e IA</h6>
                </div>

                <div class="row g-3">
                  <div class="col-md-3">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Situación Actual</label>
                    <select v-model="activo.situacion_activo" class="form-select bg-gray-200 cursor-not-allowed" disabled>
                      <option value="Disponible">Disponible (Libre)</option>
                      <option value="Asignado">Asignado (En uso)</option>
                      <option value="Mantenimiento">En Mantenimiento</option>
                      <option value="Baja">Dado de Baja</option>
                    </select>
                    <small class="text-danger" style="font-size: 0.65rem;"><i class="fas fa-lock me-1"></i>Modificable solo por Transferencia</small>
                  </div>
                  <div class="col-md-3">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Estado Físico</label>
                    <select v-model="activo.estado_actual" class="form-select" :disabled="!editando">
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                    </select>
                  </div>
                  <div class="col-md-3">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Perfil de Uso</label>
                    <select v-model="activo.perfil_uso" class="form-select" :disabled="!editando || !esGrupoIA">
                      <option value="N/A" v-if="!esGrupoIA">No Aplica (Sin IA)</option>
                      <template v-else>
                        <option value="Oficina">Oficina (8h/5d)</option>
                        <option value="Intensivo">Intensivo (12h/6d)</option>
                        <option value="Critico">Crítico (24h/7d)</option>
                      </template>
                    </select>
                  </div>
                  <div class="col-md-3">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Uso Inicial (Hrs)</label>
                    <input type="number" v-model="activo.uso_inicial_estimado" class="form-control" :disabled="!editando || !esGrupoIA">
                  </div>
                </div>

                <div v-if="esGrupoIA" class="row mt-4 pt-4 border-top">
                  <div class="col-md-4">
                    <div class="card border border-light shadow-none text-center bg-gray-100 py-3">
                      <p class="text-xs font-weight-bold mb-0 text-secondary">Salud Técnica</p>
                      <h4 class="mb-0" :class="activo.prediccion?.indice_salud_fuzzy < 50 ? 'text-danger' : 'text-success'">
                        {{ activo.prediccion?.indice_salud_fuzzy || 0 }}%
                      </h4>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="card border border-light shadow-none text-center bg-gray-100 py-3">
                      <p class="text-xs font-weight-bold mb-0 text-secondary">Riesgo de Falla</p>
                      <h4 class="mb-0 text-dark">{{ activo.prediccion?.probabilidad_falla || 0 }}%</h4>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="card border border-light shadow-none text-center bg-gray-100 py-3">
                      <p class="text-xs font-weight-bold mb-0 text-secondary">Horas Acumuladas</p>
                      <h4 class="mb-0 text-dark">{{ activo.horas_uso_actual || 0 }} hrs</h4>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-white p-4 border-radius-lg shadow-sm mb-4">
                <div class="section-title mb-4 d-flex align-items-center">
                  <div class="step-number me-2 bg-dark text-white rounded-circle d-flex justify-content-center align-items-center" style="width:25px; height:25px; font-size:12px;">3</div>
                  <h6 class="font-weight-bolder mb-0 text-azul-tamep text-uppercase">Detalles y Finanzas</h6>
                </div>
                <div class="row g-3">
                  <div class="col-md-12">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Especificaciones Técnicas</label>
                    <textarea v-model="activo.especificaciones" class="form-control" rows="2" :disabled="!editando"></textarea>
                  </div>
                  <div class="col-md-12">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Descripción General</label>
                    <textarea v-model="activo.descripcion" class="form-control" rows="2" :disabled="!editando"></textarea>
                  </div>
                  <div class="col-md-4">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Fecha de Adquisición</label>
                    <input type="date" v-model="activo.fecha_adquisicion" class="form-control" :disabled="!editando">
                  </div>
                  <div class="col-md-4">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Costo (Bs.)</label>
                    <input type="number" step="0.01" v-model="activo.costo" class="form-control" :disabled="!editando">
                  </div>
                  <div class="col-md-4">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Ubicación Base (Origen)</label>
                    <select class="form-select" v-model="activo.ubicacion_base" :disabled="!editando">
                      <option v-for="u in parametros.ubicaciones" :key="u.id" :value="u.id">{{ u.nombre_sala }}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="bg-white p-4 border-radius-lg shadow-sm mb-4">
                <div class="section-title mb-4 d-flex align-items-center">
                  <div class="step-number me-2 bg-dark text-white rounded-circle d-flex justify-content-center align-items-center" style="width:25px; height:25px; font-size:12px;">
                    <i class="fas fa-camera"></i>
                  </div>
                  <h6 class="font-weight-bolder mb-0 text-azul-tamep text-uppercase">Evidencia Fotográfica</h6>
                </div>
                
                <div class="row g-3">
                  <div class="col-md-4">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Imagen Frontal</label>
                    <input v-if="editando" type="file" class="form-control text-xs mb-2" @change="handleFileUpload($event, 'imagen_activo')" accept="image/*">
                    <div v-if="activo.imagen_activo && !nuevasImagenes.imagen_activo" class="border rounded p-1 text-center bg-gray-100">
                      <img :src="activo.imagen_activo" class="img-fluid rounded" style="max-height: 120px;">
                    </div>
                  </div>
                  <div class="col-md-4">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Placa Técnica / Lateral</label>
                    <input v-if="editando" type="file" class="form-control text-xs mb-2" @change="handleFileUpload($event, 'imagen_lateral')" accept="image/*">
                    <div v-if="activo.imagen_lateral && !nuevasImagenes.imagen_lateral" class="border rounded p-1 text-center bg-gray-100">
                      <img :src="activo.imagen_lateral" class="img-fluid rounded" style="max-height: 120px;">
                    </div>
                  </div>
                  <div class="col-md-4">
                    <label class="label-custom text-xs font-weight-bold text-secondary">Serial Number (S/N)</label>
                    <input v-if="editando" type="file" class="form-control text-xs mb-2" @change="handleFileUpload($event, 'imagen_sn')" accept="image/*">
                    <div v-if="activo.imagen_sn && !nuevasImagenes.imagen_sn" class="border rounded p-1 text-center bg-gray-100">
                      <img :src="activo.imagen_sn" class="img-fluid rounded" style="max-height: 120px;">
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="editando" class="text-end mt-4">
                <button type="submit" class="btn btn-dark px-5 py-3 font-weight-bold w-100 shadow-lg" style="font-size: 1.1rem;">
                  <i class="fas fa-save me-2"></i> APLICAR CAMBIOS AL ACTIVO
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cursor-not-allowed {
  cursor: not-allowed !important;
}
.text-azul-tamep { color: #003366; }
.bg-gray-100 { background-color: #f8f9fa; }
.form-control:disabled, .form-select:disabled {
  background-color: #e9ecef;
  color: #6c757d;
  border-color: #ced4da;
  opacity: 1;
}
.label-custom {
  margin-bottom: 0.25rem;
  display: block;
}
</style>