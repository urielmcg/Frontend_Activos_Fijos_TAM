<script setup>
import { reactive, ref, onBeforeMount, onBeforeUnmount } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import api from '@/services/api';
import Swal from "sweetalert2"; // Importante: Agregar SweetAlert para los mensajes

import ArgonInput from "@/components/ArgonInput.vue";
import ArgonButton from "@/components/ArgonButton.vue";
import TurnstileWidget from "@/components/TurnstileWidget.vue";

const body = document.getElementsByTagName("body")[0];
const store = useStore();
const router = useRouter();
const turnstileToken = ref("");

// --- 1. Formulario adaptado a Django (username requerido) ---
const formularioRegistro = reactive({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    rol: 'usuario',
    regional_id: null
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

// --- 2. Lógica de Registro con Validación y Manejo de Errores ---
const registrarUsuario = async () => {
    if (!turnstileToken.value) {
        return Swal.fire("Atención", "Complete la verificación Turnstile.", "warning");
    }
    // Validación Frontend: Contraseñas iguales
    if (formularioRegistro.password !== formularioRegistro.password_confirmation) {
        return Swal.fire("Error", "Las contraseñas no coinciden.", "warning");
    }

    try {
        Swal.fire({ title: 'Registrando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        // Enviar datos al backend (asegúrate de que tu URL sea la correcta en Django)
        // ADMIN crea activo directo vía /users/ (is_active=True)
        await api.post('users/', {
            first_name: formularioRegistro.first_name,
            last_name: formularioRegistro.last_name,
            username: formularioRegistro.username,
            email: formularioRegistro.email,
            password: formularioRegistro.password,
            password_confirmation: formularioRegistro.password_confirmation,
            is_active: true,
            rol: formularioRegistro.rol || 'usuario',
            regional_id: formularioRegistro.regional_id || null,
            turnstile_token: turnstileToken.value,
        });
        turnstileToken.value = "";

        Swal.fire("¡Éxito!", "Usuario creado ACTIVO directamente (sin aprobación). Ya puede iniciar sesión.", "success");
        
        // Limpiar formulario y Redirigir
        Object.assign(formularioRegistro, { first_name: '', last_name: '', username: '', email: '', password: '', password_confirmation: '' });
        router.push('/signin');

    } catch (error) {
        // 3. Captura inteligente de errores del Backend
        console.error(error);
        const mensajeError = error.response?.data 
            ? Object.values(error.response.data).flat().join(" ") 
            : "Error de conexión con el servidor.";
            
        Swal.fire("Error al registrar", mensajeError, "error");
    }
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
                                <div class="pb-0 card-header text-start">
                                    <h4 class="font-weight-bolder">Registrar Usuario</h4>
                                    <p class="mb-0">Crea tu cuenta de acceso a SIAEM</p>
                                </div>
                                <div class="card-body">
                                    <form role="form" @submit.prevent="registrarUsuario">
                                        <div class="row mb-3">
                                            <div class="col-6">
                                                <argon-input id="first_name" type="text" placeholder="Nombres" name="first_name" size="lg" v-model="formularioRegistro.first_name" required />
                                            </div>
                                            <div class="col-6">
                                                <argon-input id="last_name" type="text" placeholder="Apellidos" name="last_name" size="lg" v-model="formularioRegistro.last_name" required />
                                            </div>
                                        </div>
                                        <div class="mb-3">
                                            <argon-input id="username" type="text" placeholder="Nombre de Usuario" name="username" size="lg" v-model="formularioRegistro.username" required />
                                        </div>
                                        <div class="mb-3">
                                            <argon-input id="email" type="email" placeholder="Correo Electrónico" name="email" size="lg" v-model="formularioRegistro.email" required />
                                        </div>
                                        <div class="mb-3">
                                            <argon-input id="password" type="password" placeholder="Contraseña" name="password" size="lg" v-model="formularioRegistro.password" required />
                                        </div>
                                        <div class="mb-3">
                                            <argon-input id="password_confirmation" type="password" placeholder="Confirmar Contraseña" name="password_confirmation" size="lg" v-model="formularioRegistro.password_confirmation" required />
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label text-sm">Rol</label>
                                            <select class="form-control" v-model="formularioRegistro.rol">
                                                <option value="usuario">Usuario</option>
                                                <option value="consultor">Consultor</option>
                                                <option value="admin_regional">Admin Regional</option>
                                                <option value="admin_principal">Admin Principal</option>
                                                <option value="admin_informatico">Admin Informático</option>
                                            </select>
                                        </div>

                                        <div class="text-center">
                                            <TurnstileWidget v-model="turnstileToken" />
                                            <argon-button class="mt-4" variant="gradient" color="success" fullWidth size="lg" type="submit">Registrarse</argon-button>
                                        </div>
                                    </form>
                                </div>
                                <div class="px-1 pt-0 text-center card-footer px-lg-2">
                                    <p class="mx-auto mb-4 text-sm">
                                        ¿Ya tienes una cuenta?
                                        <router-link to="/login" class="text-success text-gradient font-weight-bold">Iniciar Sesión</router-link>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="top-0 my-auto text-center col-6 d-lg-flex d-none h-100 pe-0 position-absolute end-0 justify-content-center flex-column"
                            style="background-image: url('https://raw.githubusercontent.com/creativetimofficial/public-assets/master/argon-dashboard-pro/assets/img/signin-ill.jpg'); background-size: cover;">
                            <span class="mask bg-gradient-success opacity-6"></span>
                            <h4 class="mt-5 text-white font-weight-bolder position-relative">
                                "Control total de activos al alcance de tu mano"
                            </h4>
                            <p class="text-white position-relative">
                                Administra, rastrea y optimiza tus activos empresariales con facilidad.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
</template>