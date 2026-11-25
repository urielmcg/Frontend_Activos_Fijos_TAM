<template>
  <div class="chart-container" :style="{ height: height + 'px', position: 'relative' }">
    <Doughnut :data="computedData" :options="chartOptions" />
    <div class="chart-center-text">
      <span class="text-dark font-weight-bold">Uso</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Doughnut } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale);

const props = defineProps({
  chart: {
    type: Object,
    required: true,
  },
  height: {
    type: Number,
    default: 300,
  },
});

const computedData = computed(() => ({
  labels: props.chart.labels,
  datasets: props.chart.datasets.map((dataset) => ({
    ...dataset,
    cutout: "75%", // Anillo más delgado, más elegante
    borderRadius: 5, // Bordes redondeados en los segmentos
    spacing: 2, // Pequeña separación entre segmentos
    borderWidth: 0,
  })),
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: "bottom",
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        padding: 15,
        font: {
          size: 11,
          family: "Open Sans",
        },
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: "#fff",
      titleColor: "#050505",
      bodyColor: "#67748e",
      bodyFont: { size: 12 },
      borderColor: "#e9ecef",
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      callbacks: {
        label: (context) => {
          const label = context.label || "";
          const value = context.raw || 0;
          return ` ${label}: ${value} Activos`;
        },
      },
    },
  },
};
</script>

<style scoped>
.chart-container {
  width: 100%;
}
.chart-center-text {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  text-align: center;
}
</style>