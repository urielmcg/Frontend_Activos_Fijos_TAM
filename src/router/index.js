import { createRouter, createWebHistory } from "vue-router";
import { tieneAcceso } from "@/utils/roles.js";
import Dashboard from "../views/Dashboard.vue";
import Activos from "../views/components/AsingActivos.vue";
import Telemetria from "../views/Telemetria.vue";
import Profile from "../views/Profile.vue";
import Signup from "../views/Signup.vue";
import Signin from "../views/Signin.vue";
import NewRegional from "../views/components/NewRegional.vue";
import NewActivos from "../views/components/NewActivos.vue";
import NewUsers from "../views/components/NewUsers.vue";
import Personal from "../views/components/UsuariosRegistrados.vue";
import Historial from "../views/components/HistorialMantenimiento.vue";
import Gestion from "../views/components/ManagementActivos.vue";
import Transferencias from "../views/components/Transferencias.vue";
import Detalles from "../views/Items/ViewDetails.vue";
import RealizarBaja from "../views/Items/RealizarBaja.vue";
import Reportes from "../views/components/Reportes.vue";
import Monitoreo from "../views/components/Monitoreo.vue";
import GestionActivo from "../views/Items/GestionActivo.vue";
import ModuloPredictivo from "../views/components/ModuloPredictivo.vue";
import ConfiguracionDifusa from "../views/components/ConfiguracionDifusa.vue";
import SolicitudMantenimiento from "../views/components/Solicitud-mantenimiento.vue";
import Auditoria from "../views/components/Auditoria.vue";
const routes = [
  {
    path: "/",
    name: "/",
    redirect: "/dashboard-default",
  },
  {
    path: "/dashboard-default",
    name: "Inicio",
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: "/Gestion de Activos",
    name: "Gestion de Activos",
    component: Gestion,
    meta: { requiresAuth: true },
  },
  {
    path: "/Asignar Activos",
    name: "Activos",
    component: Activos,
    meta: { requiresAuth: true },
  },
  {
    path: "/telemetria",
    name: "Telemetría",
    component: Telemetria,
    meta: { requiresAuth: true },
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
    meta: { requiresAuth: true },
  },
  {
    path: "/signin",
    name: "Signin",
    component: Signin,
  },
  {
    path: "/signup",
    name: "Signup",
    component: Signup,
  },
  {
    path: "/new-regional",
    name: "Crear Regionales",
    component: NewRegional,
    meta: { requiresAuth: true },
  },
  {
    path: "/Nuevos Usuarios",
    name: "Crear Usuarios",
    component: NewUsers,
    meta: { requiresAuth: true },
  },
  {
    path: "/Nuevos Activos",
    name: "Crear Activos",
    component: NewActivos,
    meta: { requiresAuth: true },
  },
  {
    path: "/Transferencias",
    name: "Transferencias de Activos",
    component: Transferencias,
    meta: { requiresAuth: true },
  },
  {
    path: "/Personal",
    name: "Personal",
    component: Personal,
    meta: { requiresAuth: true },
  },
  {
    path: "/Historial",
    name: "Historial de Mantenimiento",
    component: Historial,
    meta: { requiresAuth: true },
  },
  {
    path: "/activo/detalle/:id",
    name: "Detalle Activo",
    component: Detalles,
    meta: { requiresAuth: true },
  },
  {
    path: "/Reportes",
    name: "Reportes y Estadísticas",
    component: Reportes,
    meta: { requiresAuth: true },
  },
  {
    path: "/Monitoreo",
    name: "Monitoreo",
    component: Monitoreo,
    meta: { requiresAuth: true },
  },
  {
    path: "/RealizarBaja",
    name: "Realizar Baja",
    component: RealizarBaja,
    meta: { requiresAuth: true },
  },
  {
    path: "/activo/gestion/:id",
    name: "Gestion Activo",
    component: GestionActivo,
    meta: { requiresAuth: true },
  },
  {
    path: "/modulo-predictivo",
    name: "Modulo Predictivo",
    component: ModuloPredictivo,
    meta: { requiresAuth: true },
  },
  {
    path: "/Configuracion-difusa",
    name: "Logica Difusa",
    component: ConfiguracionDifusa,
    meta: { requiresAuth: true },
  },
  {
    path: "/Solicitud-mantenimiento",
    name: "Solicitud Mantenimiento",
    component: SolicitudMantenimiento,
    meta: { requiresAuth: true },
  },
  {
    path: "/auditoria",
    name: "Auditoría",
    component: Auditoria,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  linkActiveClass: "active",
});
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem("access");

  if (to.meta.requiresAuth && !isAuthenticated) {
    next("/signin");
  } else if ((to.path === "/signin" || to.path === "/signup") && isAuthenticated) {
    next("/dashboard-default");
  } else if (isAuthenticated && to.meta.requiresAuth) {
    // Verificar permisos por rol
    const rutaNombre = decodeURIComponent(to.path.split('/')[1]);
    if (!tieneAcceso(rutaNombre)) {
      next("/dashboard-default");
    } else {
      next();
    }
  } else {
    next();
  }
});
export default router;
