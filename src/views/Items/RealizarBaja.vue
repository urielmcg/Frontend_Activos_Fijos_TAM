<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api.js';
import TurnstileWidget from '@/components/TurnstileWidget.vue';

const route = useRoute();
const router = useRouter();

const inicializando = ref(true);
const cargando = ref(false);
const activo = ref(null);
const turnstileToken = ref("");

const opciones = reactive({ 
  regionales: [],
  usuarios: [] 
});

const listaUsuariosFiltrados = ref([]);

const modalBaja = reactive({
  visible: false,
  form: {
    regional_id: '',
    usuario_id: '',
    motivo: '',
    archivo: null
  }
});

onMounted(async () => {
  try {
    // 1. Cargamos datos del activo y los datos necesarios para el formulario de baja
    const [resActivo, resForm] = await Promise.all([
      api.get(`/activos/${route.params.id}/`),
      api.get('/operacion-baja/datos_formulario/')
    ]);
    
    activo.value = resActivo.data;
    opciones.regionales = resForm.data.regionales;
    opciones.usuarios = resForm.data.usuarios;

    // Si el activo ya está asignado, intentamos pre-cargar su regional actual
    if (activo.value.ubicacion_actual_detalle) {
        modalBaja.form.regional_id = activo.value.ubicacion_actual_detalle.regional;
        filtrarUsuarios();
    }
  } catch (error) {
    console.error("Error al cargar datos:", error);
    alert("Error al conectar con el servidor institucional.");
  } finally {
    inicializando.value = false;
  }
});

const filtrarUsuarios = () => {
  // Filtramos los usuarios por la regional seleccionada
  // Nota: Asegúrate que tu UserSerializer devuelva el ID de regional
  listaUsuariosFiltrados.value = opciones.usuarios.filter(u => u.regional_id == modalBaja.form.regional_id);
};

const handleFile = (e) => {
  modalBaja.form.archivo = e.target.files[0];
};

const confirmarBaja = async () => {
  if (!turnstileToken.value) {
    return alert("Complete la verificación Turnstile.");
  }
  if (!modalBaja.form.motivo || !modalBaja.form.usuario_id || !modalBaja.form.regional_id) {
    return alert("Todos los campos marcados son obligatorios para el Acta de Baja.");
  }

  cargando.value = true;
  const fd = new FormData();
  
  // Sincronizado con BajaActivoViewSet.procesar_baja
  fd.append('regional_id', modalBaja.form.regional_id);
  fd.append('usuario_id', modalBaja.form.usuario_id);
  fd.append('motivo', modalBaja.form.motivo);
  fd.append('turnstile_token', turnstileToken.value);
  
  if (modalBaja.form.archivo) {
    fd.append('documento', modalBaja.form.archivo);
  }

  try {
    // Endpoint: /api/operacion-baja/{id}/procesar_baja/
    await api.post(`/operacion-baja/${activo.value.id}/procesar_baja/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    turnstileToken.value = "";
    alert("Activo dado de baja y desvinculado correctamente.");
    router.push('/activos');
  } catch (error) {
    console.error(error);
    alert("Error: No se pudo procesar la baja técnica.");
  } finally {
    cargando.value = false;
  }
};
</script>

<template>
  <div class="container py-5">
    <div v-if="inicializando" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted fw-bold">Verificando Estado del Activo Fijo...</p>
    </div>

    <div v-else-if="activo" class="row justify-content-center">
      <div class="col-md-6">
        <div class="card border-0 shadow-sm institutional-card">
          <div class="card-header bg-navy text-white text-center py-3">
            <h5 class="mb-0">GESTIÓN DE ACTIVOS FIJOS</h5>
          </div>
          <div class="card-body p-5 text-center">
            <div class="icon-circle bg-light mb-4">
              <i class="fas fa-file-invoice text-navy fa-2x"></i>
            </div>
            <h4 class="fw-bold">Baja Definitiva</h4>
            <p class="text-secondary">Este proceso es irreversible y desvinculará el activo del inventario operativo.</p>
            
            <div class="info-box mb-4">
              <div class="row text-start">
                <div class="col-6">
                  <small class="text-uppercase text-muted">Código TAMEP</small>
                  <p class="fw-bold mb-0">{{ activo.codigo_tamep }}</p>
                </div>
                <div class="col-6 text-end">
                  <small class="text-uppercase text-muted">Situación Actual</small>
                  <p :class="['mb-0 fw-bold', activo.situacion_activo === 'Baja' ? 'text-danger' : 'text-success']">
                    {{ activo.situacion_activo }}
                  </p>
                </div>
              </div>
            </div>

            <button 
              @click="modalBaja.visible = true" 
              class="btn btn-navy btn-lg w-100 shadow-sm"
              :disabled="activo.situacion_activo === 'Baja'"
            >
              {{ activo.situacion_activo === 'Baja' ? 'ACTIVO YA DADO DE BAJA' : 'INICIAR PROCESO DE BAJA' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="modalBaja.visible" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header-inst p-3">
          <h6 class="mb-0 text-white"><i class="fas fa-gavel me-2"></i>ACTA DE BAJA TÉCNICA</h6>
          <button @click="modalBaja.visible = false" class="btn-close-custom">×</button>
        </div>

        <div class="p-4 bg-white">
          <div class="mb-3">
            <label class="inst-label">Regional Administrativa</label>
            <select v-model="modalBaja.form.regional_id" @change="filtrarUsuarios" class="form-select inst-input">
              <option value="">Seleccione Regional...</option>
              <option v-for="r in opciones.regionales" :key="r.id" :value="r.id">{{ r.nombre }}</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="inst-label">Responsable de Activos / Autorizador</label>
            <select v-model="modalBaja.form.usuario_id" :disabled="!modalBaja.form.regional_id" class="form-select inst-input">
              <option value="">Seleccione responsable...</option>
              <option v-for="u in listaUsuariosFiltrados" :key="u.id" :value="u.id">
                {{ u.nombre_completo }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label class="inst-label">Justificación Técnica del Retiro</label>
            <textarea v-model="modalBaja.form.motivo" class="form-control inst-input" rows="3" placeholder="Describa el estado físico y motivo de la baja..."></textarea>
          </div>

          <div class="mb-4">
            <label class="inst-label">Documento de Respaldo (Escaneado)</label>
            <input type="file" @change="handleFile" class="form-control inst-input" accept=".pdf">
            <small class="text-muted">Solo formato PDF firmado.</small>
          </div>

          <TurnstileWidget v-model="turnstileToken" />

          <div class="row g-2 mt-4">
            <div class="col-6">
              <button @click="modalBaja.visible = false" class="btn btn-light-inst w-100" :disabled="cargando">VOLVER</button>
            </div>
            <div class="col-6">
              <button @click="confirmarBaja" class="btn btn-navy w-100" :disabled="cargando">
                <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
                CONFIRMAR PROCESO
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Colores Institucionales */
.bg-navy { background-color: #1a2c4e !important; }
.text-navy { color: #1a2c4e !important; }
.btn-navy { background-color: #1a2c4e; color: white; font-weight: 600; border: none; }
.btn-navy:hover { background-color: #121f36; color: white; }

/* Estructura Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(26, 44, 78, 0.8); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.modal-container {
  background: white; width: 90%; max-width: 550px;
  border-radius: 4px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.3);
}
.modal-header-inst { 
    background: #1a2c4e; 
    display: flex; justify-content: space-between; align-items: center;
}

/* Tipografía y Elementos */
.inst-label { font-size: 11px; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
.inst-input { border-radius: 2px; border: 1px solid #e2e8f0; font-size: 14px; }
.inst-input:focus { border-color: #1a2c4e; box-shadow: 0 0 0 2px rgba(26,44,78,0.1); }

.info-box { background: #f8fafc; border-left: 4px solid #1a2c4e; padding: 15px; border-radius: 4px; }
.icon-circle { width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; background: #edf2f7; }

.btn-light-inst { background: #edf2f7; color: #4a5568; font-weight: 600; }
.btn-close-custom { background: transparent; border: none; color: white; font-size: 24px; cursor: pointer; }
</style>