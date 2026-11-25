<script setup>
/* eslint-disable */
import { reactive, ref, onMounted } from 'vue';
import axios from '@/axios';
import ArgonInput from '@/components/ArgonInput.vue';
import logo from "@/assets/img/fondotam-blanco.png";
import Swal from "sweetalert2";

// --- ESTADO MAESTRO ---
const activoEncontrado = ref(null);
const codigoBusqueda = ref('');
const cargando = ref(false);
const procesoExitoso = ref(false);

const formularioBaja = reactive({
  activo: '',
  num_baja: '',
  regional: '',
  gerencia: '',
  cargo: '',
  solicitante: '', // Este es el usuario_id final
  motivosSeleccionados: [],
  motivo: '',
  descripcion_tecnica: '',
  disposicion_final: 'Almacén de Bajas',
  documento: null
});
const opcionesMotivos = [
  { id: 'Obsolescencia', label: 'Obsolescencia Tecnológica' },
  { id: 'Daño', label: 'Daño Irreparable / Siniestro' },
  { id: 'Perdida', label: 'Pérdida o Robo' },
];
const listas = reactive({
  regionales: [],
  gerencias: [],
  cargos: [],
  usuarios: []
});

const listaPersonalMaster = ref([]);

// --- CARGA INICIAL ---
onMounted(async () => {
  try {
    cargando.value = true;
    // Obtenemos los datos maestros de la estructura organizacional
    const [resParams, resPers] = await Promise.all([
      axios.get('operacion-baja/datos_formulario/'),
      axios.get('designaciones/estructura_completa/')
    ]);

    listas.regionales = resParams.data.regionales;
    listaPersonalMaster.value = resPers.data; // Aquí viene toda la jerarquía de User
  } catch (e) {
    console.error("Error de carga inicial", e);
    Swal.fire("Error", "No se pudo cargar la estructura de personal.", "error");
  } finally { cargando.value = false; }
});

// --- LÓGICA DE FILTRADO JERÁRQUICO (RESTAURADA) ---
const filtrarGerencias = () => {
  const filtrados = listaPersonalMaster.value.filter(p => p.regional_id === formularioBaja.regional);
  // Eliminamos duplicados de gerencias
  listas.gerencias = [...new Map(filtrados.map(item => [item.gerencia_id, { id: item.gerencia_id, nombre: item.gerencia_nombre }])).values()];

  // Reset de hijos
  formularioBaja.gerencia = '';
  formularioBaja.cargo = '';
  formularioBaja.solicitante = '';
  listas.cargos = [];
  listas.usuarios = [];
};

const filtrarCargos = () => {
  const filtrados = listaPersonalMaster.value.filter(p => p.gerencia_id === formularioBaja.gerencia);
  // Eliminamos duplicados de cargos
  listas.cargos = [...new Map(filtrados.map(item => [item.cargo_id, { id: item.cargo_id, nombre: item.cargo_nombre }])).values()];

  // Reset de hijos
  formularioBaja.cargo = '';
  formularioBaja.solicitante = '';
  listas.usuarios = [];
};

const filtrarUsuarios = () => {
  // Filtramos los usuarios que pertenecen al cargo seleccionado
  listas.usuarios = listaPersonalMaster.value.filter(p => p.cargo_id === formularioBaja.cargo);
  formularioBaja.solicitante = '';
};

// --- BÚSQUEDA DE ACTIVO ---
const buscarActivoExacto = async () => {
  if (!codigoBusqueda.value) return;
  cargando.value = true;
  activoEncontrado.value = null;
  try {
    const query = codigoBusqueda.value.trim();
    const { data } = await axios.get(`activos/?search=${query}`);
    if (data && data.length > 0) {
      const activo = data[0];
      if (activo.situacion_activo === 'Baja') {
        Swal.fire("Activo Inhabilitado", "Este bien ya figura como Desincorporado.", "warning");
      } else {
        activoEncontrado.value = activo;
        formularioBaja.activo = activo.id;
        Swal.fire({ icon: 'success', title: 'Activo Localizado', timer: 1000, showConfirmButton: false });
      }
    } else {
      Swal.fire("No encontrado", "Código no registrado.", "error");
    }
  } catch (e) { console.error(e); }
  finally { cargando.value = false; }
};

const handleFileUpload = (e) => { formularioBaja.documento = e.target.files[0]; };

// --- PROCESAMIENTO ---
const procesarBajaDefinitiva = async () => {
  if (!formularioBaja.num_baja) {
    return Swal.fire("Acta Requerida", "Debe transcribir el número del acta física.", "warning");
  }
  if (formularioBaja.motivosSeleccionados.length === 0) {
    return Swal.fire("Atención", "Seleccione al menos un motivo.", "warning");
  }
  if (!formularioBaja.solicitante) {
    return Swal.fire("Falta Responsable", "Debe seleccionar el funcionario que autoriza la baja.", "warning");
  }
  if (!formularioBaja.documento) {
    return Swal.fire({
      title: "Falta Documento",
      text: "La norma exige adjuntar el Informe Técnico o Denuncia en formato PDF para proceder con la baja patrimonial.",
      icon: "error",
      confirmButtonColor: "#ea0606"
    });
  }
  formularioBaja.motivo = formularioBaja.motivosSeleccionados.join(', ');
  const confirm = await Swal.fire({
    title: '¿Confirmar Baja Definitiva?',
    text: `Se desincorporará el activo ${activoEncontrado.value.codigo_tamep}. Esta acción es irreversible.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'SÍ, EJECUTAR BAJA',
    confirmButtonColor: '#ea0606',
    cancelButtonText: 'CANCELAR'
  });

  if (!confirm.isConfirmed) return;

  cargando.value = true;
  const fd = new FormData();
  fd.append('activo', formularioBaja.activo);
  fd.append('num_baja', formularioBaja.num_baja.toUpperCase());
  fd.append('solicitante', formularioBaja.solicitante);
  fd.append('motivo', formularioBaja.motivo);
  fd.append('descripcion_tecnica', formularioBaja.descripcion_tecnica);
  fd.append('disposicion_final', formularioBaja.disposicion_final);
  if (formularioBaja.documento) fd.append('documento_respaldo', formularioBaja.documento);

  try {
    const response = await axios.post('operacion-baja/', fd);
    procesoExitoso.value = true;
    await Swal.fire("Éxito", "Baja patrimonial procesada.", "success");
    imprimirActaBaja(response.data);
    resetFormulario = () => {
      activoEncontrado.value = null;
      codigoBusqueda.value = '';
      procesoExitoso.value = false;
      Object.assign(formularioBaja, {
        activo: '',
        num_baja: '',
        regional: '',
        gerencia: '',
        cargo: '',
        solicitante: '',
        motivo: '',
        descripcion_tecnica: '',
        disposicion_final: 'Almacén de Bajas',
        documento: null
      });

      // 3. Limpiamos las listas dependientes para que los selects se vean vacíos
      listas.gerencias = [];
      listas.cargos = [];
      listas.usuarios = [];

      // Opcional: Si usas un input file con ref, podrías resetearlo aquí también
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
    };

  } catch (error) {
    Swal.fire("Error", "No se pudo procesar la baja.", "error");
  } finally { cargando.value = false; }
};

const imprimirActaBaja = (dataServer) => {
  const iframe = document.getElementById('impresion-reporte');
  if (!iframe) return;
  const doc = iframe.contentWindow.document;

  const contenido = `
    <html>
      <head>
        <title>Acta de Baja TAMEP</title>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 40px; }
          .header { border-bottom: 3px solid #ea0606; padding-bottom: 10px; margin-bottom: 20px; }
          .title { color: #ea0606; font-size: 16pt; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          td { border: 1px solid #aaa; padding: 10px; }
          .label { background: #f2f2f2; font-weight: bold; width: 30%; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Acta de Baja de Activo Fijo</div>
          <div>No. Acta: ${dataServer.num_baja}</div>
        </div>
        <table>
          <tr><td class="label">Equipo:</td><td>${activoEncontrado.value.nombre_especifico}</td></tr>
          <tr><td class="label">Código TAMEP:</td><td>${activoEncontrado.value.codigo_tamep}</td></tr>
          <tr><td class="label">Motivo:</td><td>${formularioBaja.motivo}</td></tr>
          <tr><td class="label">Justificación:</td><td>${formularioBaja.descripcion_tecnica}</td></tr>
        </table>
      </body>
    </html>
  `;
  doc.open(); doc.write(contenido); doc.close();
  setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); }, 500);
};


</script>

<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-lg-8">
        <div class="card border-0 shadow-sm mb-4">
          <div class="header-tamep d-flex align-items-center px-4 py-3 text-white">
            <div class="logo-container-left me-3"><img :src="logo" class="logo-img"></div>
            <div>
              <h6 class="mb-0 text-white text-uppercase font-weight-bolder">Baja Patrimonial</h6>
              <small class="opacity-7">Desincorporación Institucional</small>
            </div>
          </div>

          <div class="card-body p-4">
            <div class="section-title mb-4 d-flex align-items-center">
              <div class="step-number me-2">1</div>
              <h5 class="font-weight-bolder mb-0 text-azul-tamep">Identificación del Activo</h5>
            </div>
            <div class="row g-3 mb-4">
              <div class="col-md-9">
                <input v-model="codigoBusqueda" class="form-control form-control-lg border-2"
                  placeholder="Código TAMEP o TAB..." @keyup.enter="buscarActivoExacto">
              </div>
              <div class="col-md-3">
                <button @click="buscarActivoExacto" class="btn btn-dark w-100 py-3">BUSCAR</button>
              </div>
            </div>

            <div v-if="activoEncontrado" class="animate__animated animate__fadeIn">
              <div class="info-card-tamep p-3 rounded mb-4">
                <h6 class="mb-1 text-dark">{{ activoEncontrado.nombre_especifico }}</h6>
                <p class="text-xs mb-0">TAMEP: {{ activoEncontrado.codigo_tamep }} | Serie: {{ activoEncontrado.serie }}
                </p>
              </div>

              <div class="section-title mb-4 d-flex align-items-center">
                <div class="step-number me-2">2</div>
                <h5 class="font-weight-bolder mb-0 text-azul-tamep">Datos de la Baja y Autorización</h5>
              </div>

              <div class="row g-3">
                <div class="col-md-12">
                  <label class="label-custom text-danger">Nro. de Acta de Baja (Manual)</label>
                  <input v-model="formularioBaja.num_baja" class="form-control border-2 font-weight-bold"
                    placeholder="Ej: BAJA-2026-001" style="text-transform: uppercase;">
                </div>

                <div class="col-md-6">
                  <label class="label-custom">Regional</label>
                  <select v-model="formularioBaja.regional" @change="filtrarGerencias" class="form-select-custom">
                    <option value="">Seleccione...</option>
                    <option v-for="r in listas.regionales" :key="r.id" :value="r.id">{{ r.nombre }}</option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="label-custom">Gerencia</label>
                  <select v-model="formularioBaja.gerencia" @change="filtrarCargos" :disabled="!formularioBaja.regional"
                    class="form-select-custom">
                    <option value="">Seleccione...</option>
                    <option v-for="g in listas.gerencias" :key="g.id" :value="g.id">{{ g.nombre }}</option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="label-custom">Cargo</label>
                  <select v-model="formularioBaja.cargo" @change="filtrarUsuarios" :disabled="!formularioBaja.gerencia"
                    class="form-select-custom">
                    <option value="">Seleccione...</option>
                    <option v-for="c in listas.cargos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="label-custom">Funcionario Solicitante</label>
                  <select v-model="formularioBaja.solicitante" :disabled="!formularioBaja.cargo"
                    class="form-select-custom border-primary">
                    <option value="">Seleccione...</option>
                    <option v-for="u in listas.usuarios" :key="u.id" :value="u.id">{{ u.nombre_completo }}</option>
                  </select>
                </div>

                <div class="col-md-12 mb-3">
                  <label class="label-custom text-dark">Motivos de Desincorporación (Seleccione uno o más)</label>
                  <div class="d-flex flex-wrap gap-3 p-3 bg-light border-radius-lg border">
                    <div v-for="opt in opcionesMotivos" :key="opt.id" class="form-check">
                      <input class="form-check-input" type="checkbox" :id="opt.id" :value="opt.id"
                        v-model="formularioBaja.motivosSeleccionados">
                      <label class="form-check-label text-xs fw-bold cursor-pointer" :for="opt.id">
                        {{ opt.label }}
                      </label>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="label-custom">Disposición Final</label>
                  <select v-model="formularioBaja.disposicion_final" class="form-select-custom">
                    <option value="Almacén de Bajas">Almacén</option>
                    <option value="Chatarrización">Baja</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="label-custom">Descripción Técnica del Estado</label>
                  <textarea v-model="formularioBaja.descripcion_tecnica" class="form-control border-2"
                    rows="3"></textarea>
                </div>
                <div class="col-md-12">
                  <label class="label-custom">Informe PDF de Respaldo</label>
                  <input type="file" class="form-control" @change="handleFileUpload" accept=".pdf">
                </div>
              </div>

              <button @click="procesarBajaDefinitiva" class="btn-baja-danger w-100 mt-5" :disabled="cargando">
                <i class="fas fa-trash-alt me-2"></i> {{ cargando ? 'PROCESANDO...' : 'EJECUTAR BAJA TÉCNICA' }}
              </button>
            </div>
          </div>

        </div>
      </div>
      <div class="col-lg-4">
        <div class="card bg-gradient-dark p-4 shadow-lg border-0">
          <h6 class="text-white text-uppercase font-weight-bolder">Auditoria Log Baja</h6>
          <hr class="horizontal light">
          <div class="d-flex mb-3">
            <div class="icon-circle-step me-3"><i class="fas fa-file-invoice text-success"></i></div>
            <div class="text-white text-xs">Validación de Activos Fijos vinculada a la base de datos central de TAMEP.
            </div>
          </div>
          <div class="d-flex mb-3">
            <div class="icon-circle-step me-3"><i class="fas fa-user-shield text-info"></i></div>
            <div class="text-white text-xs">Cierre automático de la custodia legal del funcionario asignado.</div>
          </div>
          <div class="d-flex">
            <div class="icon-circle-step me-3"><i class="fas fa-balance-scale text-warning"></i></div>
            <div class="text-white text-xs">Cumplimiento estricto de las normas básicas de administración de bienes.
            </div>
          </div>
        </div>
      </div>
    </div>
    <iframe id="impresion-reporte" style="display:none;"></iframe>
  </div>
</template>

<style scoped>
/* Estilos mantenidos */
.header-tamep {
  background: linear-gradient(135deg, #003366 0%, #001d3d 100%);
  border-radius: 12px 12px 0 0;
}

.label-custom {
  font-size: 0.7rem;
  font-weight: 800;
  color: #8392ab;
  text-transform: uppercase;
  display: block;
  margin-bottom: 5px;
}

.form-select-custom {
  width: 100%;
  padding: 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid #d2d6da;
}

.btn-baja-danger {
  background: #ea0606;
  color: white;
  border: none;
  padding: 15px;
  border-radius: 10px;
  font-weight: bold;
  width: 100%;
  cursor: pointer;
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
  font-weight: bold;
}

.header-tamep {
  background: linear-gradient(135deg, #003366 0%, #001d3d 100%);
  border-radius: 12px 12px 0 0;
}

.logo-container-left {
  background: white;
  padding: 6px 12px;
  border-radius: 8px;
}

.logo-img {
  max-height: 35px;
}

.label-custom {
  font-size: 0.7rem;
  font-weight: 800;
  color: #8392ab;
  text-transform: uppercase;
  margin-bottom: 5px;
  display: block;
}

.form-select-custom {
  width: 100%;
  padding: 0.6rem;
  border-radius: 0.5rem;
  border: 2px solid #d2d6da;
  font-size: 0.875rem;
}

.info-card-tamep {
  background: #f0f5fa;
  border-left: 5px solid #003366;
}

.img-preview-baja {
  height: 60px;
  width: 60px;
  object-fit: cover;
  border-radius: 8px;
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
  font-weight: bold;
}

.btn-baja-danger {
  background: #ea0606;
  color: white;
  border: none;
  padding: 15px;
  border-radius: 10px;
  font-weight: bold;
  text-transform: uppercase;
  transition: 0.3s;
}

.btn-baja-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 7px 14px rgba(234, 6, 6, 0.4);
}
</style>