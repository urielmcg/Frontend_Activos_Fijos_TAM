<script setup>
/* eslint-disable */
// Widget de Cloudflare Turnstile (render explícito).
// API espejo del antiguo widget de hCaptcha: v-model con el token +
// eventos verify / expired / error, montado en un contenedor ref.
import { ref, watch, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue", "verify", "expired", "error"]);

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SITE_KEY = process.env.VUE_APP_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
const MAX_INTENTOS = 60; // ~6 s máx. de espera a que cargue el script
const INTERVALO_MS = 100;

const contenedor = ref(null);
let widgetId = null;
let timerEspera = null;

// Inyecta el script oficial una sola vez en el documento.
const inyectarScript = () => {
  if (window.turnstile) return;
  if (document.querySelector("script[data-turnstile-script]")) return;
  const script = document.createElement("script");
  script.src = SCRIPT_URL;
  script.async = true;
  script.setAttribute("data-turnstile-script", "");
  document.body.appendChild(script);
};

const renderizar = () => {
  if (widgetId !== null || !contenedor.value || !window.turnstile) return;
  widgetId = window.turnstile.render(contenedor.value, {
    sitekey: SITE_KEY,
    callback: (token) => {
      emit("update:modelValue", token);
      emit("verify", token);
    },
    "expired-callback": () => {
      emit("update:modelValue", "");
      emit("expired");
    },
    "error-callback": () => {
      emit("update:modelValue", "");
      emit("error");
    },
  });
};

// Bucle corto de espera: el script puede tardar en definir window.turnstile.
const esperarYRenderizar = (intento = 0) => {
  if (window.turnstile) {
    renderizar();
    return;
  }
  if (intento >= MAX_INTENTOS) {
    console.error("Turnstile: no se pudo cargar el script de Cloudflare.");
    emit("error");
    return;
  }
  timerEspera = setTimeout(() => esperarYRenderizar(intento + 1), INTERVALO_MS);
};

// Si el padre limpia el token (tras un envío exitoso) reiniciamos el widget
// para que no quede marcado como verificado con el token vacío.
watch(
  () => props.modelValue,
  (valor) => {
    if (!valor && widgetId !== null && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  }
);

onMounted(() => {
  inyectarScript();
  esperarYRenderizar();
});

onBeforeUnmount(() => {
  if (timerEspera) clearTimeout(timerEspera);
  if (widgetId !== null && window.turnstile) {
    window.turnstile.remove(widgetId);
    widgetId = null;
  }
});
</script>

<template>
  <div ref="contenedor" class="turnstile-widget"></div>
</template>

<style scoped>
.turnstile-widget {
  margin: 8px 0;
  min-height: 65px;
}
</style>
