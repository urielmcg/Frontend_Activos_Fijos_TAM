<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api"; 
import MiniStatisticsCard from "@/examples/Cards/MiniStatisticsCard.vue";
import GradientLineChart from "@/examples/Charts/GradientLineChart.vue";
import DoughnutChart from "@/examples/Charts/DoughnutChart.vue";

// --- ESTADOS REACTIVOS ---
const stats = ref({
  total_activos: 0,
  criticos_ia: 0,
  salud_global: 0,
  meses_recuperados: 0,
  total_mejoras: 0,
  mtbf_avg: 0,
  mttr_avg: 0,
  proximo_mantenimiento: null
});

const regionalesData = ref([]);
const topCriticos = ref([]);
const lineChartData = ref({ labels: [], datasets: [] });
const pieChartData = ref({ labels: [], datasets: [] });
const loading = ref(true);

const getDashboardData = async () => {
  try {
    loading.value = true;
    
    // 2. Ya no necesitas obtener el token manualmente ni configurar headers.
    // El archivo api.js lo hace por ti en cada petición.
    const response = await api.get("dashboard/stats/");
    
    const res = response.data;

    // Asignación de datos
    stats.value = res.cards || stats.value;
    regionalesData.value = res.regionales || [];
    topCriticos.value = res.top_criticos || [];

    // 3. Configuración Gráfico de Líneas
    if (res.charts && res.charts.mantenimiento) {
      lineChartData.value = {
        labels: res.charts.mantenimiento.labels,
        datasets: [
          {
            label: "Preventivos (Planificado)",
            data: res.charts.mantenimiento.preventivos,
            tension: 0.4,
            borderColor: "#2dce89",
            borderWidth: 3,
            fill: true,
            backgroundColor: "rgba(45, 206, 137, 0.1)",
          },
          {
            label: "Correctivos (Fallas)",
            data: res.charts.mantenimiento.correctivos,
            tension: 0.4,
            borderColor: "#f5365c",
            borderWidth: 3,
            fill: true,
            backgroundColor: "rgba(245, 54, 92, 0.1)",
          }
        ],
      };
    }

    // 4. Configuración Gráfico de Pastel
    if (res.charts && res.charts.perfiles) {
      pieChartData.value = {
        labels: res.charts.perfiles.map(p => p.perfil_uso),
        datasets: [{
          label: "Activos",
          data: res.charts.perfiles.map(p => p.total),
          backgroundColor: ["#5e72e4", "#2dce89", "#11cdef", "#fb6340", "#f5365c"],
        }]
      };
    }

  } catch (error) {
    // Si el interceptor detecta un 401 real, te enviará al login automáticamente
    console.error("Error cargando Dashboard:", error.response?.data || error.message);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  getDashboardData();
});
</script>
<template>
  <div class="py-4 container-fluid">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-grow text-primary" role="status">
        <span class="visually-hidden">Procesando Modelos de IA...</span>
      </div>
      <h5 class="mt-3">Sincronizando Métricas de Confiabilidad...</h5>
    </div>

    <div v-else>
      <div class="row">
        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <mini-statistics-card 
            title="Salud Fuzzy Global" 
            :value="stats.salud_global + '%'"
            :description="`<span class='text-sm font-weight-bolder text-success'>Lógica Difusa</span> activa`"
            :icon="{ component: 'ni ni- atom', background: 'bg-gradient-primary' }" 
          />
        </div>

        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <mini-statistics-card 
            title="Confiabilidad (MTBF)" 
            :value="stats.mtbf_avg + 'h'" 
            description="<span class='text-sm font-weight-bolder text-info'>Tiempo medio</span> entre fallas"
            :icon="{ component: 'ni ni-time-alarm', background: 'bg-gradient-info' }" 
          />
        </div>

        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <mini-statistics-card 
            title="Mantenibilidad (MTTR)" 
            :value="stats.mttr_avg + 'h'"
            description="<span class='text-sm font-weight-bolder text-warning'>Promedio</span> de reparación"
            :icon="{ component: 'ni ni-settings', background: 'bg-gradient-warning' }" 
          />
        </div>

        <div class="col-xl-3 col-sm-6">
          <mini-statistics-card 
            title="Riesgo Crítico (IA)" 
            :value="stats.criticos_ia.toString()" 
            :description="stats.criticos_ia > 0 ? 
              '<span class=\'text-sm font-weight-bolder text-danger\'>Random Forest Alert</span>' : 
              '<span class=\'text-sm font-weight-bolder text-success\'>Estable</span>'"
            :icon="{ component: 'ni ni-active-40', background: 'bg-gradient-danger' }" 
          />
        </div>
      </div>

      <div class="row mt-4">
        <div class="col-lg-7 mb-4">
          <div class="card z-index-2">
            <div class="p-3 pb-0 card-header">
              <h6>Efectividad del Mantenimiento Preventivo</h6>
              <p class="text-sm">Tendencia de los últimos 6 meses</p>
            </div>
            <div class="p-3 card-body">
              <gradient-line-chart id="chart-line" :chart="lineChartData" />
            </div>
          </div>
        </div>
        <div class="col-lg-5 mb-4">
          <div class="card h-100">
            <div class="p-3 pb-0 card-header">
              <h6>Segmentación por Perfil de Uso</h6>
            </div>
            <div class="p-3 card-body">
              <doughnut-chart :chart="pieChartData" :height="230" />
            </div>
          </div>
        </div>
      </div>

      <div class="row mt-4">
        <div class="col-lg-5 mb-4">
          <div class="card h-100">
            <div class="p-3 pb-0 card-header">
              <h6 class="mb-0 text-danger">Prioridades de Intervención (IA)</h6>
              <p class="text-xs">Activos con mayor probabilidad de falla inminente</p>
            </div>
            <div class="p-3 card-body">
              <ul class="list-group">
                <li v-for="item in topCriticos" :key="item.codigo"
                  class="list-group-item border-0 d-flex justify-content-between ps-0 mb-3 border-radius-lg">
                  <div class="d-flex align-items-center">
                    <div class="icon icon-shape icon-sm me-3 bg-gradient-dark shadow text-center border-radius-md">
                      <i class="ni ni-settings-gear-65 text-white opacity-10"></i>
                    </div>
                    <div class="d-flex flex-column">
                      <h6 class="mb-1 text-dark text-sm">{{ item.nombre }}</h6>
                      <span class="text-xs text-secondary">ID: {{ item.codigo }}</span>
                    </div>
                  </div>
                  <div class="d-flex align-items-center">
                    <span class="badge badge-sm bg-gradient-danger">{{ item.probabilidad }}% Riesgo</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="col-lg-7 mb-4">
          <div class="card h-100">
            <div class="p-3 pb-0 card-header d-flex justify-content-between">
              <h6>Estado de Salud por Regional</h6>
              <span class="badge bg-gradient-secondary">Monitoreo en Tiempo Real</span>
            </div>
            <div class="table-responsive">
              <table class="table align-items-center mb-0">
                <thead>
                  <tr>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-4">Regional</th>
                    <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Unidades</th>
                    <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Salud (Fuzzy)</th>
                    <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="region in regionalesData" :key="region.nombre">
                    <td class="ps-4">
                      <div class="d-flex px-2 py-1">
                        <div class="d-flex flex-column justify-content-center">
                          <h6 class="mb-0 text-sm">{{ region.nombre }}</h6>
                        </div>
                      </div>
                    </td>
                    <td class="text-center text-sm">
                      <span class="text-xs font-weight-bold">{{ region.cantidad }}</span>
                    </td>
                    <td class="align-middle text-center">
                      <div class="d-flex align-items-center justify-content-center px-4">
                        <span class="me-2 text-xs font-weight-bold">{{ region.salud }}%</span>
                        <div class="progress w-100" style="height: 8px;">
                          <div class="progress-bar" role="progressbar" 
                            :style="{ width: region.salud + '%', backgroundColor: region.salud < 50 ? '#f5365c' : '#2dce89' }">
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="text-center">
                      <span :class="region.salud < 50 ? 'text-danger' : 'text-success'" class="text-xs font-weight-bold">
                        {{ region.salud < 50 ? 'Crítico' : 'Estable' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div v-if="stats.proximo_mantenimiento" class="row mt-2">
        <div class="col-12">
          <div class="card bg-dark border-0 shadow-lg">
            <div class="card-body p-4">
              <div class="row align-items-center">
                <div class="col-auto">
                  <div class="p-3 bg-gradient-primary border-radius-lg">
                    <i class="ni ni-bulb-61 text-white text-lg"></i>
                  </div>
                </div>
                <div class="col ml--2">
                  <h5 class="text-white mb-0">Decisión Prescriptiva Automática</h5>
                  <p class="text-white opacity-8 text-sm mb-0">
                    Basado en el análisis de Random Forest, se recomienda intervenir el activo 
                    <strong class="text-info">{{ stats.proximo_mantenimiento.activo }}</strong> 
                    ({{ stats.proximo_mantenimiento.codigo }}) debido a un nivel de riesgo del 
                    <strong>{{ stats.proximo_mantenimiento.probabilidad }}%</strong>.
                  </p>
                </div>
                <div class="col-auto">
                  <button class="btn btn-info btn-round">Generar Orden de Trabajo</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>