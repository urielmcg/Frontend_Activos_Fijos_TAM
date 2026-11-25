<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-md-4">
        <div class="card card-profile shadow-blur">
          <div class="card-body text-center">
            <div class="bg-gradient-primary border-radius-lg p-3 mb-3">
              <i class="fas fa-laptop fa-3x text-white"></i>
            </div>
            <h5>{{ detalle.activo?.nombre_especifico }}</h5>
            <p class="text-sm font-weight-bold">{{ detalle.activo?.codigo_tamep }}</p>
            <hr class="horizontal dark">
            <div class="row">
              <div class="col-6">
                <span class="text-xs text-secondary">Estado</span>
                <h6 class="text-sm">{{ detalle.activo?.estado_actual }}</h6>
              </div>
              <div class="col-6">
                <span class="text-xs text-secondary">Ubicación</span>
                <h6 class="text-sm">{{ detalle.activo?.regional }}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-8">
        <div class="card">
          <div class="card-header pb-0 p-3">
            <h6 class="mb-0"><i class="fas fa-brain text-primary me-2"></i>Análisis de Salud Predictiva (IA)</h6>
          </div>
          <div class="card-body p-3">
            <div class="row text-center mb-4">
              <div class="col-4 border-end">
                <h4 :class="colorFuzzy">{{ detalle.metricas?.indice_fuzzy }}%</h4>
                <p class="text-xs text-uppercase font-weight-bold">Índice Salud Fuzzy</p>
              </div>
              <div class="col-4 border-end">
                <h4 class="text-dark">{{ detalle.metricas?.mtbf }} hrs</h4>
                <p class="text-xs text-uppercase font-weight-bold">MTBF Teórico</p>
              </div>
              <div class="col-4">
                <h4 class="text-danger">{{ (detalle.metricas?.probabilidad_falla * 100).toFixed(1) }}%</h4>
                <p class="text-xs text-uppercase font-weight-bold">Prob. Falla</p>
              </div>
            </div>
            
            <div class="bg-gray-100 p-3 border-radius-lg">
              <h6 class="text-sm">Recomendación del Sistema:</h6>
              <p class="text-sm italic">"{{ detalle.metricas?.recomendacion }}"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const detalle = ref({});

const colorFuzzy = computed(() => {
  const val = detalle.value.metricas?.indice_fuzzy;
  if (val > 80) return 'text-success';
  if (val > 50) return 'text-warning';
  return 'text-danger';
});

onMounted(async () => {
  const res = await axios.get(`http://.../api/activos/${route.params.id}/ficha_tecnica/`);
  detalle.value = res.data;
});
</script>