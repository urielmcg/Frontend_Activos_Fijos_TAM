<script setup>
import { reactive, ref, onMounted, watch } from 'vue';
import api from '@/services/api.js';
import ArgonInput from '@/components/ArgonInput.vue';
import logo from "@/assets/img/fondotam-blanco.png";
import Swal from "sweetalert2";
import { generarEtiquetaTermica } from '@/js/ImpresionEtiqueta.js';
import TurnstileWidget from '@/components/TurnstileWidget.vue';

// --- ESTADOS Y FORMULARIOS ---
const cargando = ref(false);
// Token del formulario principal (POST activos/) y del modal de custodio
// (POST designaciones/): cada envío necesita su propio token, Turnstile
// no permite reutilizar un token ya verificado.
const turnstileToken = ref("");
const turnstileTokenExtra = ref("");
const qrUrl = ref(null);
const mostrarModalExtra = ref(false);
const tipoProcesoExtra = ref('');
const idActivoRecienCreado = ref(null);
const procesoFinalizadoExitosa = ref(false);
const listaPersonal = ref([]);
const esGrupoIA = ref(false);

const previsualizaciones = reactive({
  imagen_activo: null,
  imagen_lateral: null,
  imagen_sn: null
});

const formularioActivo = reactive({
  codigo_tamep: '',
  codigo_tab: '',
  nombre_especifico: '',
  serie: '',
  descripcion: '',
  especificaciones: '',
  fecha_adquisicion: new Date().toISOString().substr(0, 10),
  costo: 0,
  grupo_contable_seleccionado: null,
  tipo_activo: null,
  ubicacion_base: null,
  estado_actual: 'Bueno',
  situacion_activo: 'Disponible',
  perfil_uso: 'N/A',
  uso_inicial_estimado: 0,
  contador_fallas: 0,
  imagen_activo: null,
  imagen_lateral: null,
  imagen_sn: null
});

const techSpecs = reactive({
  cpu: '', ram: '', disco: '', mac: '', so: '', voltaje: '220V'
});

const listas = reactive({ grupos: [], tipos: [], ubicaciones: [] });
const opciones = reactive({ regionales: [], gerencias: [], cargos: [], usuarios: [] });

const formularioExtra = reactive({
  regional: '', gerencia: '', cargo: '', usuario: '',
  ubicacion: '', motivo_cambio_o_baja: '', tipo: ''
});

// --- CARGA DE DATOS INICIAL ---
onMounted(async () => {
  try {
    cargando.value = true;
    const [resParams, resPers] = await Promise.all([
      api.get('activos/parametros_iniciales/'),
      api.get('activos/personal_list/')
    ]);

    listas.grupos = resParams.data.grupos;
    listas.ubicaciones = resParams.data.ubicaciones;
    listaPersonal.value = resPers.data;
  } catch (e) {
    console.error("Error de carga:", e);
    if (e.response?.status === 401) Swal.fire("Error", "Sesión expirada", "error");
  } finally { cargando.value = false; }
});

// --- WATCHERS DINÁMICOS ---
watch(() => formularioActivo.grupo_contable_seleccionado, async (id) => {
  if (id) {
    const grupo = listas.grupos.find(g => g.id === id);
    esGrupoIA.value = grupo ? grupo.tiene_mantenimiento_predictivo : false;

    if (!esGrupoIA.value) {
      formularioActivo.perfil_uso = 'N/A';
      formularioActivo.uso_inicial_estimado = 0;
    } else if (formularioActivo.perfil_uso === 'N/A') {
      formularioActivo.perfil_uso = 'Oficina'; 
    }

    try {
      const { data } = await api.get(`activos/tipos_por_grupo/${id}/`);
      listas.tipos = data;
      formularioActivo.tipo_activo = null;
    } catch(e) { console.error(e); }
  } else {
    esGrupoIA.value = false;
  }
});

watch(listaPersonal, (nuevaLista) => {
  const unicas = [];
  const map = new Map();
  for (const item of nuevaLista) {
    if (!map.has(item.regional_id)) {
      map.set(item.regional_id, true);
      unicas.push({ id: item.regional_id, nombre: item.regional_nombre });
    }
  }
  opciones.regionales = unicas;
});

// --- FUNCIONES MULTIMEDIA ---
const handleFileUpload = (e, campo) => { 
  const file = e.target.files[0];
  if (!file) return;
  formularioActivo[campo] = file; 
  previsualizaciones[campo] = URL.createObjectURL(file);
};

const eliminarImagen = (campo) => {
  formularioActivo[campo] = null;
  previsualizaciones[campo] = null;
};

const corregirIp = (url) => {
  if (!url) return '';
  // FIX: En dev mantener localhost:8000 accesible, no usar IP fija de la red Tamep que causa 404/timeout y deja la pantalla congelada tras POST 201
  if (process.env.NODE_ENV === 'production') {
    return url.replace(/https?:\/\/[^/]+/, 'https://siaem.tamep.bo');
  }
  const host = window.location.hostname || 'localhost';
  return url.replace(/https?:\/\/[^/]+/, `http://${host}:8000`);
};

const imprimirEtiquetaPDF = () => {
  generarEtiquetaTermica({
    qrUrl: qrUrl.value,
    codigo_tamep: formularioActivo.codigo_tamep,
    codigo_tab: formularioActivo.codigo_tab,
    serie: formularioActivo.serie
  });
};

// --- PROCESOS DE ASIGNACIÓN Y REGISTRO ---
const irAPasoAsignacion = (id) => {
  idActivoRecienCreado.value = id;
  tipoProcesoExtra.value = 'Asignado';
  formularioExtra.tipo = 'Asignacion';
  formularioExtra.ubicacion = formularioActivo.ubicacion_base;
  mostrarModalExtra.value = true;
};

const finalizarProcesoCompleto = async () => {
  if (!turnstileTokenExtra.value) {
    Swal.fire("Atención", "Complete la verificación Turnstile.", "warning"); return;
  }
  if (!formularioExtra.regional || !formularioExtra.usuario) {
    Swal.fire("Incompleto", "Seleccione Regional y Responsable.", "warning"); return;
  }
  cargando.value = true;
  try {
    const dataFinal = {
      activo: idActivoRecienCreado.value,
      tipo: formularioExtra.tipo,
      regional: formularioExtra.regional,
      gerencia: formularioExtra.gerencia,
      cargo: formularioExtra.cargo,
      usuario: formularioExtra.usuario,
      ubicacion: formularioExtra.ubicacion || formularioActivo.ubicacion_base,
      motivo_cambio_o_baja: formularioExtra.motivo_cambio_o_baja,
      esta_activa: true,
      turnstile_token: turnstileTokenExtra.value
    };
    await api.post('designaciones/', dataFinal);
    turnstileTokenExtra.value = "";
    procesoFinalizadoExitosa.value = true;
    mostrarModalExtra.value = false;
    Swal.fire("Éxito", "Asignación completada correctamente.", "success");
    
    // Llamada actualizada a jsPDF
    setTimeout(() => { imprimirEtiquetaPDF(); }, 600);
  } catch (error) {
    Swal.fire("Error", "No se pudo completar la asignación.", "error");
  } finally { cargando.value = false; }
};

const registrarActivo = async () => {
  if (!turnstileToken.value) {
    Swal.fire("Atención", "Complete la verificación Turnstile.", "warning"); return;
  }
  cargando.value = true;
  const fd = new FormData();
  
  if (esGrupoIA.value) {
    formularioActivo.especificaciones = `CPU: ${techSpecs.cpu} | RAM: ${techSpecs.ram} | Disco: ${techSpecs.disco} | MAC: ${techSpecs.mac} | Voltaje: ${techSpecs.voltaje}`;
  } else {
    formularioActivo.especificaciones = 'N/A (Activo no tecnológico)';
  }

  Object.keys(formularioActivo).forEach(key => {
    if (formularioActivo[key] !== null) fd.append(key, formularioActivo[key]);
  });
  fd.append("turnstile_token", turnstileToken.value);

  try {
    const response = await api.post('activos/', fd);
    turnstileToken.value = "";
    if (response.data.id) {
      qrUrl.value = corregirIp(response.data.imagen_qr);
      // Alerta de confirmación de creación del activo fijo
      Swal.fire("Éxito", "El activo fijo ha sido creado correctamente.", "success");
      if (formularioActivo.situacion_activo === 'Disponible') {
        // Llamada actualizada a jsPDF
        setTimeout(() => { imprimirEtiquetaPDF(); }, 600);
      } else {
        irAPasoAsignacion(response.data.id);
      }
    }
  } catch (error) {
    console.error("Error detalle:", error.response?.data);
    const data = error.response?.data;
    let msg = "Verifique los datos obligatorios. Posible código duplicado.";
    if (data) {
      // Si es {"codigo_tamep": ["Ya existe..."], "serie": [...]}
      msg = Object.entries(data).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
    } else if (error.message) msg = error.message;
    Swal.fire("Error", msg, "error");
  } finally { cargando.value = false; }
};

// --- FILTROS JERÁRQUICOS ---
const filtrarGerencias = () => {
  const filtrados = listaPersonal.value.filter(p => p.regional_id === formularioExtra.regional);
  opciones.gerencias = [...new Map(filtrados.map(i => [i.gerencia_id, {id: i.gerencia_id, nombre: i.gerencia_nombre}])).values()];
  formularioExtra.gerencia = ''; formularioExtra.cargo = ''; formularioExtra.usuario = '';
};
const filtrarCargos = () => {
  const filtrados = listaPersonal.value.filter(p => p.gerencia_id === formularioExtra.gerencia);
  opciones.cargos = [...new Map(filtrados.map(i => [i.cargo_id, {id: i.cargo_id, nombre: i.cargo_nombre}])).values()];
  formularioExtra.cargo = ''; formularioExtra.usuario = '';
};
const filtrarUsuarios = () => { opciones.usuarios = listaPersonal.value.filter(p => p.cargo_id === formularioExtra.cargo); };
const prepararNuevoRegistro = () => { window.location.reload(); };
</script>

<template>
  <div class="container-fluid py-4 bg-light min-vh-100">
    <form @submit.prevent="registrarActivo">
      <div class="row">
        <div class="col-lg-8">
          <div class="card border-0 shadow-lg overflow-hidden mb-4 border-radius-2xl">
            <div class="header-tamep d-flex align-items-center px-4 py-3 text-white">
              <div class="logo-container-left me-3"><img :src="logo" class="logo-img"></div>
              <div>
                <h6 class="mb-0 text-white text-uppercase font-weight-bolder">Registro Maestro de Activo</h6>
                <small class="opacity-7">Configuración completa para Análisis Predictivo (SIAEM)</small>
              </div>
            </div>

            <div class="card-body p-4">
              <div class="section-title mb-4 d-flex align-items-center">
                <div class="step-number me-2">1</div>
                <h5 class="font-weight-bolder mb-0 text-azul-tamep">Identificación y Clasificación</h5>
              </div>
              <div class="row g-3 mb-4">
                <div class="col-md-3"><label class="label-custom">Código</label><argon-input v-model="formularioActivo.codigo_tamep" required /></div>
                <div class="col-md-3"><label class="label-custom">Historico</label><argon-input v-model="formularioActivo.codigo_tab" /></div>
                <div class="col-md-6"><label class="label-custom">Nombre Específico (Marca/Modelo)</label><argon-input v-model="formularioActivo.nombre_especifico" required /></div>
                <div class="col-md-4"><label class="label-custom">Nro. de Serie</label><argon-input v-model="formularioActivo.serie" required /></div>
                <div class="col-md-4">
                  <label class="label-custom">Grupo Contable</label>
                  <select class="form-select-custom" v-model="formularioActivo.grupo_contable_seleccionado" required>
                    <option v-for="g in listas.grupos" :key="g.id" :value="g.id">{{ g.nombre }}</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="label-custom">Tipo de Activo</label>
                  <select class="form-select-custom" v-model="formularioActivo.tipo_activo" :required="formularioActivo.tipo_activo !== null">
                    <option v-for="t in listas.tipos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
                    <option :value="null">Otro</option>
                  </select>
                </div>
              </div>

              <div class="section-title mb-3 d-flex align-items-center mt-5">
                <div class="step-number me-2" :class="esGrupoIA ? 'bg-warning text-dark' : 'bg-secondary'">
                  <i class="fas fa-robot"></i>
                </div>
                <h5 class="font-weight-bolder mb-0 text-azul-tamep">Parámetros de Operación e IA</h5>
              </div>
              
              <div class="row g-3 mb-4 p-3 border-radius-lg border-start border-4" 
                   :class="esGrupoIA ? 'bg-ia border-warning' : 'bg-gray-100 border-secondary opacity-7'">
                
                <div class="col-md-3">
                  <label class="label-custom">Perfil de Uso</label>
                  <select class="form-select-custom" v-model="formularioActivo.perfil_uso" :disabled="!esGrupoIA">
                    <option value="N/A" v-if="!esGrupoIA">No Aplica (Sin IA)</option>
                    <template v-else>
                      <option value="Oficina">Oficina (8h/5d)</option>
                      <option value="Intensivo">Intensivo (12h/6d)</option>
                      <option value="Critico">Crítico (24h/7d)</option>
                    </template>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="label-custom">Estado Físico</label>
                  <select class="form-select-custom" v-model="formularioActivo.estado_actual">
                    <option value="Bueno">Bueno</option>
                    <option value="Regular">Regular</option>
                    <option value="Malo">Malo</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="label-custom">Situación Actual</label>
                  <select class="form-select-custom" v-model="formularioActivo.situacion_activo">
                    <option value="Disponible">Disponible</option>
                    <option value="Asignado">Asignar Inmediatamente</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="label-custom">Uso Inicial (Horas)</label>
                  <argon-input type="number" v-model="formularioActivo.uso_inicial_estimado" :disabled="!esGrupoIA" />
                </div>
              </div>

              <div v-if="esGrupoIA" class="animate__animated animate__fadeIn">
                <div class="section-title mb-4 d-flex align-items-center mt-5">
                  <div class="step-number me-2">3</div>
                  <h5 class="font-weight-bolder mb-0 text-azul-tamep">Especificaciones Técnicas (Electrónicos)</h5>
                </div>
                <div class="row g-3 mb-4">
                  <div class="col-md-4"><label class="label-custom">CPU / Procesador</label><argon-input v-model="techSpecs.cpu" /></div>
                  <div class="col-md-4"><label class="label-custom">Memoria RAM</label><argon-input v-model="techSpecs.ram" /></div>
                  <div class="col-md-4"><label class="label-custom">MAC ADDR / Red</label><argon-input v-model="techSpecs.mac" /></div>
                </div>
              </div>

              <div class="row g-3 mb-4 mt-2">
                <div class="col-md-12">
                  <label class="label-custom">Descripción / Observaciones Generales</label>
                  <textarea class="form-control" v-model="formularioActivo.descripcion" rows="2"></textarea>
                </div>
              </div>

              <div class="section-title mb-4 d-flex align-items-center mt-5">
                <div class="step-number me-2">
                  <i class="fas fa-camera"></i>
                </div>
                <h5 class="font-weight-bolder mb-0 text-azul-tamep">Evidencia Fotográfica</h5>
              </div>
              <div class="row g-3 mb-5">
                <div class="col-md-4">
                  <label class="label-custom text-center">Imagen Principal</label>
                  <div class="upload-box" :class="{'has-image': previsualizaciones.imagen_activo}">
                    <img v-if="previsualizaciones.imagen_activo" :src="previsualizaciones.imagen_activo" class="img-preview" />
                    <div v-else class="upload-placeholder"><i class="fas fa-image fa-2x mb-2"></i><br><small>FRONTAL</small></div>
                    <input type="file" class="file-hidden" @change="handleFileUpload($event, 'imagen_activo')" accept="image/*" />
                    <button v-if="previsualizaciones.imagen_activo" type="button" @click="eliminarImagen('imagen_activo')" class="btn-remove-img"><i class="fas fa-times"></i></button>
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="label-custom text-center">Placa Técnica / Lateral</label>
                  <div class="upload-box" :class="{'has-image': previsualizaciones.imagen_lateral}">
                    <img v-if="previsualizaciones.imagen_lateral" :src="previsualizaciones.imagen_lateral" class="img-preview" />
                    <div v-else class="upload-placeholder"><i class="fas fa-barcode fa-2x mb-2"></i><br><small>CARACTERÍSTICAS</small></div>
                    <input type="file" class="file-hidden" @change="handleFileUpload($event, 'imagen_lateral')" accept="image/*" />
                    <button v-if="previsualizaciones.imagen_lateral" type="button" @click="eliminarImagen('imagen_lateral')" class="btn-remove-img"><i class="fas fa-times"></i></button>
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="label-custom text-center">Serial Number (S/N)</label>
                  <div class="upload-box" :class="{'has-image': previsualizaciones.imagen_sn}">
                    <img v-if="previsualizaciones.imagen_sn" :src="previsualizaciones.imagen_sn" class="img-preview" />
                    <div v-else class="upload-placeholder"><i class="fas fa-search-plus fa-2x mb-2"></i><br><small>ZOOM SERIAL</small></div>
                    <input type="file" class="file-hidden" @change="handleFileUpload($event, 'imagen_sn')" accept="image/*" />
                    <button v-if="previsualizaciones.imagen_sn" type="button" @click="eliminarImagen('imagen_sn')" class="btn-remove-img"><i class="fas fa-times"></i></button>
                  </div>
                </div>
              </div>

              <div class="section-title mb-4 d-flex align-items-center mt-5">
                <div class="step-number me-2"><i class="fas fa-dollar-sign"></i></div>
                <h5 class="font-weight-bolder mb-0 text-azul-tamep">Finanzas y Ubicación Base</h5>
              </div>
              <div class="row g-3">
                <div class="col-md-4"><label class="label-custom">Fecha de Adquisición</label><argon-input type="date" v-model="formularioActivo.fecha_adquisicion" /></div>
                <div class="col-md-4"><label class="label-custom">Costo (Bs.)</label><argon-input type="number" step="0.01" v-model="formularioActivo.costo" /></div>
                <div class="col-md-4">
                  <label class="label-custom">Ubicación de Origen</label>
                  <select class="form-select-custom" v-model="formularioActivo.ubicacion_base" required>
                    <option v-for="u in listas.ubicaciones" :key="u.id" :value="u.id">{{ u.nombre_sala }}</option>
                  </select>
                </div>
              </div>

              <div class="mt-5 text-end border-top pt-4">
                <TurnstileWidget v-model="turnstileToken" />
                <button type="submit" class="btn-tamep-primary shadow-lg w-100 py-3" :disabled="cargando">
                  <i class="fas" :class="formularioActivo.situacion_activo === 'Disponible' ? 'fa-save' : 'fa-arrow-right'"></i>
                  <span class="ms-2">
                    {{ cargando ? 'PROCESANDO...' : (formularioActivo.situacion_activo === 'Disponible' ? 'FINALIZAR Y GENERAR QR' : 'CONTINUAR A ASIGNACIÓN')}}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4 d-print-block">
          <div class="card shadow-lg border-0 bg-white position-sticky border-radius-2xl" style="top: 20px;">
            <div class="card-header bg-gray-100 py-2 d-print-none text-center">
              <h6 class="text-xs font-weight-bold mb-0 text-azul-tamep">VISTA PREVIA ETIQUETA</h6>
            </div>
            <div class="card-body p-4 text-center">
              <div class="ticket-preview mx-auto shadow-sm">
                <div class="ticket-header"><img :src="logo" class="ticket-logo">
                  <p class="ticket-title">EP TRANSPORTE AEREO MILITAR</p>
                </div>
                <div class="ticket-qr-container mt-2">
                  <img v-if="qrUrl" :src="qrUrl" class="qr-real">
                  <div v-else class="qr-placeholder"><i class="fas fa-qrcode fa-4x text-muted opacity-5"></i></div>
                  <div class="mt-2 text-start px-2">
                    <p class="ticket-code"><strong>COD:</strong> {{ formularioActivo.codigo_tamep || 'XXXX' }}</p>
                    <p class="ticket-code"><strong>H:</strong> {{ formularioActivo.codigo_tab || '----' }}</p>
                    
                  </div>
                </div>
              </div>
              
              <button v-if="qrUrl" type="button" @click="imprimirEtiquetaPDF" class="btn btn-dark w-100 mt-4 py-3"><i class="fas fa-print me-2"></i>IMPRIMIR ETIQUETA</button>
              
              <div v-if="procesoFinalizadoExitosa" class="mt-4 animate__animated animate__zoomIn">
                <div class="alert alert-success text-white border-0 shadow-lg mb-3">
                  <i class="fas fa-check-circle me-2"></i>¡Activo y Custodio Vinculados!
                </div>
                <button type="button" @click="prepararNuevoRegistro" class="btn btn-success w-100 py-3 font-weight-bold">
                  <i class="fas fa-plus me-2"></i>REGISTRAR OTRO ACTIVO
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>

    <div v-if="mostrarModalExtra" class="tamep-modal-overlay">
      <div class="tamep-modal-content p-4 animate__animated animate__fadeInDown">
        <div class="modal-header-tamep mb-4 text-white text-center p-3 rounded-3 shadow-sm">
          <h6 class="mb-0 text-white font-weight-bold"><i class="fas fa-user-check me-2"></i>VINCULAR CUSTODIO LEGAL</h6>
        </div>
        <label class="label-custom">Regional</label>
        <select v-model="formularioExtra.regional" @change="filtrarGerencias" class="form-select-custom mb-3">
          <option value="">Seleccione...</option>
          <option v-for="r in opciones.regionales" :key="r.id" :value="r.id">{{ r.nombre }}</option>
        </select>
        
        <label class="label-custom">Gerencia</label>
        <select v-model="formularioExtra.gerencia" @change="filtrarCargos" :disabled="!formularioExtra.regional" class="form-select-custom mb-3">
          <option value="">Seleccione...</option>
          <option v-for="g in opciones.gerencias" :key="g.id" :value="g.id">{{ g.nombre }}</option>
        </select>
        
        <label class="label-custom">Cargo</label>
        <select v-model="formularioExtra.cargo" @change="filtrarUsuarios" :disabled="!formularioExtra.gerencia" class="form-select-custom mb-3">
          <option value="">Seleccione...</option>
          <option v-for="c in opciones.cargos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select>
        
        <label class="label-custom">Funcionario Responsable</label>
        <select v-model="formularioExtra.usuario" :disabled="!formularioExtra.cargo" class="form-select-custom mb-4">
          <option value="">Seleccione...</option>
          <option v-for="u in opciones.usuarios" :key="u.id" :value="u.id">{{ u.nombre_completo }}</option>
        </select>
        
        <TurnstileWidget v-model="turnstileTokenExtra" />
        <button @click="finalizarProcesoCompleto" class="btn-tamep-primary w-100 py-3">CONFIRMAR VÍNCULO</button>
        <button @click="mostrarModalExtra = false" class="btn btn-link text-muted w-100 mt-2">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ESTILOS TAMEP CORPORATIVO */
.header-tamep { background: linear-gradient(135deg, #003366 0%, #001d3d 100%); }
.logo-container-left { background: white; padding: 5px 12px; border-radius: 8px; }
.logo-img { max-height: 35px; }
.text-azul-tamep { color: #003366; }

.label-custom { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #8392ab; margin-bottom: 5px; display: block; }
.form-select-custom { display: block; width: 100%; padding: 0.65rem; font-size: 0.85rem; border: 1px solid #d2d6da; border-radius: 10px; outline: none; transition: 0.3s; }
.form-select-custom:focus { border-color: #003366; box-shadow: 0 0 0 2px rgba(0,51,102,0.1); }
.form-select-custom:disabled { background-color: #e9ecef; cursor: not-allowed; }

.btn-tamep-primary { background: #003366; color: white; border: none; border-radius: 12px; font-weight: 700; text-transform: uppercase; transition: 0.3s; cursor: pointer; }
.btn-tamep-primary:hover:not(:disabled) { background: #001d3d; transform: translateY(-2px); }

.step-number { background: #003366; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: bold; }

/* ZONA IA */
.bg-ia { background: linear-gradient(90deg, #f0f7ff 0%, #ffffff 100%); }

/* ZONA DE CARGA DE IMÁGENES (PREVIEWS) */
.upload-box { position: relative; width: 100%; height: 150px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 15px; overflow: hidden; display: flex; align-items: center; justify-content: center; transition: 0.3s; cursor: pointer; }
.upload-box:hover { border-color: #003366; background: #f1f5f9; }
.upload-box.has-image { border-style: solid; border-color: #ffcc00; }
.img-preview { width: 100%; height: 100%; object-fit: cover; z-index: 5; }
.upload-placeholder { text-align: center; color: #94a3b8; }
.file-hidden { position: absolute; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 10; }
.btn-remove-img { position: absolute; top: 5px; right: 5px; z-index: 20; background: rgba(239, 68, 68, 0.9); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }

/* ETIQUETA TÉRMICA SIMULADA */
.ticket-preview { width: 50mm; margin: 0 auto; padding: 2mm; background: white; border: 1px solid #000; font-family: 'Helvetica', sans-serif; box-sizing: content-box; }
.ticket-logo { max-height: 14px; display: block; margin: 0 auto; }
.ticket-title { font-size: 7px; font-weight: 900; text-align: center; margin: 2px 0 4px 0; border-bottom: 1px solid black; padding-bottom: 2px; }
.qr-real { width: 22mm; height: 22mm; image-rendering: pixelated; margin: 0 auto; display: block; }
.ticket-code { font-size: 9px; margin-top: 2px; margin-bottom: 0; text-align: left; }

/* MODAL OVERLAY */
.tamep-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 29, 61, 0.85); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(5px); }
.tamep-modal-content { background: white; width: 95%; max-width: 450px; border-radius: 20px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
.modal-header-tamep { background: #003366; }
</style>