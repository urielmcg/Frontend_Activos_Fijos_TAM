<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { activateDarkMode, deactivateDarkMode } from "@/assets/js/dark-mode";
import { tieneAcceso } from "@/utils/roles";

const store = useStore();
const router = useRouter();

const toggleConfigurator = () => store.commit("toggleConfigurator");
const setSidebarType = (type) => store.commit("sidebarType", type);
// Misma matriz de permisos que usa el menú lateral (roles.js -> MENU_PERMISOS)
const puedeVerAuditoria = computed(() => tieneAcceso("auditoria"));
const mostrarAuditoria = computed(() => store.state.mostrarAuditoria);
const toggleAuditoria = () => store.commit("toggleAuditoria");

const abrirAuditoria = () => {
  if (puedeVerAuditoria.value) {
    router.push("/auditoria");
  }
};

const darkMode = () => {
  if (store.state.darkMode) {
    store.state.darkMode = false;
    setSidebarType("bg-white"); // Cambia el sidebar a blanco en modo claro
    deactivateDarkMode();
  } else {
    store.state.darkMode = true;
    setSidebarType("bg-default"); // Cambia el sidebar a oscuro en modo noche
    activateDarkMode();
  }
};
</script>

<template>
  <div class="fixed-plugin">
    <a class="px-3 py-2 fixed-plugin-button text-dark position-fixed" @click="toggleConfigurator">
      <i class="py-2 fa fa-cog"></i>
    </a>
    <div class="shadow-lg card">
      <div class="pt-3 pb-0 bg-transparent card-header d-flex align-items-center justify-content-between">
        <div>
          <h5 class="mt-3 mb-0">Configuración</h5>
          <p class="text-sm">Ajustes del sistema TAMEP</p>
        </div>
        <div class="cursor-pointer" @click="toggleConfigurator">
          <button class="p-0 btn btn-link text-dark fixed-plugin-close-button">
            <i class="fa fa-times"></i>
          </button>
        </div>
      </div>
      
      <hr class="my-1 horizontal dark" />
      
      <div class="pt-0 card-body pt-sm-3">
        <div class="mt-3 d-flex align-items-center justify-content-between">
          <div>
            <h6 class="mb-0">Modo Oscuro</h6>
            <p class="mb-0 text-xs">Ideal para entornos de poca luz</p>
          </div>
          <div class="form-check form-switch ps-0 my-auto">
            <input
              class="form-check-input mt-1 ms-auto"
              type="checkbox"
              :checked="store.state.darkMode"
              @click="darkMode"
            />
          </div>
        </div>

        <hr class="my-3 horizontal dark" />
        <div class="d-flex align-items-center justify-content-between">
          <div
            :class="{ 'cursor-pointer': puedeVerAuditoria }"
            @click="abrirAuditoria"
          >
            <h6 class="mb-0">
              Auditoría
              <i
                v-if="!puedeVerAuditoria"
                class="fas fa-lock ms-1 text-secondary"
                style="font-size: 0.65rem"
              ></i>
            </h6>
            <p v-if="puedeVerAuditoria" class="mb-0 text-xs">Registro de acciones del sistema</p>
            <p v-else class="mb-0 text-xs text-secondary">
              No tiene permisos para ver la auditoría
            </p>
          </div>
          <div v-if="puedeVerAuditoria" class="form-check form-switch ps-0 my-auto">
            <input
              class="form-check-input mt-1 ms-auto"
              type="checkbox"
              :checked="mostrarAuditoria"
              @click="toggleAuditoria"
            />
          </div>
        </div>
        <p v-if="puedeVerAuditoria && mostrarAuditoria" class="text-xs text-success mt-2 mb-0">✓ Auditoría visible en el menú lateral</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fixed-plugin-close-button {
  position: absolute;
  top: 25px;
  right: 20px;
  z-index: 10;
  font-size: 1.2rem;
  color: #344767 !important;
}

.cursor-pointer {
  cursor: pointer;
}

:global(.dark-version) .fixed-plugin-close-button {
  color: #fff !important;
}

.fixed-plugin .card {
  height: 100% !important;
}
</style>