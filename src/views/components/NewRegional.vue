<script setup>
import { reactive, ref, onMounted } from 'vue'; // onMounted para cargar las regionales al inicio
import ArgonInput from '@/components/ArgonInput.vue';
import ArgonButton from '@/components/ArgonButton.vue';
import axios from '@/axios'; // Asegúrate de que la ruta a tu axios.js sea correcta

// --- Variables reactivas para el formulario de Nueva Regional ---
const formularioRegional = reactive({
  nombre: '', // Campo para el nombre de la regional
  direccion: '' // Campo para la dirección de la regional
});

// --- Variable para mostrar mensajes al usuario ---
const mensajeRegional = ref('');

// --- Variable reactiva para almacenar la lista de regionales ---
const regionales = ref([]);

// --- Función para obtener todas las Regionales ---
const obtenerRegionales = async () => {
  try {
    const response = await axios.get('/api/regionales'); // Reemplaza con tu ruta API para obtener regionales
    regionales.value = response.data; // Asigna los datos recibidos a la variable reactiva
    console.log('Regionales obtenidas:', response.data);
  } catch (error) {
    console.error('Error al obtener las regionales:', error.response?.data || error.message);
    mensajeRegional.value = 'Error al cargar las regionales: ' + (error.response?.data?.message || error.message);
  }
};

// --- Función para crear una nueva Regional ---
const crearRegional = async () => {
  mensajeRegional.value = ''; // Limpiar mensajes previos
  try {
    const response = await axios.post('/api/regionales', formularioRegional); // Reemplaza con tu ruta API para crear regional
    
    console.log('Regional creada:', response.data);
    mensajeRegional.value = '¡Regional creada exitosamente!';
    
    // Limpiar el formulario
    formularioRegional.nombre = '';
    formularioRegional.direccion = '';

    // Volver a cargar la lista de regionales para que se muestre la nueva
    await obtenerRegionales();

  } catch (error) {
    console.error('Error al crear la regional:', error.response?.data || error.message);
    mensajeRegional.value = 'Error al crear la regional: ' + (error.response?.data?.message || 'Error desconocido.');
    
    if (error.response?.data?.errors) {
      for (const campo in error.response.data.errors) {
        mensajeRegional.value += ` ${campo}: ${error.response.data.errors[campo].join(', ')}`;
      }
    }
  }
};

// --- Cargar las regionales al montar el componente ---
onMounted(() => {
  obtenerRegionales();
});
</script>

<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-lg-8 mx-auto">
        <div class="card">
          <div class="card-header pb-0">
            <h6>Gestión de Regionales</h6>
            <p class="mb-0">Aquí puedes crear y ver las regionales de tu empresa.</p>
            <p v-if="mensajeRegional" 
               :class="{'text-success': mensajeRegional.includes('exitosamente'), 'text-danger': mensajeRegional.includes('Error')}">
              {{ mensajeRegional }}
            </p>
          </div>
          <div class="card-body">
            <h5 class="mb-3">Crear Nueva Regional</h5>
            <form @submit.prevent="crearRegional">
              <div class="mb-3">
                <label for="nombreRegional">Nombre de la Regional</label>
                <argon-input
                  id="nombreRegional"
                  type="text"
                  placeholder="Ej. Sede Central, Regional Norte"
                  v-model="formularioRegional.nombre"
                  required
                />
              </div>
              <div class="mb-3">
                <label for="direccionRegional">Dirección de la Regional</label>
                <argon-input
                  id="direccionRegional"
                  type="text"
                  placeholder="Ej. Calle Falsa 123, La Paz"
                  v-model="formularioRegional.direccion"
                  required
                />
              </div>
              <div class="text-end">
                <argon-button type="submit" color="success" variant="gradient">
                  Crear Regional
                </argon-button>
              </div>
            </form>

            <hr class="my-4">

            <h5 class="mb-3">Regionales Existentes</h5>
            <div class="table-responsive">
              <table class="table align-items-center mb-0">
                <thead>
                  <tr>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">ID</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Nombre</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Dirección</th>
                    </tr>
                </thead>
                <tbody>
                  <tr v-if="regionales.length === 0">
                    <td colspan="3" class="text-center">No hay regionales registradas.</td>
                  </tr>
                  <tr v-for="regional in regionales" :key="regional.id">
                    <td>
                      <div class="d-flex px-2 py-1">
                        <div class="d-flex flex-column justify-content-center">
                          <h6 class="mb-0 text-sm">{{ regional.id }}</h6>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p class="text-xs font-weight-bold mb-0">{{ regional.nombre }}</p>
                    </td>
                    <td>
                      <p class="text-xs font-weight-bold mb-0">{{ regional.direccion }}</p>
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
/* Puedes añadir estilos específicos si necesitas ajustar algo visualmente */
label {
  font-size: 0.875rem; /* Ajuste para que se vea bien con el estilo de Argon */
  font-weight: 600;
  color: #344767;
  margin-bottom: 0.5rem;
  display: block; /* Para que la etiqueta esté en su propia línea */
}
</style>