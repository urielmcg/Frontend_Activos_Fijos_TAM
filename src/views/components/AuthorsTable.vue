<template>
  <div class="card">
    <div class="card-header pb-0 d-flex justify-content-between align-items-center">
      <h6>Asignación de Activos</h6>
      <button class="btn bg-gradient-primary btn-sm ms-auto" @click="openAssignModal">
        Asignar Nuevo Activo
      </button>
    </div>
    <div class="card-body px-0 pt-0 pb-2">
      <div class="table-responsive p-0">
        <table class="table align-items-center mb-0">
          <thead>
            <tr>
              <th
                class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7"
              >
                Activo
              </th>
              <th
                class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2"
              >
                Identificador
              </th>
              <th
                class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center"
              >
                Usuario Asignado
              </th>
              <th
                class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7"
              >
                Estado
              </th>
              <th
                class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7"
              >
                Fecha de Asignación
              </th>
              <th class="text-secondary opacity-7">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="assignment in assetAssignments" :key="assignment.id">
              <td>
                <div class="d-flex px-2 py-1">
                  <div class="d-flex flex-column justify-content-center">
                    <h6 class="mb-0 text-sm">{{ assignment.asset_name }}</h6>
                    <p class="text-xs text-secondary mb-0">{{ assignment.asset_type }}</p>
                  </div>
                </div>
              </td>
              <td>
                <p class="text-xs font-weight-bold mb-0">{{ assignment.serial_number }}</p>
                <p class="text-xs text-secondary mb-0">{{ assignment.model }}</p>
              </td>
              <td class="align-middle text-center text-sm">
                <div v-if="assignment.assigned_user">
                  <h6 class="mb-0 text-sm">{{ assignment.assigned_user.name }}</h6>
                  <p class="text-xs text-secondary mb-0">{{ assignment.assigned_user.email }}</p>
                </div>
                <div v-else>
                  <span class="text-xs font-weight-bold text-info">Sin asignar</span>
                </div>
              </td>
              <td class="align-middle text-center text-sm">
                <span 
                  :class="['badge', { 
                    'bg-gradient-success': assignment.status === 'Asignado',
                    'bg-gradient-info': assignment.status === 'Disponible',
                    'bg-gradient-warning': assignment.status === 'En Mantenimiento',
                    'bg-gradient-danger': assignment.status === 'Dañado'
                  }]"
                >
                  {{ assignment.status }}
                </span>
              </td>
              <td class="align-middle text-center">
                <span class="text-secondary text-xs font-weight-bold">
                  {{ assignment.assigned_date || 'N/A' }}
                </span>
              </td>
              <td class="align-middle">
                <a
                  href="javascript:;"
                  class="text-primary font-weight-bold text-xs me-2"
                  data-toggle="tooltip"
                  data-original-title="Edit assignment"
                  @click="editAssignment(assignment)"
                >
                  Editar
                </a>
                <a
                  href="javascript:;"
                  class="text-danger font-weight-bold text-xs"
                  data-toggle="tooltip"
                  data-original-title="Remove assignment"
                  @click="unassignAsset(assignment.id)"
                >
                  Desasignar
                </a>
              </td>
            </tr>
            <tr v-if="assetAssignments.length === 0">
                <td colspan="6" class="text-center text-secondary text-sm py-4">
                    No hay activos asignados disponibles.
                </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div v-if="showModal" class="modal-overlay">
    <div class="modal-content">
      <h5>{{ isEditing ? 'Editar Asignación' : 'Asignar Nuevo Activo' }}</h5>
      <form @submit.prevent="saveAssignment">
        <div class="mb-3">
          <label for="assetSelect" class="form-label">Seleccionar Activo:</label>
          <select class="form-control" id="assetSelect" v-model="selectedAssignment.asset_id" required :disabled="isEditing">
            <option value="">-- Seleccionar --</option>
            <option v-for="asset in availableAssets" :key="asset.id" :value="asset.id">
              {{ asset.name }} ({{ asset.serial_number }})
            </option>
          </select>
        </div>
        <div class="mb-3">
          <label for="userSelect" class="form-label">Asignar a Usuario:</label>
          <select class="form-control" id="userSelect" v-model="selectedAssignment.user_id" required>
            <option value="">-- Seleccionar --</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.name }} ({{ user.email }})
            </option>
          </select>
        </div>
        <div class="mb-3">
          <label for="assignmentDate" class="form-label">Fecha de Asignación:</label>
          <input type="date" class="form-control" id="assignmentDate" v-model="selectedAssignment.assigned_date">
        </div>
        <button type="submit" class="btn bg-gradient-success me-2">Guardar</button>
        <button type="button" class="btn bg-gradient-secondary" @click="closeModal">Cancelar</button>
      </form>
      <div v-if="modalMessage" :class="['alert', modalMessageType === 'success' ? 'alert-success' : 'alert-danger', 'mt-3']">
        {{ modalMessage }}
      </div>
    </div>
  </div>

</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/axios'; // Asegúrate de que esta ruta sea correcta para tu instancia de Axios

// Variables reactivas para los datos de la tabla
const assetAssignments = ref([]);
const availableAssets = ref([]); // Lista de activos que no están asignados o que pueden ser re-asignados
const users = ref([]); // Lista de usuarios para asignar

// Variables para el modal
const showModal = ref(false);
const isEditing = ref(false); // Para saber si estamos editando o creando
const selectedAssignment = ref({ // Objeto para el formulario del modal
  id: null,
  asset_id: '',
  user_id: '',
  assigned_date: new Date().toISOString().slice(0, 10), // Fecha actual por defecto
});
const modalMessage = ref('');
const modalMessageType = ref('');

// --- Funciones para obtener datos ---

// Función para cargar todas las asignaciones de activos
const fetchAssetAssignments = async () => {
  try {
    const { data } = await axios.get('/api/asset-assignments'); // <-- CORRECCIÓN AQUÍ: Desestructuramos 'data' directamente
    assetAssignments.value = data.map(assignment => ({ // Usamos 'data' en lugar de 'response.data'
        ...assignment,
        // Añade un 'status' dummy si no viene del backend para la demostración
        status: assignment.status || (assignment.assigned_user ? 'Asignado' : 'Disponible'),
        // Formatea la fecha si es necesario
        assigned_date: assignment.assigned_date ? new Date(assignment.assigned_date).toLocaleDateString('es-ES') : null,
    }));
  } catch (error) {
    console.error('Error al cargar las asignaciones de activos:', error);
    // Podrías mostrar un mensaje de error al usuario
  }
};

// Función para obtener activos disponibles (los que se pueden asignar)
const fetchAvailableAssets = async () => {
  try {
    const { data } = await axios.get('/api/assets/available'); // <-- CORRECCIÓN AQUÍ: Desestructuramos 'data' directamente
    availableAssets.value = data; // Usamos 'data'
  } catch (error) {
    console.error('Error al cargar activos disponibles:', error);
  }
};

// Función para obtener la lista de usuarios
const fetchUsers = async () => {
  try {
    const { data } = await axios.get('/api/users'); // <-- CORRECCIÓN AQUÍ: Desestructuramos 'data' directamente
    users.value = data; // Usamos 'data'
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
  }
};

// --- Funciones del Modal ---

const openAssignModal = () => {
  isEditing.value = false;
  selectedAssignment.value = { 
    id: null,
    asset_id: '',
    user_id: '',
    assigned_date: new Date().toISOString().slice(0, 10),
  };
  modalMessage.value = '';
  modalMessageType.value = '';
  showModal.value = true;
};

const editAssignment = (assignment) => {
  isEditing.value = true;
  // Carga los datos de la asignación existente en el formulario
  selectedAssignment.value = {
    id: assignment.id,
    asset_id: assignment.asset_id,
    user_id: assignment.user_id,
    assigned_date: assignment.original_assigned_date || new Date(assignment.assigned_date).toISOString().slice(0, 10), // Usa la fecha original o formatea
  };
  modalMessage.value = '';
  modalMessageType.value = '';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveAssignment = async () => {
  modalMessage.value = '';
  try {
    // Si estamos editando, hacemos un PUT/PATCH
    if (isEditing.value) {
      // Simplemente ejecutamos la petición, no necesitamos la variable 'response'
      await axios.put(`/api/asset-assignments/${selectedAssignment.value.id}`, selectedAssignment.value); 
      modalMessage.value = 'Asignación actualizada exitosamente.';
      modalMessageType.value = 'success';
    } else {
      // Si estamos creando, hacemos un POST
      // Simplemente ejecutamos la petición, no necesitamos la variable 'response'
      await axios.post('/api/asset-assignments', selectedAssignment.value); 
      modalMessage.value = 'Activo asignado exitosamente.';
      modalMessageType.value = 'success';
    }
    
    await fetchAssetAssignments(); // Refresca la tabla después de guardar
    // Puedes cerrar el modal automáticamente o dejarlo abierto con el mensaje
    // setTimeout(() => { closeModal(); }, 2000); 

  } catch (error) {
    console.error('Error al guardar la asignación:', error.response?.data || error.message);
    modalMessage.value = error.response?.data?.message || 'Error al guardar la asignación.';
    modalMessageType.value = 'danger';
  }
};

const unassignAsset = async (assignmentId) => {
  if (confirm('¿Estás seguro de que quieres desasignar este activo?')) {
    try {
      // Simplemente ejecutamos la petición, no necesitamos la variable 'response'
      await axios.delete(`/api/asset-assignments/${assignmentId}`); 
      await fetchAssetAssignments(); // Refresca la tabla
      alert('Activo desasignado exitosamente.');
    } catch (error) {
      console.error('Error al desasignar el activo:', error);
      alert('Error al desasignar el activo.');
    }
  }
};

// Se ejecuta cuando el componente se monta
onMounted(() => {
  fetchAssetAssignments();
  fetchAvailableAssets(); // Carga activos disponibles al inicio
  fetchUsers(); // Carga la lista de usuarios al inicio
});
</script>

<style scoped>
/* Estilos para el modal (puedes ajustarlos a tu gusto o usar una librería de modales) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Asegúrate de que esté por encima de otros elementos */
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
}
</style>