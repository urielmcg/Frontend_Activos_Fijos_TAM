<script setup>
import { ref, watch, onMounted } from 'vue';
import api from '@/services/api';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const loading = ref(true);
const exportando = ref(false);
const descargando = ref(false);
const activos = ref([]);
const totalResultados = ref(0);

// Filtros
const filtros = ref({
  q: '',
  regional: '',
  grupo_contable: '',
  tipo_activo: '',
  situacion: '',
  estado: '',
  perfil_uso: '',
});

// Datos para selects
const regionales = ref([]);
const gruposContables = ref([]);
const tiposActivo = ref([]);

const cargarParametros = async () => {
  try {
    const [resRegionales, resGrupos] = await Promise.all([
      api.get('regionales/'),
      api.get('grupos-contables/')
    ]);
    regionales.value = resRegionales.data.results || resRegionales.data;
    gruposContables.value = resGrupos.data.results || resGrupos.data;
  } catch (error) {
    Swal.fire('Error', 'No se pudieron cargar los parámetros.', 'error');
  }
};

watch(() => filtros.value.grupo_contable, async (nuevoGrupo) => {
  tiposActivo.value = [];
  filtros.value.tipo_activo = '';
  if (nuevoGrupo) {
    try {
      const res = await api.get(`tipos-activos/?grupo_contable=${nuevoGrupo}`);
      tiposActivo.value = res.data.results || res.data;
    } catch (e) { /* silenciar */ }
  }
});

const buscar = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (filtros.value.q) params.append('search', filtros.value.q);
    if (filtros.value.regional) params.append('ubicacion_actual__regional', filtros.value.regional);
    if (filtros.value.grupo_contable) params.append('grupo_contable_seleccionado', filtros.value.grupo_contable);
    if (filtros.value.tipo_activo) params.append('tipo_activo', filtros.value.tipo_activo);
    if (filtros.value.situacion) params.append('situacion_activo', filtros.value.situacion);
    if (filtros.value.estado) params.append('estado_actual', filtros.value.estado);
    if (filtros.value.perfil_uso) params.append('perfil_uso', filtros.value.perfil_uso);

    const res = await api.get(`gestion-activos/?${params.toString()}`);
    activos.value = res.data.results || res.data;
    totalResultados.value = res.data.count || activos.value.length;
  } catch (error) {
    Swal.fire('Error', 'No se pudieron cargar los activos.', 'error');
  } finally {
    loading.value = false;
  }
};

const limpiarFiltros = () => {
  filtros.value = { q: '', regional: '', grupo_contable: '', tipo_activo: '', situacion: '', estado: '', perfil_uso: '' };
  buscar();
};

// Texto legible de los filtros actualmente aplicados (para el encabezado del PDF)
const filtrosAplicados = () => {
  const partes = [];
  if (filtros.value.q) partes.push(`Búsqueda: "${filtros.value.q}"`);
  const reg = regionales.value.find(r => String(r.id) === String(filtros.value.regional));
  if (reg) partes.push(`Regional: ${reg.nombre}`);
  const grp = gruposContables.value.find(g => String(g.id) === String(filtros.value.grupo_contable));
  if (grp) partes.push(`Grupo: ${grp.nombre}`);
  const tipo = tiposActivo.value.find(t => String(t.id) === String(filtros.value.tipo_activo));
  if (tipo) partes.push(`Tipo: ${tipo.nombre}`);
  if (filtros.value.situacion) partes.push(`Situación: ${filtros.value.situacion}`);
  if (filtros.value.estado) partes.push(`Estado: ${filtros.value.estado}`);
  if (filtros.value.perfil_uso) partes.push(`Perfil de uso: ${filtros.value.perfil_uso}`);
  return partes.join(' | ');
};

// Resumen estadístico calculado sobre los activos filtrados
const calcularResumen = () => {
  const porSituacion = {};
  const porEstado = {};
  let conIA = 0;
  let sumaProb = 0;
  let conProb = 0;
  let sinCustodio = 0;
  activos.value.forEach(a => {
    porSituacion[a.situacion_activo] = (porSituacion[a.situacion_activo] || 0) + 1;
    porEstado[a.estado_actual] = (porEstado[a.estado_actual] || 0) + 1;
    if (a.estado_ia && a.estado_ia !== '-') conIA++;
    if (a.probabilidad_falla != null) { sumaProb += a.probabilidad_falla; conProb++; }
    if (!a.custodio_actual || a.custodio_actual === 'Sin asignar') sinCustodio++;
  });
  const promProb = conProb ? (sumaProb / conProb) : 0;
  const col1 = [
    `Total de activos: ${activos.value.length}`,
    `Disponibles: ${porSituacion['Disponible'] || 0}`,
    `Asignados: ${porSituacion['Asignado'] || 0}`,
    `En mantenimiento: ${porSituacion['Mantenimiento'] || 0}`,
    `Dados de baja: ${porSituacion['Baja'] || 0}`,
  ];
  const col2 = [
    `Estado Bueno: ${porEstado['Bueno'] || 0}`,
    `Estado Regular: ${porEstado['Regular'] || 0}`,
    `Estado Malo: ${porEstado['Malo'] || 0}`,
    `Con predicción IA: ${conIA}`,
    `Prob. falla promedio: ${promProb.toFixed(1)}%`,
    `Sin custodio: ${sinCustodio}`,
  ];
  return { col1, col2 };
};

const exportarPDF = () => {
  if (activos.value.length === 0) return Swal.fire('Sin datos', 'No hay activos para exportar.', 'info');
  exportando.value = true;

  try {
    const doc = new jsPDF('l', 'mm', 'letter');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const now = new Date();
    const fechaStr = now.toLocaleString('es-BO', { dateStyle: 'long', timeStyle: 'short' });

    const nombreUsuario = [localStorage.getItem('first_name'), localStorage.getItem('last_name')]
      .filter(Boolean).join(' ').trim()
      || localStorage.getItem('username')
      || 'Usuario';
    const rolUsuario = localStorage.getItem('rol') || '';

    // ---------- Encabezado institucional ----------
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, pageW, 16, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TAMEP EP', 14, 10.5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestión de Activos Fijos', 14, 14.5);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Activos Fijos', pageW - 14, 11, { align: 'right' });

    // ---------- Datos del reporte ----------
    let y = 22;
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Activos Fijos', 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    const lineasMeta = [
      `Generado: ${fechaStr}`,
      `Generado por: ${nombreUsuario}${rolUsuario ? ' (' + rolUsuario + ')' : ''}`,
      `Total de registros: ${activos.value.length} de ${totalResultados.value} encontrados`,
    ];
    lineasMeta.forEach(l => { doc.text(l, 14, y); y += 4.5; });

    const filtrosTxt = filtrosAplicados();
    if (filtrosTxt) {
      const wrapped = doc.splitTextToSize(`Filtros aplicados: ${filtrosTxt}`, pageW - 28);
      wrapped.forEach(l => { doc.text(l, 14, y); y += 4.5; });
    } else {
      doc.text('Filtros aplicados: ninguno (todos los activos)', 14, y);
      y += 4.5;
    }

    // ---------- Resumen estadístico (debajo del encabezado) ----------
    const resumen = calcularResumen();
    const resumenY = y + 2;
    const resumenH = Math.max(resumen.col1.length, resumen.col2.length) * 4.5 + 10;
    doc.setFillColor(240, 244, 248);
    doc.roundedRect(14, resumenY, pageW - 28, resumenH, 2, 2, 'F');
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, resumenY, pageW - 28, resumenH, 2, 2, 'S');

    doc.setTextColor(0, 51, 102);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen estadístico', 18, resumenY + 6);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40);
    let ry = resumenY + 11;
    resumen.col1.forEach(l => { doc.text(l, 18, ry); ry += 4.5; });
    ry = resumenY + 11;
    resumen.col2.forEach(l => { doc.text(l, pageW / 2 + 4, ry); ry += 4.5; });

    const tableStartY = resumenY + resumenH + 4;

    // ---------- Tabla de activos ----------
    autoTable(doc, {
      startY: tableStartY,
      head: [['Código TAMEP', 'Nombre', 'Regional', 'Custodio', 'Situación', 'Estado', 'Prob. Falla']],
      body: activos.value.map(a => [
        a.codigo_tamep,
        a.nombre_especifico,
        a.regional_nombre || '-',
        a.custodio_actual || 'Sin asignar',
        a.situacion_activo,
        a.estado_actual,
        a.probabilidad_falla != null ? a.probabilidad_falla.toFixed(1) + '%' : '-'
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 52 },
        7: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    // ---------- Pie de página con numeración ----------
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setDrawColor(200);
      doc.setLineWidth(0.2);
      doc.line(14, pageH - 11, pageW - 14, pageH - 11);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.setFont('helvetica', 'normal');
      doc.text('TAMEP EP — Reporte de Activos Fijos', 14, pageH - 7);
      doc.text(`Página ${i} de ${totalPaginas}`, pageW - 14, pageH - 7, { align: 'right' });
    }

    doc.save(`Reporte_Activos_${now.toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('PDF ERROR:', error);
    Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
  } finally {
    exportando.value = false;
  }
};

const exportarCSV = () => {
  if (activos.value.length === 0) return Swal.fire('Sin datos', 'No hay activos para exportar.', 'info');

  const headers = ['Código TAMEP', 'Código TAB', 'Nombre', 'Regional', 'Ubicación', 'Custodio', 'Situación', 'Estado', 'Perfil Uso', 'Estado IA', 'Prob. Falla'];
  const rows = activos.value.map(a => [
    a.codigo_tamep, a.codigo_tab || '', a.nombre_especifico,
    a.regional_nombre || '', a.ubicacion_nombre || '',
    a.custodio_actual || 'Sin asignar', a.situacion_activo, a.estado_actual,
    a.perfil_uso || '', a.estado_ia || '',
    a.probabilidad_falla != null ? a.probabilidad_falla.toFixed(1) : ''
  ]);

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Reporte_Activos_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const descargarBackup = async () => {
  if (descargando.value) return;
  descargando.value = true;
  try {
    const res = await api.get('backup/', { responseType: 'blob' });

    // El nombre del archivo viene en el header Content-Disposition
    const disposition = res.headers['content-disposition'] || '';
    const coincide = disposition.match(/filename="?([^";]+)"?/i);
    let nombre = coincide ? coincide[1] : '';
    if (!nombre) {
      const ahora = new Date();
      const p2 = (n) => String(n).padStart(2, '0');
      const sello = `${ahora.getFullYear()}${p2(ahora.getMonth() + 1)}${p2(ahora.getDate())}_${p2(ahora.getHours())}${p2(ahora.getMinutes())}${p2(ahora.getSeconds())}`;
      nombre = `backup_activosfijosdb_${sello}.sql`;
    }

    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error backup:', error);
    let mensaje = 'No se pudo generar el respaldo de la base de datos.';
    const datos = error.response?.data;
    if (datos instanceof Blob) {
      // El error llegó como blob (responseType: 'blob'): se lee y se parsea
      try {
        const cuerpo = JSON.parse(await datos.text());
        if (cuerpo.detail) mensaje = cuerpo.detail;
        else if (cuerpo.mensaje) mensaje = cuerpo.mensaje;
      } catch (e) { /* respuesta no JSON: se mantiene el mensaje genérico */ }
    } else if (datos?.detail) {
      mensaje = datos.detail;
    }
    Swal.fire('Error', mensaje, 'error');
  } finally {
    descargando.value = false;
  }
};

const colorRiesgo = (prob) => {
  if (!prob && prob !== 0) return '';
  if (prob >= 70) return 'text-danger font-weight-bolder';
  if (prob >= 40) return 'text-warning font-weight-bolder';
  return 'text-success';
};

const badgeSituacion = (sit) => {
  const map = {
    'Disponible': 'bg-gradient-info',
    'Asignado': 'bg-gradient-success',
    'Mantenimiento': 'bg-gradient-warning',
    'Baja': 'bg-gradient-danger'
  };
  return map[sit] || 'bg-secondary';
};

onMounted(async () => {
  await cargarParametros();
  await buscar();
});
</script>

<template>
  <div class="container-fluid py-4">
    <div class="card shadow-lg">
      <!-- Header -->
      <div class="card-header pb-0">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-0">Reportes y Estadísticas</h6>
            <p class="text-xs text-secondary mb-0">Consulta avanzada de activos fijos con exportación</p>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-dark mb-0" @click="exportarPDF" :disabled="exportando">
              <i class="fas fa-file-pdf me-1"></i> PDF
            </button>
            <button class="btn btn-sm btn-outline-dark mb-0" @click="exportarCSV">
              <i class="fas fa-file-csv me-1"></i> CSV
            </button>
            <button class="btn btn-sm btn-outline-dark mb-0" @click="descargarBackup" :disabled="descargando">
              <i class="fas fa-database me-1"></i> BackUp
            </button>
          </div>
        </div>

        <!-- Filtros -->
        <div class="row mt-3 g-2">
          <div class="col-md-3">
            <input type="text" class="form-control form-control-sm" placeholder="Buscar código, nombre, serie..."
              v-model="filtros.q" @keyup.enter="buscar">
          </div>
          <div class="col-md-2">
            <select class="form-select form-select-sm" v-model="filtros.regional" @change="buscar">
              <option value="">Todas las regionales</option>
              <option v-for="r in regionales" :key="r.id" :value="r.id">{{ r.nombre }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <select class="form-select form-select-sm" v-model="filtros.grupo_contable" @change="buscar">
              <option value="">Todos los grupos</option>
              <option v-for="g in gruposContables" :key="g.id" :value="g.id">{{ g.nombre }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <select class="form-select form-select-sm" v-model="filtros.tipo_activo" :disabled="!filtros.grupo_contable" @change="buscar">
              <option value="">Todos los tipos</option>
              <option v-for="t in tiposActivo" :key="t.id" :value="t.id">{{ t.nombre }}</option>
            </select>
          </div>
          <div class="col-md-1">
            <select class="form-select form-select-sm" v-model="filtros.situacion" @change="buscar">
              <option value="">Situación</option>
              <option value="Disponible">Disponible</option>
              <option value="Asignado">Asignado</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
          <div class="col-md-1">
            <select class="form-select form-select-sm" v-model="filtros.estado" @change="buscar">
              <option value="">Estado</option>
              <option value="Bueno">Bueno</option>
              <option value="Regular">Regular</option>
              <option value="Malo">Malo</option>
            </select>
          </div>
          <div class="col-md-1">
            <button class="btn btn-sm btn-outline-secondary w-100 mb-0" @click="limpiarFiltros">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <p class="text-xs text-secondary mt-2 mb-0" v-if="!loading">
          <strong>{{ totalResultados }}</strong> activos encontrados
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-3 text-muted">Consultando activos...</p>
      </div>

      <!-- Tabla -->
      <div v-else class="card-body px-0 pt-0 pb-2">
        <div class="table-responsive p-0">
          <table class="table align-items-center mb-0">
            <thead>
              <tr>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Activo</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Regional</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Custodio</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Perfil</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Situación</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Estado</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Estado IA</th>
                <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 text-center">Prob. Falla</th>
                <th class="text-secondary opacity-7"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="activos.length === 0">
                <td colspan="9" class="text-center py-4 text-muted">No se encontraron activos con los filtros aplicados.</td>
              </tr>
              <tr v-for="a in activos" :key="a.id">
                <td>
                  <div class="d-flex px-2 py-1">
                    <div class="d-flex flex-column justify-content-center">
                      <h6 class="mb-0 text-sm">{{ a.nombre_especifico }}</h6>
                      <p class="text-xs text-secondary mb-0">{{ a.codigo_tamep }} {{ a.codigo_tab ? '| ' + a.codigo_tab : '' }}</p>
                    </div>
                  </div>
                </td>
                <td><p class="text-xs font-weight-bold mb-0">{{ a.regional_nombre || '-' }}</p></td>
                <td><p class="text-xs mb-0">{{ a.custodio_actual || 'Sin asignar' }}</p></td>
                <td><p class="text-xs mb-0">{{ a.perfil_uso || '-' }}</p></td>
                <td class="text-center">
                  <span :class="['badge badge-sm', badgeSituacion(a.situacion_activo)]">{{ a.situacion_activo }}</span>
                </td>
                <td class="text-center"><span class="text-xs font-weight-bold">{{ a.estado_actual }}</span></td>
                <td class="text-center"><span class="text-xs">{{ a.estado_ia || '-' }}</span></td>
                <td class="text-center">
                  <span :class="['text-xs', colorRiesgo(a.probabilidad_falla)]">
                    {{ a.probabilidad_falla != null ? a.probabilidad_falla.toFixed(1) + '%' : '-' }}
                  </span>
                </td>
                <td class="align-middle">
                  <router-link :to="`/activo/detalle/${a.id}`" class="text-secondary font-weight-bold text-xs">
                    Ver
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
