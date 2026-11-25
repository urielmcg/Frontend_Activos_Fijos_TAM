<script setup>
import { ref, onBeforeMount, onMounted, onBeforeUnmount, computed } from "vue";
import { useStore } from "vuex";
import api from '@/services/api.js';
import Swal from 'sweetalert2'; 
import logo from "../assets/img/Login/logofondooscuro.png";
// Importaciones de Argon Dashboard
import setNavPills from "@/assets/js/nav-pills.js";
import setTooltip from "@/assets/js/tooltip.js";
import ArgonInput from "@/components/ArgonInput.vue";
import ArgonButton from "@/components/ArgonButton.vue";

const body = document.getElementsByTagName("body")[0];
const store = useStore();

const user = ref(null);
const isEditing = ref(false);
const loading = ref(false);

const editableUser = ref({
  first_name: '',
  last_name: '',
  email: '',
  telefono: '',
  username: '',
  password: '',
});

// --- Validaciones ---
const isPasswordValid = computed(() => {
  if (!editableUser.value.password) return true;
  return editableUser.value.password.length >= 8;
});

const canSave = computed(() => {
  return isPasswordValid.value &&
    editableUser.value.first_name.trim() !== '' &&
    editableUser.value.username.trim() !== '';
});

// --- Acciones ---
const fetchUserProfile = async () => {
  try {
    const response = await api.get('me/');
    user.value = response.data;
    resetForm();
  } catch (error) {
    Swal.fire('Error', 'No se pudo conectar con el servidor de TAMEP.', 'error');
  }
};

const resetForm = () => {
  editableUser.value = {
    first_name: user.value.first_name,
    last_name: user.value.last_name,
    email: user.value.email,
    ci: user.value.ci || '',
    telefono: user.value.telefono || '',
    username: user.value.username,
    password: '',
  };
};

const saveProfile = async () => {
  if (!canSave.value) return;

  // CONFIRMACIÓN CON SWEETALERT2
  const result = await Swal.fire({
    title: '¿Confirmar cambios?',
    text: "Se actualizará su información en el sistema de Activos Fijos.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#2dce89', // Color success de Argon
    cancelButtonColor: '#f5365c', // Color danger de Argon
    confirmButtonText: 'Sí, guardar',
    cancelButtonText: 'Cancelar'
  });

  if (result.isConfirmed) {
    loading.value = true;
    const dataToSave = { ...editableUser.value };
    if (!dataToSave.password) delete dataToSave.password;

    try {
      // SOLUCIÓN AL 404: Enviamos a /api/me/ directamente
      const response = await api.patch('me/', dataToSave);
      user.value = response.data;

      // Sincronización Local
      localStorage.setItem("first_name", response.data.first_name);
      localStorage.setItem("last_name", response.data.last_name);
      localStorage.setItem("username", response.data.username);

      Swal.fire({
        title: '¡Actualizado!',
        text: 'Su perfil ha sido modificado con éxito.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      isEditing.value = false;
      editableUser.value.password = '';
    } catch (error) {
      Swal.fire('Error', 'No se pudieron guardar los cambios. Verifique que el usuario no exista.', 'error');
    } finally {
      loading.value = false;
    }
  }
};

const toggleEditMode = () => {
  isEditing.value = !isEditing.value;
  if (!isEditing.value && user.value) resetForm();
};


onMounted(() => {
  store.state.isAbsolute = true;
  setNavPills();
  setTooltip();
  fetchUserProfile();
});

onBeforeMount(() => {
  store.state.imageLayout = "profile-overview";
  store.state.showNavbar = false;
  store.state.showFooter = true;
  store.state.hideConfigButton = true;
  body.classList.add("profile-overview");
});

onBeforeUnmount(() => {
  store.state.isAbsolute = false;
  store.state.imageLayout = "default";
  store.state.showNavbar = true;
  body.classList.remove("profile-overview");
});
</script>

<template>
  <main>
    <div class="container-fluid">
      <div class="page-header min-height-300 border-radius-xl mt-4"
        style="background-image: url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80');">
        <span class="mask bg-tamep opacity-6"></span>
      </div>

      <div class="card shadow-lg mx-4 mt-n6">
        <div class="card-body p-3">
          <div class="row gx-4">
            <div class="col-auto">
              <div class="avatar avatar-xl position-relative">
                <img :src="logo" class="shadow-sm w-100 border-radius-lg" />
              </div>
            </div>
            <div class="col-auto my-auto">
              <div class="h-100">
                <h5 class="mb-1">{{ user ? (user.first_name + ' ' + user.last_name) : 'Cargando...' }}</h5>
                <p class="mb-0 font-weight-bold text-sm">
                  {{ user?.cargo_nombre || 'Funcionario' }} | {{ user?.regional_nombre || 'TAMEP' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="py-4 container-fluid">
      <div class="row">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header pb-0 d-flex align-items-center">
              <p class="mb-0 font-weight-bold">Gestión de Perfil e Identidad</p>
              <argon-button color="success" size="sm" class="ms-auto" @click="toggleEditMode">
                {{ isEditing ? 'Cancelar' : 'Editar Información' }}
              </argon-button>
              <argon-button v-if="isEditing" color="dark" size="sm" class="ms-2" :disabled="!canSave || loading"
                @click="saveProfile">
                {{ loading ? 'Procesando...' : (!isPasswordValid ? 'Clave Corta' : 'Guardar Cambios') }}
              </argon-button>
            </div>

            <div class="card-body">
              <p class="text-uppercase text-xs font-weight-bolder opacity-7">Información Personal</p>
              <div class="row">
                <div class="col-md-6">
                  <label class="form-control-label text-xs">Nombres</label>
                  <argon-input v-model="editableUser.first_name" :disabled="!isEditing" />
                </div>
                <div class="col-md-6">
                  <label class="form-control-label text-xs">Apellidos</label>
                  <argon-input v-model="editableUser.last_name" :disabled="!isEditing" />
                </div>
                <div class="col-md-6">
                  <label class="form-control-label text-xs">Email</label>
                  <argon-input type="email" v-model="editableUser.email" :disabled="!isEditing" />
                </div>
                <div class="col-md-6">
                  <label class="form-control-label text-xs">Teléfono</label>
                  <argon-input v-model="editableUser.telefono" :disabled="!isEditing" />
                </div>

                <div class="col-md-8">
                  <label class="form-control-label text-xs">Cédula de Identidad</label>
                  <argon-input v-model="editableUser.ci" :disabled="!isEditing" placeholder="Número de carnet" />
                </div>
              </div>

              <hr class="horizontal dark" />
              <p class="text-uppercase text-xs font-weight-bolder opacity-7">Seguridad de Acceso</p>
              <div class="row">
                <div class="col-md-6">
                  <label class="form-control-label text-xs">Nombre de Usuario</label>
                  <argon-input v-model="editableUser.username" :disabled="!isEditing" />
                </div>
                <div class="col-md-6">
                  <label class="form-control-label text-xs">Nueva Contraseña (Opcional)</label>
                  <argon-input type="password" v-model="editableUser.password" :disabled="!isEditing"
                    placeholder="Mínimo 8 caracteres" />
                  <p v-if="editableUser.password && !isPasswordValid" class="text-danger text-xxs mt-1">
                    Mínimo 8 caracteres requeridos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <i class="ni ni-spaceship text-success text-5xl"></i>
              <h6 class="mt-3">Transporte Aéreo Militar</h6>
              <p class="text-xs px-3">
                Gestión de Activos Fijos y Mantenimiento. Unidad operativa asignada a
                <strong>{{ user?.regional_nombre || 'Sede Central' }}</strong>.
              </p>
              <hr class="horizontal dark" />
              <div class="text-start">
                <p class="text-xxs font-weight-bold mb-1">Estatus del Usuario:</p>
                <p class="text-xxs text-muted">
                  <i class="fa fa-circle text-success me-1"></i> Sesión protegida y encriptada vía JWT
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>