<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { tieneAcceso } from "@/utils/roles";

const auditorias = ref([]);
const cargando = ref(true);
const error = ref("");

// Mismo gate que el menú lateral y el guard del router (roles.js)
const esAdmin = tieneAcceso("auditoria");

const fetchAuditoria = async () => {
  cargando.value = true;
  error.value = "";
  try {
    const { data } = await api.get("auditoria/");
    auditorias.value = Array.isArray(data) ? data : data.results || [];
  } catch (e) {
    if (e.response?.status === 403) {
      error.value = "No tiene permisos para ver la auditoría.";
    } else {
      error.value = e.response?.data?.detail || "Error al cargar auditoría.";
    }
  } finally {
    cargando.value = false;
  }
};

const formatoFecha = (f) => {
  if (!f) return "-";
  return new Date(f).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "medium" });
};

const badgeColor = (flag) => {
  if (flag == 1) return "bg-success";
  if (flag == 2) return "bg-warning";
  if (flag == 3) return "bg-danger";
  return "bg-secondary";
};

onMounted(fetchAuditoria);
</script>

<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12">
        <div class="card mb-4">
          <div class="card-header pb-0 d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-0">Auditoría del Sistema</h6>
              <p class="text-sm mb-0">Registro de acciones (solo lectura) — {{ auditorias.length }} registros</p>
            </div>
            <button class="btn btn-sm btn-outline-primary mb-0" @click="fetchAuditoria">
              <i class="fas fa-sync me-1"></i> Actualizar
            </button>
          </div>
          <div class="card-body px-0 pt-0 pb-2">
            <div v-if="!esAdmin" class="alert alert-warning mx-4 mt-3">
              <i class="fas fa-exclamation-triangle me-2"></i> Solo administradores (Informático y Principal) pueden ver esta sección.
            </div>
            <div v-else-if="cargando" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="text-sm text-secondary mt-2">Cargando auditoría...</p>
            </div>
            <div v-else-if="error" class="alert alert-danger mx-4 mt-3">{{ error }}</div>
            <div v-else class="table-responsive p-0">
              <table class="table align-items-center mb-0">
                <thead>
                  <tr>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Fecha</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Usuario</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Acción</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Objeto</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Tabla</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="auditorias.length === 0">
                    <td colspan="6" class="text-center py-4 text-sm text-secondary">Sin registros de auditoría</td>
                  </tr>
                  <tr v-for="a in auditorias" :key="a.id">
                    <td class="ps-4"><p class="text-xs mb-0">{{ formatoFecha(a.action_time) }}</p></td>
                    <td><p class="text-xs font-weight-bold mb-0">{{ a.usuario }} <span v-if="a.nombre_usuario" class="text-secondary">({{ a.nombre_usuario }})</span></p></td>
                    <td><span class="badge badge-sm" :class="badgeColor(a.action_flag)">{{ a.accion }}</span></td>
                    <td><p class="text-xs mb-0 text-wrap" style="max-width: 200px;">{{ a.objeto }}</p></td>
                    <td><p class="text-xs text-secondary mb-0">{{ a.tabla }}</p></td>
                    <td><p class="text-xs text-secondary mb-0 text-wrap" style="max-width: 280px; white-space: normal;">{{ a.change_message || '-' }}</p></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-secondary px-4 mt-3 mb-0">
              <i class="fas fa-info-circle me-1"></i> Esta vista es de solo lectura. Los registros provienen de <code>django_admin_log</code> y no pueden ser modificados.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
