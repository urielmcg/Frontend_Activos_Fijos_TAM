<script setup>
import { onBeforeUnmount, onBeforeMount, reactive, ref } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import api from "@/services/api";
import Swal from "sweetalert2";
import ArgonInput from "@/components/ArgonInput.vue";
import ArgonCheckbox from "@/components/ArgonCheckbox.vue";
import ArgonButton from "@/components/ArgonButton.vue";
import TurnstileWidget from "@/components/TurnstileWidget.vue";

const body = document.getElementsByTagName("body")[0];
const store = useStore();
const router = useRouter();
const enviando = ref(false);
const turnstileToken = ref("");

const formulario = reactive({
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  password: "",
  password_confirmation: "",
  aceptaTerminos: true
});

onBeforeMount(() => {
  store.state.hideConfigButton = true;
  store.state.showNavbar = false;
  store.state.showSidenav = false;
  store.state.showFooter = false;
  body.classList.remove("bg-gray-100");
});

onBeforeUnmount(() => {
  store.state.hideConfigButton = false;
  store.state.showNavbar = true;
  store.state.showSidenav = true;
  store.state.showFooter = true;
  body.classList.add("bg-gray-100");
});

const manejarRegistro = async () => {
  if (!formulario.aceptaTerminos) {
    return Swal.fire("Atención", "Debe aceptar el uso de datos institucionales para continuar.", "warning");
  }
  if (formulario.password !== formulario.password_confirmation) {
    return Swal.fire("Error", "Las contraseñas no coinciden.", "warning");
  }
  if (!turnstileToken.value) {
    return Swal.fire("Atención", "Complete la verificación Turnstile.", "warning");
  }

  enviando.value = true;
  try {
    Swal.fire({ title: "Enviando solicitud...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    await api.post("register/", {
      first_name: formulario.first_name,
      last_name: formulario.last_name,
      username: formulario.username,
      email: formulario.email,
      password: formulario.password,
      password_confirmation: formulario.password_confirmation,
      turnstile_token: turnstileToken.value,
    });
    turnstileToken.value = "";

    await Swal.fire({
      icon: "success",
      title: "Solicitud Enviada",
      text: "Un administrador de TAMEP revisará y activará su cuenta. Se le notificará cuando pueda acceder.",
      confirmButtonColor: "#003366",
    });

    router.push("/signin");
  } catch (error) {
    const mensajeError = error.response?.data
      ? Object.values(error.response.data).flat().join(" ")
      : "Error de conexión con el servidor.";
    Swal.fire("Error al registrar", mensajeError, "error");
  } finally {
    enviando.value = false;
  }
};

const irAlLogin = () => router.push("/signin");
</script>

<template>
  <main class="main-content mt-0">
    <div
      class="page-header align-items-start min-vh-50 pt-5 pb-11 m-3 border-radius-lg"
      style="
        background-image: url('https://www.tamep.bo/assets/png/1-Ds-k_scH.png');
        background-position: center;
      "
    >
      <span class="mask bg-azul-tamep opacity-7"></span>
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-5 text-center mx-auto">
            <h1 class="text-white mb-2 mt-5">Registro Institucional</h1>
            <p class="text-lead text-white">
              Sistema de Control de Activos Fijos - TAMEP EP
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="row mt-lg-n10 mt-md-n11 mt-n10 justify-content-center">
        <div class="col-xl-4 col-lg-5 col-md-7 mx-auto">
          <div class="card z-index-0 shadow-lg border-0">
            <div class="card-header text-center pt-4 bg-transparent">
              <i class="fas fa-plane-shield fa-2x text-azul-tamep mb-2"></i>
              <h5 class="font-weight-bolder">Crear Solicitud de Acceso</h5>
            </div>

            <div class="card-body">
              <form role="form" @submit.prevent="manejarRegistro">
                <div class="row">
                  <div class="col-6">
                    <argon-input
                      id="first_name"
                      type="text"
                      placeholder="Nombres"
                      v-model="formulario.first_name"
                      required
                    />
                  </div>
                  <div class="col-6">
                    <argon-input
                      id="last_name"
                      type="text"
                      placeholder="Apellidos"
                      v-model="formulario.last_name"
                      required
                    />
                  </div>
                </div>
                <argon-input
                  id="username"
                  type="text"
                  placeholder="Nombre de Usuario"
                  v-model="formulario.username"
                  required
                />
                <argon-input
                  id="email"
                  type="email"
                  placeholder="Correo @tamep.bo"
                  v-model="formulario.email"
                  required
                />
                <argon-input
                  id="password"
                  type="password"
                  placeholder="Contraseña"
                  v-model="formulario.password"
                  required
                />
                <argon-input
                  id="password_confirmation"
                  type="password"
                  placeholder="Confirmar Contraseña"
                  v-model="formulario.password_confirmation"
                  required
                />

                <argon-checkbox v-model:checked="formulario.aceptaTerminos">
                  <label class="form-check-label text-sm" for="flexCheckDefault">
                    Acepto el uso de datos institucionales
                  </label>
                </argon-checkbox>

                <div class="text-center">
                  <TurnstileWidget v-model="turnstileToken" />
                  <argon-button
                    fullWidth
                    class="my-4 btn-azul-tamep"
                    type="submit"
                    :disabled="enviando"
                  >
                    {{ enviando ? 'ENVIANDO...' : 'SOLICITAR REGISTRO' }}
                  </argon-button>
                </div>

                <p class="text-sm mt-3 mb-0 text-center">
                  ¿Ya tienes acceso oficial?
                  <a href="javascript:;" @click="irAlLogin" class="text-amarillo-tamep font-weight-bold">
                    Volver al Login
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Identidad Visual TAMEP */
.bg-azul-tamep { background-color: #003366 !important; }
.text-azul-tamep { color: #003366 !important; }
.text-amarillo-tamep { color: #FFCC00 !important; }

.btn-azul-tamep {
  background: linear-gradient(310deg, #003366 0%, #00509d 100%);
  color: white;
  border: none;
  font-weight: bold;
}

.btn-azul-tamep:hover {
  background: linear-gradient(310deg, #002244 0%, #003366 100%);
  transform: translateY(-1px);
}

:deep(.form-control:focus) {
  border-color: #FFCC00 !important;
  box-shadow: 0 0 0 2px rgba(255, 204, 0, 0.2);
}
</style>