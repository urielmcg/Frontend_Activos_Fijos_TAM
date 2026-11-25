<script setup>
import { reactive, ref, onMounted, watch } from 'vue';
import api from '@/services/api.js';
import logo from "@/assets/img/fondotam-blanco.png";
import Swal from 'sweetalert2';
import TurnstileWidget from "@/components/TurnstileWidget.vue";

const turnstileToken = ref("");

const transfer = reactive({
  tipo: 'TR', // TR: Transferencia, DE: Devolución
  activo_codigo_input: '',
  activo_id_db: null,
  datos_activo: null,

  // Emisor (Se llena solo al buscar el activo)
  emisor: { id: '', nombre: '', cargo: '', regional: '', gerencia: '' },

  // Receptor (Selección jerárquica - MANTENIDO)
  reg_receptor: '',
  ger_receptor: '',
  car_receptor: '',
  receptor_id: '',

  num_acta: '', // AHORA ES MANUAL (Se inicializa vacío)
  ubicacion_destino: '',
  motivo: '',
});

const listas = reactive({
  regionales: [], gerencias: [], cargos: [], usuarios: [], ubicaciones: []
});

// --- LÓGICA DE BÚSQUEDA (MANTENIDA) ---
const buscarDatosActivo = async () => {
  if (!transfer.activo_codigo_input) return;
  try {
    const res = await api.get(`transferencias/buscar-activo/?codigo=${transfer.activo_codigo_input}`);
    transfer.activo_id_db = res.data.activo_id;
    transfer.datos_activo = { descripcion: res.data.descripcion };
    transfer.emisor = res.data.emisor; 
    transfer.ubicacion_origen = res.data.ubicacion_actual_id;

    Swal.fire({ icon: 'success', title: 'Activo Localizado', text: res.data.descripcion, timer: 1500, showConfirmButton: false });
  } catch (error) {
    const msg = error.response?.data?.error || 'No se encontró el activo o no tiene custodio activo';
    Swal.fire('Atención', msg, 'warning');
    resetForm(false);
  }
};

// --- WATCHERS PARA CARGA JERÁRQUICA (MANTENIDOS Y PROTEGIDOS) ---
watch(() => transfer.reg_receptor, async (val) => {
  if (val) {
    const res = await api.get(`transferencias/gerencias/?regional=${val}`);
    listas.gerencias = res.data;
    transfer.ger_receptor = ''; 
  }
});

watch(() => transfer.ger_receptor, async (val) => {
  if (val) {
    const res = await api.get(`transferencias/cargos/?gerencia=${val}`);
    listas.cargos = res.data;
    transfer.car_receptor = '';
  }
});

watch(() => transfer.car_receptor, async (val) => {
  if (val) {
    const res = await api.get(`transferencias/usuarios/?cargo=${val}`);
    // Filtramos para que el emisor no aparezca como receptor
    listas.usuarios = res.data.filter(u => u.id !== transfer.emisor.id);
    
    if (listas.usuarios.length === 0 && res.data.length > 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin otros receptores',
        text: 'El emisor es el único funcionario con este cargo en esta unidad.',
      });
    }
    transfer.receptor_id = '';
  }
});

const enviarTransferencia = async () => {
  if (!turnstileToken.value) {
    return Swal.fire('Atención', 'Complete la verificación Turnstile.', 'warning');
  }
  // VALIDACIÓN DE ACTA MANUAL
  if (!transfer.num_acta) {
    return Swal.fire('Dato Requerido', 'Debe ingresar el número de acta física manualmente.', 'warning');
  }

  if (!transfer.receptor_id || !transfer.ubicacion_destino) {
    return Swal.fire('Incompleto', 'Faltan datos del receptor o ubicación', 'error');
  }

  try {
    const payload = {
      activo: transfer.activo_id_db,
      emisor: transfer.emisor.id,
      receptor: transfer.receptor_id,
      reg_receptor: transfer.reg_receptor,
      ger_receptor: transfer.ger_receptor,
      car_receptor: transfer.car_receptor,
      ubicacion_origen: transfer.ubicacion_origen,
      ubicacion_destino: transfer.ubicacion_destino,
      motivo: transfer.motivo,
      num_acta: transfer.num_acta,
      tipo: transfer.tipo,
      turnstile_token: turnstileToken.value
    };

    const res = await api.post('/transferencias/', payload);
    turnstileToken.value = "";
    const transferenciaId = res.data.id;

    const result = await Swal.fire({
      title: '¡Proceso Exitoso!',
      text: "¿Desea generar el acta de entrega-recepción?",
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: 'Descargar PDF'
    });

    if (result.isConfirmed) {
      try {
        // Descargar el PDF con el token (window.open no envía el JWT)
        const pdfRes = await api.get(`transferencias/${transferenciaId}/generar_pdf/`, { responseType: 'blob' });
        const blobUrl = URL.createObjectURL(pdfRes.data);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (pdfErr) {
        console.error('Error al generar PDF:', pdfErr);
        Swal.fire('Error', 'No se pudo generar el acta PDF.', 'error');
      }
    }
    resetForm(true);

  } catch (error) {
    console.error('Error transferencia:', error.response?.status, error.response?.data);
    if (error.response?.status === 403) {
      Swal.fire('Permiso Denegado', 'No tiene permisos para realizar transferencias. Solo administradores pueden realizar esta acción.', 'warning');
    } else {
      const data = error.response?.data;
      let msg = 'No se pudo procesar el movimiento.';
      if (data) {
        if (data.num_acta) msg = Array.isArray(data.num_acta) ? data.num_acta[0] : 'Número de acta ya registrado.';
        else if (data.detail) msg = Array.isArray(data.detail) ? data.detail[0] : data.detail;
        else if (Array.isArray(data)) msg = data[0];
        else if (typeof data === 'string' && data.length < 300) msg = data;
        else if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const val = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
            if (val) msg = `${firstKey}: ${val}`;
          }
        }
      }
      Swal.fire('Error', msg, 'error');
    }
  }
};

const resetForm = (full) => {
  if (full) transfer.activo_codigo_input = '';
  transfer.datos_activo = null;
  transfer.emisor = { id: '', nombre: '', cargo: '' };
  transfer.receptor_id = '';
  transfer.reg_receptor = '';
  transfer.ger_receptor = '';
  transfer.car_receptor = '';
  transfer.ubicacion_destino = '';
  transfer.num_acta = ''; // Limpiamos el acta manual
};

onMounted(async () => {
  const token = localStorage.getItem('access');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      const [resReg, resUbi] = await Promise.all([
        api.get('/transferencias/regionales/'),
        api.get('/transferencias/listar_ubicaciones/')
      ]);
      listas.regionales = resReg.data;
      listas.ubicaciones = resUbi.data;
    } catch (err) { console.error(err); }
  }
});
</script>

<template>
  <div class="container-fluid py-4">
    <div class="card shadow-lg border-0">
      <div class="header-tamep d-flex justify-content-between align-items-center px-4 py-3">
        <div class="d-flex align-items-center">
          <div class="logo-container-left me-3"><img :src="logo" class="logo-img"></div>
          <div class="border-start ps-3 border-white opacity-8">
            <h6 class="mb-0 text-white text-uppercase font-weight-bolder">Movimiento de Activos</h6>
            <small class="text-white opacity-7">Gestión de Custodia Legal</small>
          </div>
        </div>
        <div class="text-end text-white">
          <h5 class="mb-0">{{ transfer.num_acta || 'SIN ACTA' }}</h5>
          <span class="badge bg-white text-dark text-xxs">{{ transfer.tipo === 'TR' ? 'TRANSFERENCIA' : 'DEVOLUCIÓN' }}</span>
        </div>
      </div>

      <div class="card-body p-4">
        <div class="row mb-4">
          <div class="col-md-5">
            <label class="label-custom">Tipo de Operación</label>
            <div class="btn-group w-100 shadow-none">
              <button @click="transfer.tipo = 'TR'" :class="['btn btn-sm mb-0', transfer.tipo === 'TR' ? 'btn-azul-tamep' : 'btn-outline-secondary']">
                <i class="fas fa-exchange-alt me-2"></i>Transferencia
              </button>
              <button @click="transfer.tipo = 'DE'" :class="['btn btn-sm mb-0', transfer.tipo === 'DE' ? 'btn-danger' : 'btn-outline-secondary']">
                <i class="fas fa-undo-alt me-2"></i>Devolución
              </button>
            </div>
          </div>
        </div>

        <div class="section-title mb-3 d-flex align-items-center">
          <div class="step-number me-2">1</div>
          <h6 class="font-weight-bolder mb-0 text-azul-tamep">Identificación del Bien</h6>
        </div>

        <div class="row mb-4 bg-gray-100 p-3 border-radius-lg">
          <div class="col-md-4">
            <label class="label-custom">Código del Equipo</label>
            <div class="input-group">
              <input type="text" class="form-control" v-model="transfer.activo_codigo_input" @keyup.enter="buscarDatosActivo">
              <button @click="buscarDatosActivo" class="btn btn-azul-tamep mb-0"><i class="fas fa-search"></i></button>
            </div>
          </div>
          <div class="col-md-8">
            <label class="label-custom">Descripción Técnica</label>
            <div class="p-2 bg-white border border-radius-md text-sm">
              {{ transfer.datos_activo?.descripcion || 'Esperando selección...' }}
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-md-5 border-end">
            <div class="section-title mb-3 d-flex align-items-center">
              <div class="step-icon me-2"><i class="fas fa-arrow-up text-danger"></i></div>
              <h6 class="font-weight-bolder mb-0 text-dark">Emisor (Entrega)</h6>
            </div>
            <div class="card card-body border shadow-none bg-light p-3">
              <p class="font-weight-bold mb-1">{{ transfer.emisor.nombre || '---' }}</p>
              <p class="text-xs mb-0">{{ transfer.emisor.cargo || '---' }}</p>
            </div>
          </div>

          <div class="col-md-7 ps-md-4">
            <div class="section-title mb-3 d-flex align-items-center">
              <div class="step-icon me-2">
                  <i :class="transfer.tipo === 'TR' ? 'fas fa-arrow-down text-success' : 'fas fa-warehouse text-warning'"></i>
              </div>
              <h6 class="font-weight-bolder mb-0 text-dark">
                  {{ transfer.tipo === 'TR' ? 'Receptor (Nuevo Custodio)' : 'Responsable Recepción Almacén' }}
              </h6>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="label-custom">Regional</label>
                <select class="form-select-custom" v-model="transfer.reg_receptor">
                  <option value="">Seleccione...</option>
                  <option v-for="r in listas.regionales" :key="r.id" :value="r.id">{{ r.nombre }}</option>
                </select>
              </div>
              <div class="col-md-6 mb-3">
                <label class="label-custom">Gerencia</label>
                <select class="form-select-custom" v-model="transfer.ger_receptor" :disabled="!transfer.reg_receptor">
                  <option v-for="g in listas.gerencias" :key="g.id" :value="g.id">{{ g.nombre }}</option>
                </select>
              </div>
              <div class="col-md-6 mb-3">
                <label class="label-custom">Cargo</label>
                <select class="form-select-custom" v-model="transfer.car_receptor" :disabled="!transfer.ger_receptor">
                  <option v-for="c in listas.cargos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>
              </div>
              <div class="col-md-6 mb-3">
                <label class="label-custom">Funcionario</label>
                <select class="form-select-custom border-primary" v-model="transfer.receptor_id" :disabled="!transfer.car_receptor">
                  <option value="">Seleccione funcionario...</option>
                  <option v-for="u in listas.usuarios" :key="u.id" :value="u.id">{{ u.nombre_completo }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="row mt-4 pt-3 border-top bg-gray-100 border-radius-lg p-3">
          <div class="col-md-12 mb-3">
            <label class="label-custom text-primary">Número de Acta Física (Ingreso Manual)</label>
            <div class="input-group">
              <span class="input-group-text bg-white border-2"><i class="fas fa-file-signature"></i></span>
              <input v-model="transfer.num_acta" type="text" class="form-control border-2 ps-2 font-weight-bold" 
                placeholder="Ej: TR-2026-0001" style="text-transform: uppercase;">
            </div>
          </div>
          <div class="col-md-4">
            <label class="label-custom">Ubicación Destino</label>
            <select class="form-select-custom" v-model="transfer.ubicacion_destino">
              <option v-for="u in listas.ubicaciones" :key="u.id" :value="u.id">{{ u.nombre_sala }}</option>
            </select>
          </div>
          <div class="col-md-8">
            <label class="label-custom">Motivo / Justificación Jurídica</label>
            <textarea class="form-control" v-model="transfer.motivo" rows="2"></textarea>
          </div>
        </div>

        <div class="text-center mt-5">
          <TurnstileWidget v-model="turnstileToken" />
          <button @click="enviarTransferencia" class="btn-tamep-primary">
            <i class="fas fa-check-circle me-2"></i> PROCESAR MOVIMIENTO LEGAL
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos mantenidos del original */
.header-tamep { background: linear-gradient(135deg, #003366 0%, #001d3d 100%); border-radius: 12px 12px 0 0; }
.logo-container-left { background: white; padding: 5px 12px; border-radius: 8px; }
.logo-img { max-height: 35px; }
.text-azul-tamep { color: #003366; }
.btn-azul-tamep { background-color: #003366; color: white; }
.label-custom { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #8392ab; margin-bottom: 4px; display: block; }
.form-select-custom { display: block; width: 100%; padding: 0.5rem; font-size: 0.85rem; border: 1px solid #d2d6da; border-radius: 0.5rem; }
.step-number { background: #003366; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; }
.btn-tamep-primary { background: #003366; color: white; border: none; padding: 14px 50px; border-radius: 12px; font-weight: 700; text-transform: uppercase; transition: 0.3s; }
.btn-tamep-primary:hover { background: #004a94; transform: translateY(-3px); }
</style>