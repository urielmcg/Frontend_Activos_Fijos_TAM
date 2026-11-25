<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
import Breadcrumbs from "../Breadcrumbs.vue";
import { activateDarkMode, deactivateDarkMode } from "@/assets/js/dark-mode";
import api from "@/services/api";

const store = useStore();
const route = useRoute();
const router = useRouter();

const showMenu = ref(false);      // Control campana
const showUserMenu = ref(false);  // Control usuario
const notificaciones = ref([]);
const noLeidas = ref(0);
let polling = null;

const fetchNotificaciones = async () => {
  try {
    const { data } = await api.get("notificaciones/");
    // DRF pagination? handle both paginated and list
    const lista = Array.isArray(data) ? data : data.results || [];
    notificaciones.value = lista.slice(0, 10);
    noLeidas.value = lista.filter(n => !n.leida).length;
  } catch (e) {
    // silencioso
  }
};

const marcarLeida = async (n) => {
  try {
    await api.patch(`notificaciones/${n.id}/`, { leida: true });
    n.leida = true;
    noLeidas.value = Math.max(0, noLeidas.value - 1);
    if (n.url) router.push(n.url);
    showMenu.value = false;
  } catch (e) {
    console.error(e);
  }
};

const marcarTodasLeidas = async () => {
  try {
    await api.post("notificaciones/marcar_todas_leidas/");
    notificaciones.value.forEach((n) => { n.leida = true; });
    noLeidas.value = 0;
  } catch (e) {
    console.error(e);
  }
};

onMounted(() => {
  fetchNotificaciones();
  polling = setInterval(fetchNotificaciones, 30000);
});

onUnmounted(() => {
  if (polling) clearInterval(polling);
});

const usuario = computed(() => {
  const nombre = localStorage.getItem("first_name") || "Usuario";
  const apellido = localStorage.getItem("last_name") || "";
  const cargoStr = localStorage.getItem("cargo_nombre") || "Personal TAMEP";
  return {
    nombre_completo: `${nombre} ${apellido}`.trim(),
    cargo: cargoStr
  };
});

const isDarkMode = computed(() => store.state.darkMode);

const toggleTheme = () => {
  if (store.state.darkMode) {
    store.state.darkMode = false;
    store.commit("sidebarType", "bg-white");
    deactivateDarkMode();
  } else {
    store.state.darkMode = true;
    store.commit("sidebarType", "bg-default");
    activateDarkMode();
  }
};

const cerrarSesion = () => {
  localStorage.clear();
  router.push({ name: 'Signin' });
};

const currentRouteName = computed(() => route.name);
const currentDirectory = computed(() => {
  let dir = route.path.split("/")[1];
  return dir ? dir.charAt(0).toUpperCase() + dir.slice(1) : "Dashboard";
});

const minimizeSidebar = () => store.commit("sidebarMinimize");
</script>


<template>
  <nav class="navbar navbar-main navbar-expand-lg px-0 mx-4 shadow-none border-radius-xl" v-bind="$attrs"
    id="navbarBlur" data-scroll="true">
    <div class="px-3 py-1 container-fluid">
      
      <div class="d-flex align-items-center">
        <breadcrumbs :current-page="currentRouteName" :current-directory="currentDirectory" />
      </div>

      <div class="collapse navbar-collapse mt-sm-0 me-md-0 me-sm-4 justify-content-end" id="navbar">
        <ul class="navbar-nav justify-content-end align-items-center">
          
          <li class="nav-item dropdown d-flex align-items-center me-3">
            <a href="#" class="px-0 nav-link font-weight-bold text-white d-flex align-items-center" 
               @click.prevent="showUserMenu = !showUserMenu; showMenu = false">
              <div class="d-flex flex-column text-end me-3 d-sm-block d-none">
                <span class="text-sm font-weight-bold text-white mb-0 text-uppercase">
                  {{ usuario.nombre_completo }}
                </span>
                <p class="text-xs text-white opacity-8 mb-0 text-uppercase" style="line-height: 1;">
                  {{ usuario.cargo }}
                </p>
              </div>
              <div class="avatar avatar-sm bg-gradient-warning border-radius-lg shadow-sm">
                <i class="fas fa-user-tie text-white"></i>
              </div>
            </a>
            <ul class="px-2 py-3 dropdown-menu dropdown-menu-end me-sm-n4" :class="{ 'show': showUserMenu }">
              <li>
                <router-link class="dropdown-item border-radius-md" :to="{name: 'Profile'}">
                  <i class="fas fa-user me-2 text-dark"></i> Mi Perfil
                </router-link>
              </li>
              <li><hr class="horizontal dark"></li>
              <li>
                <a class="dropdown-item border-radius-md text-danger" href="javascript:;" @click="cerrarSesion">
                  <i class="fas fa-sign-out-alt me-2"></i> Cerrar Sesión
                </a>
              </li>
            </ul>
          </li>

          <li class="px-3 nav-item d-flex align-items-center">
            <a class="p-0 nav-link text-white cursor-pointer" @click="toggleTheme" style="font-size: 1.2rem;">
              <i :class="isDarkMode ? 'fas fa-sun text-warning' : 'fas fa-moon'"></i>
            </a>
          </li>

          <li class="nav-item d-xl-none ps-3 d-flex align-items-center">
            <a href="#" @click="minimizeSidebar" class="p-0 nav-link text-white">
              <div class="sidenav-toggler-inner">
                <i class="sidenav-toggler-line bg-white"></i>
                <i class="sidenav-toggler-line bg-white"></i>
                <i class="sidenav-toggler-line bg-white"></i>
              </div>
            </a>
          </li>

          <li class="nav-item dropdown d-flex align-items-center ps-2 position-relative">
            <a href="#" class="p-0 nav-link text-white position-relative" @click.prevent="showMenu = !showMenu; showUserMenu = false">
              <i class="cursor-pointer fa fa-bell"></i>
              <span v-if="noLeidas > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.6rem; padding: 0.3em 0.4em;">
                {{ noLeidas > 9 ? '9+' : noLeidas }}
              </span>
            </a>
            <ul class="px-2 py-3 dropdown-menu dropdown-menu-end me-sm-n4" :class="{ 'show': showMenu }" style="min-width: 320px; max-height: 400px; overflow-y: auto;">
              <li class="d-flex justify-content-between align-items-center px-3 mb-2">
                <h6 class="mb-0 text-sm">Notificaciones</h6>
                <a v-if="noLeidas > 0" href="javascript:;" class="text-xs text-primary" @click="marcarTodasLeidas">Marcar todas</a>
              </li>
              <li v-if="notificaciones.length === 0" class="text-center py-3">
                <p class="text-xs text-secondary mb-0">Sin notificaciones</p>
              </li>
              <li v-for="n in notificaciones" :key="n.id" class="mb-2">
                <a class="dropdown-item border-radius-md" href="javascript:;" @click="marcarLeida(n)" :style="{ opacity: n.leida ? '0.6' : '1', background: n.leida ? '' : '#f8f9fa' }">
                  <div class="py-1 d-flex">
                    <div class="my-auto avatar avatar-sm me-3" :class="n.tipo === 'registro' ? 'bg-gradient-warning' : n.tipo === 'solicitud' ? 'bg-gradient-info' : 'bg-gradient-success'">
                      <i :class="n.tipo === 'registro' ? 'fas fa-user-plus' : n.tipo === 'solicitud' ? 'fas fa-tools' : 'fas fa-check-circle'"></i>
                    </div>
                    <div class="d-flex flex-column justify-content-center" style="min-width: 0; flex: 1;">
                      <h6 class="mb-1 text-sm font-weight-normal text-wrap" style="white-space: normal;">{{ n.titulo }}</h6>
                      <p class="mb-0 text-xs text-secondary text-wrap" style="white-space: normal;">{{ n.mensaje }}</p>
                      <p class="mb-0 text-xs text-muted">{{ new Date(n.fecha_creacion).toLocaleString('es-BO') }}</p>
                    </div>
                    <span v-if="!n.leida" class="ms-2 my-auto bg-primary rounded-circle" style="width: 8px; height: 8px; display: inline-block;"></span>
                  </div>
                </a>
              </li>
            </ul>
          </li>

        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.navbar-main .text-white {
  color: #fff !important;
}

/* Dropdown Menu logic */
.dropdown-menu {
  display: none;
  position: absolute;
  z-index: 1100;
  transition: all 0.3s ease;
}

.dropdown-menu.show {
  display: block;
  /* Pequeño ajuste para que no aparezca tan pegado arriba */
  margin-top: 10px; 
}

/* Línea divisoria en el menú */
hr.horizontal {
  background-color: #e9ecef;
  height: 1px;
  margin: 0.5rem 0;
}

/* Ajuste para que la campana no se pegue al borde derecho */
.pe-2 {
  padding-right: 0.5rem !important;
}
</style>