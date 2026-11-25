<script setup>
import { reactive, ref, onMounted } from 'vue';
import ArgonInput from '@/components/ArgonInput.vue';
import ArgonButton from '@/components/ArgonButton.vue';
import axios from '@/axios'; // Asegúrate de que la ruta a tu axios.js sea correcta

// --- Variables reactivas para el formulario de Nuevo Cargo ---
const formularioCargo = reactive({
  nombre: '', // Campo para el nombre del cargo (ej. "Técnico de Soporte", "Gerente de TI")
});

// --- Variable para mostrar mensajes al usuario ---
const mensajeCargo = ref('');

// --- Variable reactiva para almacenar la lista de cargos ---
const cargos = ref([]);

// --- Función para obtener todos los Cargos ---
const obtenerCargos = async () => {
  try {
    const response = await axios.get('/api/cargos'); // Reemplaza con tu ruta API para obtener cargos
    cargos.value = response.data;
    console.log('Cargos obtenidos:', response.data);
  } catch (error) {
    console.error('Error al obtener los cargos:', error.response?.data || error.message);
    mensajeCargo.value = 'Error al cargar los cargos: ' + (error.response?.data?.message || error.message);
  }
};

// --- Función para crear un nuevo Cargo ---
const crearCargo = async () => {
  mensajeCargo.value = ''; // Limpiar mensajes previos
  try {
    const response = await axios.post('/api/cargos', formularioCargo); // Reemplaza con tu ruta API para crear cargo
    
    console.log('Cargo creado:', response.data);
    mensajeCargo.value = '¡Cargo creado exitosamente!';
    
    // Limpiar el formulario
    formularioCargo.nombre = '';

    // Volver a cargar la lista de cargos para que se muestre el nuevo
    await obtenerCargos();

  } catch (error) {
    console.error('Error al crear el cargo:', error.response?.data || error.message);
    mensajeCargo.value = 'Error al crear el cargo: ' + (error.response?.data?.message || 'Error desconocido.');
    
    if (error.response?.data?.errors) {
      for (const campo in error.response.data.errors) {
        mensajeCargo.value += ` ${campo}: ${error.response.data.errors[campo].join(', ')}`;
      }
    }
  }
};

// --- Cargar los cargos al montar el componente ---
onMounted(() => {
  obtenerCargos();
});
</script>

<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-lg-8 mx-auto">
        <div class="card">
          <div class="card-header pb-0">
            <h6>Gestión de Cargos</h6>
            <p class="mb-0">Aquí puedes crear y ver los cargos de tu empresa.</p>
            <p v-if="mensajeCargo" 
               :class="{'text-success': mensajeCargo.includes('exitosamente'), 'text-danger': mensajeCargo.includes('Error')}">
              {{ mensajeCargo }}
            </p>
          </div>
          <div class="card-body">
            <h5 class="mb-3">Crear Nuevo Cargo</h5>
            <form @submit.prevent="crearCargo">
              <div class="mb-3">
                <label for="nombreCargo">Nombre del Cargo</label>
                <argon-input
                  id="nombreCargo"
                  type="text"
                  placeholder="Ej. Técnico, Administrador"
                  v-model="formularioCargo.nombre"
                  required
                />
              </div>
              <div class="text-end">
                <argon-button type="submit" color="success" variant="gradient">
                  Crear Cargo
                </argon-button>
              </div>
            </form>

            <hr class="my-4">

            <h5 class="mb-3">Cargos Existentes</h5>
            <div class="table-responsive">
              <table class="table align-items-center mb-0">
                <thead>
                  <tr>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">ID</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Nombre</th>
                    </tr>
                </thead>
                <tbody>
                  <tr v-if="cargos.length === 0">
                    <td colspan="2" class="text-center">No hay cargos registrados.</td>
                  </tr>
                  <tr v-for="cargo in cargos" :key="cargo.id">
                    <td>
                      <div class="d-flex px-2 py-1">
                        <div class="d-flex flex-column justify-content-center">
                          <h6 class="mb-0 text-sm">{{ cargo.id }}</h6>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p class="text-xs font-weight-bold mb-0">{{ cargo.nombre }}</p>
                    </td>
                    </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #344767;
  margin-bottom: 0.5rem;
  display: block;
}
</style>