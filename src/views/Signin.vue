<script setup>
import { onBeforeUnmount, onBeforeMount, ref, reactive } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
// CORRECCIÓN: Importamos como 'api' para que coincida con el uso de abajo
import api from "@/services/api.js"; 
import ArgonInput from "@/components/ArgonInput.vue";
import ArgonSwitch from "@/components/ArgonSwitch.vue";
import ArgonButton from "@/components/ArgonButton.vue";

const body = document.getElementsByTagName("body")[0];
const store = useStore();
const router = useRouter();

// --- Estados ---
const mensajeLogin = ref("");

const formularioLogin = reactive({
  username: "",
  password: "",
  recordarme: false,
});

onBeforeMount(() => {
  store.state.hideConfigButton = true;
  store.state.showNavbar = false;
  store.state.showSidenav = false;
  store.state.showFooter = false;
  body.classList.remove("bg-gray-100");
  body.style.backgroundColor = "#f4f7fa";
});

onBeforeUnmount(() => {
  store.state.hideConfigButton = false;
  store.state.showNavbar = true;
  store.state.showSidenav = true;
  store.state.showFooter = true;
  body.classList.add("bg-gray-100");
});

const iniciarSesion = async () => {
  mensajeLogin.value = "";
  if (!formularioLogin.username || !formularioLogin.password) {
    mensajeLogin.value = "Error: Complete todos los campos.";
    return;
  }

  try {
    mensajeLogin.value = "Autenticando...";

    // Ahora 'api' sí existe porque lo definimos en el import de arriba
    const response = await api.post("login/", {
      username: formularioLogin.username,
      password: formularioLogin.password,
    });

    console.log("DATOS RECIBIDOS:", response.data); 

    if (response.data && response.data.access) {
        localStorage.setItem("access", response.data.access);
        localStorage.setItem("refresh", response.data.refresh);
        
        if (response.data.user) {
          localStorage.setItem("first_name", response.data.user.first_name);
          localStorage.setItem("last_name", response.data.user.last_name);
          localStorage.setItem("cargo_nombre", response.data.user.cargo_nombre);
          localStorage.setItem("rol", response.data.user.rol || "usuario");
          localStorage.setItem("regional_id", response.data.user.regional_id || "");
        }

        mensajeLogin.value = "Acceso concedido. Redirigiendo...";
        setTimeout(() => {
          router.push("/dashboard-default");
        }, 800);
    } else {
        mensajeLogin.value = "Error: El servidor no envió el token de acceso.";
    }

  } catch (error) {
    mensajeLogin.value = "Error: Credenciales incorrectas.";
    console.error("Error completo:", error.response?.data || error);
  }
};

const irAlRegistro = () => {
  router.push("/signup");
};
</script>

<template>
  <main class="mt-0 main-content">
    <section>
      <div class="page-header min-vh-100">
        <div class="container">
          <div class="row">
            <div class="mx-auto col-xl-4 col-lg-5 col-md-7 d-flex flex-column mx-lg-0">
              <div class="card card-plain">
                <div class="pb-0 card-header text-start bg-transparent">
                  <div class="mb-3 text-center d-lg-none">
                    <i class="fas fa-plane fa-3x text-azul-tamep"></i>
                  </div>

                  <h4 class="font-weight-bolder text-azul-tamep">Bienvenido a TAMEP</h4>
                  <p class="mb-0 text-sm">Gestión Técnica de Activos Fijos</p>

                  <div
                    v-if="mensajeLogin"
                    class="alert mt-3 py-2 text-white text-xs border-0 text-center shadow-sm"
                    :class="mensajeLogin.includes('Error') ? 'bg-danger' : 'bg-success'"
                  >
                    <i
                      class="fas me-1"
                      :class="mensajeLogin.includes('Error') ? 'fa-times-circle' : 'fa-check-circle'"
                    ></i>
                    {{ mensajeLogin }}
                  </div>
                </div>

                <div class="card-body">
                  <form role="form" novalidate @submit.prevent="iniciarSesion">
                    <div class="mb-3">
                      <argon-input
                        id="email"
                        type="text"
                        placeholder="Correo Institucional"
                        name="email"
                        size="lg"
                        v-model="formularioLogin.username"
                      />
                    </div>
                    <div class="mb-3">
                      <argon-input
                        id="password"
                        type="password"
                        placeholder="Contraseña"
                        name="password"
                        size="lg"
                        v-model="formularioLogin.password"
                      />
                    </div>

                    <div class="d-flex align-items-center">
                      <argon-switch
                        id="recordarme"
                        name="recordar-me"
                        v-model="formularioLogin.recordarme"
                      >
                        <span class="text-sm">Recordar sesión</span>
                      </argon-switch>
                    </div>

                    <div class="text-center">
                      <argon-button
                        class="mt-4 btn-azul-tamep"
                        fullWidth
                        size="lg"
                        type="submit"
                      >
                        <i class="me-2 fas fa-plane-departure"></i> Acceder al Sistema
                      </argon-button>
                    </div>
                  </form>
                </div>

                <div class="px-1 pt-0 text-center card-footer px-lg-2 bg-transparent">
                  <p class="mx-auto mb-4 text-sm">
                    ¿No tienes una cuenta?
                    <a
                      href="javascript:;"
                      @click="irAlRegistro"
                      class="text-amarillo-tamep font-weight-bold"
                    >Regístrate</a>
                  </p>
                </div>
              </div>
            </div>

            <div
              class="top-0 my-auto text-center col-6 d-lg-flex d-none h-100 pe-0 position-absolute end-0 justify-content-center flex-column"
              style="
                background-image: url('https://www.tamep.bo/assets/png/1-Ds-k_scH.png');
                background-size: cover;
                background-position: center;
              "
            >
              <span class="mask bg-azul-tamep opacity-8"></span>
              <div class="position-relative">
                <div class="mb-4">
                  <i class="fas fa-paper-plane fa-4x text-amarillo-tamep"></i>
                </div>
                <h3 class="mt-2 text-white font-weight-bolder">TAMEP</h3>
                <h5 class="text-white opacity-8 px-5">"Transporte Aéreo Militar Empresa Pública"</h5>
                <hr class="horizontal light w-25 mx-auto" />
                <p class="text-white px-5 mt-3">
                  Sistema Integral Para la Gestion Tecnica de Activos Fijos .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.text-azul-tamep { color: #003366 !important; }
.bg-azul-tamep { background-color: #003366 !important; }
.text-amarillo-tamep { color: #ffcc00 !important; }

.btn-azul-tamep {
  background: linear-gradient(310deg, #003366 0%, #00509d 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 7px -1px rgba(0, 0, 0, 0.11), 0 2px 4px -1px rgba(0, 0, 0, 0.07);
  transition: all 0.3s ease;
}

.btn-azul-tamep:hover {
  background: linear-gradient(310deg, #002244 0%, #003366 100%);
  transform: translateY(-1px);
}

.mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>