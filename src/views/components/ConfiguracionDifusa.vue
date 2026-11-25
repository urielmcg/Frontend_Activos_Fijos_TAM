<script setup>
import { ref } from 'vue';

const variableActiva = ref('edad');

const variables = {
  edad: {
    nombre: 'Edad del Activo (meses)',
    funciones: [
      { nombre: 'Nuevo', rango: '0 - 24 meses', tipo: 'Triangular', valores: [0, 0, 24], color: '#2dce89' },
      { nombre: 'Medio', rango: '12 - 60 meses', tipo: 'Triangular', valores: [12, 36, 60], color: '#fb6340' },
      { nombre: 'Viejo', rango: '48 - 120+ meses', tipo: 'Triangular', valores: [48, 120, 120], color: '#f5365c' },
    ],
    descripcion: 'Representa la antigüedad del activo desde su fecha de adquisición. Se ajusta por mejoras realizadas (cada mejora rejuvenece 6 meses).'
  },
  mtbf: {
    nombre: 'MTBF - Tiempo Medio Entre Fallas (horas)',
    funciones: [
      { nombre: 'Bajo', rango: '0 - 500 hrs', tipo: 'Triangular', valores: [0, 0, 500], color: '#f5365c' },
      { nombre: 'Medio', rango: '200 - 1500 hrs', tipo: 'Triangular', valores: [200, 750, 1500], color: '#fb6340' },
      { nombre: 'Alto', rango: '1000 - 3000+ hrs', tipo: 'Triangular', valores: [1000, 3000, 3000], color: '#2dce89' },
    ],
    descripcion: 'Indica la confiabilidad operativa. Un MTBF alto significa mayor tiempo entre fallas. Se calcula a partir de intervenciones correctivas.'
  },
  mttr: {
    nombre: 'MTTR - Tiempo Medio de Reparación (horas)',
    funciones: [
      { nombre: 'Rápido', rango: '0 - 4 hrs', tipo: 'Triangular', valores: [0, 0, 4], color: '#2dce89' },
      { nombre: 'Normal', rango: '2 - 12 hrs', tipo: 'Triangular', valores: [2, 6, 12], color: '#fb6340' },
      { nombre: 'Lento', rango: '8 - 24+ hrs', tipo: 'Triangular', valores: [8, 24, 24], color: '#f5365c' },
    ],
    descripcion: 'Mide la mantenibilidad del equipo. Un MTTR bajo indica que las reparaciones son rápidas. Se calcula a partir de la duración de intervenciones correctivas.'
  },
  fallas: {
    nombre: 'Contador de Fallas',
    funciones: [
      { nombre: 'Pocas', rango: '0 - 3', tipo: 'Triangular', valores: [0, 0, 3], color: '#2dce89' },
      { nombre: 'Moderadas', rango: '2 - 8', tipo: 'Triangular', valores: [2, 5, 8], color: '#fb6340' },
      { nombre: 'Muchas', rango: '6 - 15+', tipo: 'Triangular', valores: [6, 15, 15], color: '#f5365c' },
    ],
    descripcion: 'Número total de fallas registradas. Cada intervención correctiva incrementa este contador. Impacto en salud: cada falla reduce 8 puntos.'
  },
  salud: {
    nombre: 'Índice de Salud Fuzzy (resultado)',
    funciones: [
      { nombre: 'Crítico', rango: '0 - 30%', tipo: 'Triangular', valores: [0, 0, 30], color: '#f5365c' },
      { nombre: 'Degradado', rango: '20 - 60%', tipo: 'Triangular', valores: [20, 40, 60], color: '#fb6340' },
      { nombre: 'Aceptable', rango: '50 - 80%', tipo: 'Triangular', valores: [50, 65, 80], color: '#11cdef' },
      { nombre: 'Óptimo', rango: '70 - 100%', tipo: 'Triangular', valores: [70, 100, 100], color: '#2dce89' },
    ],
    descripcion: 'Resultado final del sistema de lógica difusa. Combina todas las variables de entrada para producir un índice de 0% (crítico) a 100% (óptimo).'
  }
};

const varActual = () => variables[variableActiva.value];
</script>

<template>
  <div class="container-fluid py-4">
    <!-- Header -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card bg-gradient-dark">
          <div class="card-body p-4">
            <div class="row align-items-center">
              <div class="col-auto">
                <div class="icon icon-shape bg-white shadow text-center border-radius-md">
                  <i class="ni ni-settings-gear-65 text-dark text-lg"></i>
                </div>
              </div>
              <div class="col">
                <h5 class="text-white mb-0">Motor de Lógica Difusa (Fuzzy Logic)</h5>
                <p class="text-white text-sm opacity-8 mb-0">
                  Configuración de funciones de membresía para el cálculo del Índice de Salud de activos fijos.
                  Basado en el módulo <code class="text-info">activos/utils_ia.py</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <!-- Panel izquierdo: Selector de variables -->
      <div class="col-md-4 mb-4">
        <div class="card h-100">
          <div class="card-header pb-0">
            <h6 class="mb-0">Variables del Sistema</h6>
            <p class="text-xs text-secondary">Seleccione una variable para ver su configuración</p>
          </div>
          <div class="card-body">
            <div v-for="(v, key) in variables" :key="key"
              class="p-3 mb-2 border-radius-lg cursor-pointer"
              :class="variableActiva === key ? 'bg-gradient-primary text-white' : 'bg-gray-100'"
              @click="variableActiva = key"
              style="cursor: pointer;">
              <h6 :class="variableActiva === key ? 'text-white' : 'text-dark'" class="text-sm mb-0">{{ v.nombre }}</h6>
              <p :class="variableActiva === key ? 'text-white opacity-8' : 'text-secondary'" class="text-xs mb-0">
                {{ v.funciones.length }} funciones de membresía
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel derecho: Detalle de variable -->
      <div class="col-md-8 mb-4">
        <div class="card h-100">
          <div class="card-header pb-0">
            <h6 class="mb-0">{{ varActual().nombre }}</h6>
            <p class="text-xs text-secondary">{{ varActual().descripcion }}</p>
          </div>
          <div class="card-body">
            <!-- Funciones de membresía -->
            <div class="table-responsive mb-4">
              <table class="table align-items-center mb-0">
                <thead>
                  <tr>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Conjunto</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Tipo</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Rango</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Valores [a, b, c]</th>
                    <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Visualización</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="f in varActual().funciones" :key="f.nombre">
                    <td>
                      <div class="d-flex align-items-center px-2 py-1">
                        <div class="me-2" :style="{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: f.color }"></div>
                        <span class="text-sm font-weight-bold">{{ f.nombre }}</span>
                      </div>
                    </td>
                    <td><span class="text-xs">{{ f.tipo }}</span></td>
                    <td><span class="text-xs font-weight-bold">{{ f.rango }}</span></td>
                    <td><code class="text-xs">[{{ f.valores.join(', ') }}]</code></td>
                    <td>
                      <div class="d-flex align-items-center" style="width: 120px; height: 24px;">
                        <svg width="120" height="24" viewBox="0 0 120 24">
                          <polygon
                            :points="`${(f.valores[0]/f.valores[2])*120},24 ${(f.valores[1]/f.valores[2])*120},2 ${120},24`"
                            :fill="f.color"
                            opacity="0.3"
                            :stroke="f.color"
                            stroke-width="1.5"/>
                        </svg>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Diagrama de barras visual -->
            <h6 class="text-sm font-weight-bold text-uppercase text-secondary mb-3">Cobertura de Funciones</h6>
            <div v-for="f in varActual().funciones" :key="f.nombre + '-bar'" class="mb-3">
              <div class="d-flex justify-content-between mb-1">
                <span class="text-xs font-weight-bold">{{ f.nombre }}</span>
                <span class="text-xs text-secondary">{{ f.rango }}</span>
              </div>
              <div class="progress" style="height: 8px;">
                <div class="progress-bar" role="progressbar"
                  :style="{
                    width: ((f.valores[2] - f.valores[0]) / (varActual().funciones[varActual().funciones.length-1].valores[2] || 1) * 100) + '%',
                    marginLeft: (f.valores[0] / (varActual().funciones[varActual().funciones.length-1].valores[2] || 1) * 100) + '%',
                    backgroundColor: f.color
                  }">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Nota informativa -->
        <div class="card mt-4">
          <div class="card-body p-3">
            <div class="d-flex align-items-center">
              <div class="icon icon-shape bg-gradient-info shadow-info text-center border-radius-md me-3">
                <i class="ni ni-bulb-61 text-white text-lg"></i>
              </div>
              <div>
                <h6 class="text-sm mb-0">Nota sobre la configuración</h6>
                <p class="text-xs text-secondary mb-0">
                  Los parámetros de lógica difusa están definidos en el backend (<code>activos/utils_ia.py</code>).
                  Esta vista es informativa. Para modificar los rangos, se debe actualizar el código del servidor
                  y re-ejecutar el análisis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
