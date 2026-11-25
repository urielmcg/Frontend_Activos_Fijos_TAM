<script setup>
/* eslint-disable */
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from "@/services/api.js";
import logo from "@/assets/img/fondotam-blanco.png";
import { generarFichaTecnicaPDF } from '@/js/reportesActivos';
import { generarEtiquetaTermica } from '@/js/ImpresionEtiqueta.js';

const route = useRoute();
const router = useRouter();
const assetId = route.params.id;
const MEDIA_BASE = "https://siaem.tamep.bo";

// --- ESTADOS ---
const activo = ref(null);
const historial = ref([]);
const cargando = ref(true);
const fotoPrincipalVisible = ref(null);
const lightboxOpen = ref(false);

// --- LÓGICA DE CARRUSEL AUTOMÁTICO ---
const indexImagen = ref(0);
let carruselInterval = null;

const listaImagenes = computed(() => {
    if (!activo.value) return [];
    // Filtramos solo las imágenes que existan en la base de datos
    return [
        activo.value.imagen_activo,
        activo.value.imagen_lateral,
        activo.value.imagen_sn
    ].filter(img => img !== null && img !== undefined && img !== '');
});

const iniciarCarrusel = () => {
    if (listaImagenes.value.length <= 1) return;
    carruselInterval = setInterval(() => {
        indexImagen.value = (indexImagen.value + 1) % listaImagenes.value.length;
        fotoPrincipalVisible.value = obtenerUrlMedia(listaImagenes.value[indexImagen.value]);
    }, 3000);
};

// --- CICLO DE VIDA ---
onMounted(async () => {
    try {
        const [resActivo] = await Promise.all([
            api.get(`gestion-activos/${assetId}/`),
        ]);

        activo.value = resActivo.data;
        // El historial ya viene unificado (Bajas, Transf, Desig) desde el Serializer corregido
        historial.value = resActivo.data.historial_custodios || [];

        if (listaImagenes.value.length > 0) {
            fotoPrincipalVisible.value = obtenerUrlMedia(listaImagenes.value[0]);
            iniciarCarrusel();
        }
    } catch (error) {
        console.error("Error en la carga de datos:", error);
    } finally {
        cargando.value = false;
    }
});

onUnmounted(() => {
    if (carruselInterval) clearInterval(carruselInterval);
});

// --- INTERACCIÓN ---
const toggleLightbox = () => {
    lightboxOpen.value = !lightboxOpen.value;
};

const setFotoManual = (path, index) => {
    // Si el usuario hace clic, detenemos el carrusel para no molestarlo
    if (carruselInterval) clearInterval(carruselInterval);
    fotoPrincipalVisible.value = obtenerUrlMedia(path);
    indexImagen.value = index;
};

const obtenerUrlMedia = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}${path}`;
};

// --- HELPERS VISUALES ---
const formatoMoneda = (valor) => {
    return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(valor || 0);
};

const getIcon = (tipo) => {
    const t = tipo.toUpperCase();
    if (t.includes('ASIGNACIÓN')) return 'fas fa-user-check';
    if (t.includes('BAJA')) return 'fas fa-trash-alt';
    if (t.includes('DEVOLUCIÓN')) return 'fas fa-undo-alt';
    if (t.includes('MEJORA')) return 'fas fa-arrow-up';
    return 'fas fa-exchange-alt';
};

// --- ACCIONES ---
const imprimirFicha = async () => {
    if (activo.value) {
        const nombreDoc = `HOJA_VIDA_${activo.value.codigo_tamep}`;
        await generarFichaTecnicaPDF(activo.value, nombreDoc);
    }
};

const reimprimirQR = () => {
    if (!activo.value) return;
    generarEtiquetaTermica({
        qrUrl: obtenerUrlMedia(activo.value.imagen_qr),
        codigo_tamep: activo.value.codigo_tamep,
        codigo_tab: activo.value.codigo_tab,
        serie: activo.value.serie
    });
};
</script>

<template>
    <div class="container-fluid py-4" v-if="!cargando && activo">

        <div v-if="lightboxOpen" class="lightbox-overlay" @click="toggleLightbox">
            <div class="lightbox-content">
                <span class="close-zoom">&times;</span>
                <img :src="fotoPrincipalVisible" class="img-zoom">
            </div>
        </div>

        <div class="row">
            <div class="col-lg-12 mx-auto">
                <div
                    class="card border-0 shadow-xl border-radius-2xl overflow-hidden animate__animated animate__fadeIn">

                    <div class="header-tamep d-flex justify-content-between align-items-center px-4 py-4">
                        <div class="d-flex align-items-center">
                            <div class="logo-wrapper shadow-sm">
                                <img :src="logo" alt="TAMEP" class="logo-img">
                            </div>
                            <div class="ms-3 text-white">
                                <h4 class="mb-0 font-weight-bolder text-white">HOJA DE VIDA DIGITAL</h4>
                                <div class="d-flex align-items-center mt-1">
                                    <span class="badge bg-white text-dark text-xxs px-3 me-2">{{ activo.tipo_nombre
                                        }}</span>
                                    <span class="text-xs opacity-8"><i class="fas fa-microchip me-1"></i> TAMEP Cloud
                                        Sync</span>
                                </div>
                            </div>
                        </div>
                        <div class="text-end">
                            <h4 class="text-white font-weight-bolder mb-0 ls-1">Codigo: {{ activo.codigo_tamep }}</h4>
                            <h4 class="text-white font-weight-bolder mb-0 ls-1">Historico: {{ activo.codigo_tab }}</h4>
                            <span class="badge bg-gradient-success text-xxs"
                                v-if="activo.situacion_activo === 'Asignado'">ACTIVO EN USO</span>
                            <span class="badge bg-gradient-danger text-xxs" v-else>{{ activo.situacion_activo }}</span>
                        </div>
                    </div>

                    <div class="card-body p-4">
                        <div class="row mb-5">
                            <div class="col-lg-5">
                                <div class="gallery-card">
                                    <div class="main-stage shadow-lg border-radius-lg" @click="toggleLightbox">
                                        <transition name="fade-slide" mode="out-in">
                                            <img :key="fotoPrincipalVisible" :src="fotoPrincipalVisible"
                                                class="img-fluid main-img">
                                        </transition>
                                        <div class="overlay-hint">
                                            <i class="fas fa-search-plus"></i>
                                        </div>
                                    </div>
                                    <div class="thumbnails-container mt-3 d-flex justify-content-center gap-2">
                                        <div v-for="(img, idx) in listaImagenes" :key="idx"
                                            @click="setFotoManual(img, idx)"
                                            :class="['thumb-item', { 'active-thumb': indexImagen === idx }]">
                                            <img :src="obtenerUrlMedia(img)">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-7">
                                <div class="row g-3">
                                    <div class="col-md-6" v-for="stat in [
                                        { label: 'Salud del Equipo', val: (activo.prediccion?.indice_salud_fuzzy || 0) + '%', color: 'info', icon: 'fa-heartbeat' },
                                        { label: 'Probabilidad Falla', val: (activo.prediccion?.probabilidad_falla || 0) + '%', color: 'danger', icon: 'fa-skull-crossbones' },
                                        { label: 'Ciclos Preventivos', val: activo.contador_preventivos, color: 'success', icon: 'fa-sync-alt' },
                                        { label: 'Uso Acumulado', val: activo.horas_uso_actual + ' Hrs', color: 'warning', icon: 'fa-history' }
                                    ]" :key="stat.label">
                                        <div class="stat-card p-3 border-radius-lg border border-1 shadow-none h-100">
                                            <div class="d-flex align-items-center">
                                                <div :class="['icon-box-shape me-3 bg-light-' + stat.color]">
                                                    <i :class="['fas', stat.icon, 'text-' + stat.color]"></i>
                                                </div>
                                                <div>
                                                    <p
                                                        class="text-xxs text-muted font-weight-bolder mb-0 text-uppercase">
                                                        {{ stat.label }}</p>
                                                    <h5 class="font-weight-bolder mb-0">{{ stat.val }}</h5>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="quick-info-box mt-4 p-3 border-radius-xl bg-gray-100 border">
                                    <div class="row align-items-center">
                                        <div class="col-8">
                                            <label class="label-custom">Asignación Actual</label>
                                            <h6 class="text-sm font-weight-bolder mb-1">
                                                <i class="fas fa-user-tie text-primary me-2"></i>{{
                                                activo.custodio_nombre || 'ALMACÉN TÉCNICO' }}
                                            </h6>
                                            <p class="text-xxs text-muted mb-0">
                                                <i class="fas fa-map-marker-alt me-1"></i> {{ activo.regional_nombre }}
                                                | {{ activo.ubicacion_nombre }}
                                            </p>
                                        </div>
                                        <div class="col-4 text-end">
                                            <img :src="obtenerUrlMedia(activo.imagen_qr)"
                                                class="qr-preview-img shadow-sm" @click="reimprimirQR">
                                            <p class="text-xxs text-muted mt-1 mb-0">Verificar QR</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="row mb-4">
                            <div class="col-12">
                                <div class="accordion border-radius-xl overflow-hidden" id="techSpecs">
                                    <div class="accordion-item border-0 bg-gray-100 mb-3">
                                        <h6
                                            class="accordion-header p-3 d-flex align-items-center text-dark font-weight-bolder text-uppercase">
                                            <i class="fas fa-cogs me-3"></i> Ficha Técnica y Especificaciones
                                        </h6>
                                        <div class="p-3 pt-0">
                                            <div class="row">
                                                <div class="col-md-3"><label class="label-custom">Marca / Modelo</label>
                                                    <p class="text-sm font-weight-bold">{{ activo.nombre_especifico }}
                                                    </p>
                                                </div>
                                                <div class="col-md-3"><label class="label-custom">Nro. de Serie</label>
                                                    <p class="text-sm font-weight-bold">{{ activo.serie }}</p>
                                                </div>
                                                <div class="col-md-3"><label class="label-custom">Costo
                                                        Adquisición</label>
                                                    <p class="text-sm font-weight-bold text-success">{{
                                                        formatoMoneda(activo.costo) }}</p>
                                                </div>
                                                <div class="col-md-3"><label class="label-custom">Fecha de Alta</label>
                                                    <p class="text-sm font-weight-bold">{{ activo.fecha_adquisicion }}
                                                    </p>
                                                </div>
                                                <div class="col-12">
                                                    <hr class="horizontal dark">
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="label-custom">Componentes Internos</label>
                                                    <p class="text-xs bg-white p-2 border-radius-md border">{{
                                                        activo.especificaciones }}</p>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="label-custom">Observaciones de Registro</label>
                                                    <p class="text-xs bg-white p-2 border-radius-md border">{{
                                                        activo.descripcion }}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="timeline-section mt-5">
                            <div class="d-flex align-items-center mb-4">
                                <div class="tamep-line-indicator me-3"></div>
                                <h5 class="font-weight-bolder mb-0">TRAZABILIDAD DEL ACTIVO (LOG DE EVENTOS)</h5>
                            </div>

                            <div class="table-responsive border-radius-xl border">
                                <table class="table align-items-center mb-0">
                                    <thead class="bg-dark text-white">
                                        <tr>
                                            <th class="text-xxs font-weight-bolder opacity-9 text-uppercase px-4">Evento
                                                / Fecha</th>
                                            <th class="text-xxs font-weight-bolder opacity-9 text-uppercase">Movimiento
                                                de Custodia (Origen → Destino)</th>
                                            <th
                                                class="text-xxs font-weight-bolder opacity-9 text-uppercase text-center">
                                                Referencia</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <template v-if="historial.length > 0">
                                            <tr v-for="h in historial" :key="h.id" class="history-tr">
                                                <td class="px-4">
                                                    <div class="d-flex align-items-center">
                                                        <div :class="['event-icon-circle me-3', 'bg-' + h.color]">
                                                            <i :class="getIcon(h.tipo)" class="text-white text-xxs"></i>
                                                        </div>
                                                        <div>
                                                            <span class="text-xs font-weight-bold d-block">{{ h.tipo
                                                                }}</span>
                                                            <small class="text-xxs text-muted">{{ h.fecha }}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div
                                                        class="movement-pill d-flex align-items-center justify-content-between p-2 border-radius-lg border">
                                                        <div class="text-center flex-grow-1">
                                                            <label class="text-xxs text-muted d-block mb-0">De:</label>
                                                            <span class="text-xs font-weight-bold text-dark">{{ h.emisor
                                                                }}</span>
                                                        </div>
                                                        <div class="px-3">
                                                            <i class="fas fa-arrow-right text-azul-tamep opacity-4"></i>
                                                        </div>
                                                        <div class="text-center flex-grow-1">
                                                            <label class="text-xxs text-muted d-block mb-0">A:</label>
                                                            <span class="text-xs font-weight-bold text-azul-tamep">{{
                                                                h.receptor }}</span>
                                                        </div>
                                                    </div>
                                                    <p class="text-xxs text-muted mt-1 mb-0 ps-2"><i
                                                            class="fas fa-info-circle me-1"></i>{{ h.detalle }}</p>
                                                </td>
                                                <td class="text-center">
                                                    <span class="text-xs font-weight-bolder text-dark">{{ h.acta
                                                        }}</span>
                                                </td>
                                            </tr>
                                        </template>
                                        <tr v-else>
                                            <td colspan="3" class="text-center py-5">
                                                <i class="fas fa-history fa-2x text-lighter mb-3"></i>
                                                <p class="text-sm text-secondary italic">No se registran movimientos
                                                    previos en el sistema.</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="d-flex justify-content-end align-items-center mt-5 gap-3 pt-3 border-top">
                            <button @click="router.back()" class="btn btn-outline-secondary btn-sm px-4">VOLVER</button>
                            <button @click="$router.push(`/activo/gestion/${activo.id}`)"
                                class="btn btn-dark btn-sm px-4">
                                <i class="fbtn btn-primary btn-sm px-4 bg-azul-tamep"></i> EDITAR
                            </button>
                            <button @click="imprimirFicha" class="btn btn-dark btn-sm px-4">
                                <i class="fas fa-file-pdf me-2"></i>FICHA TÉCNICA PDF
                            </button>
                            <button @click="reimprimirQR" class="btn btn-primary btn-sm px-4 bg-azul-tamep">
                                <i class="fas fa-print me-2"></i>REIMPRIMIR ETIQUETA
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* --- SISTEMA DE DISEÑO TAMEP --- */
.header-tamep {
    background: linear-gradient(135deg, #003366 0%, #001d3d 100%);
}

.bg-azul-tamep {
    background-color: #003366 !important;
}

.text-azul-tamep {
    color: #003366 !important;
}

.logo-wrapper {
    background: white;
    padding: 6px 14px;
    border-radius: 12px;
}

.logo-img {
    max-height: 40px;
}

/* --- GALERÍA & CARRUSEL --- */
.main-stage {
    height: 350px;
    background: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    cursor: zoom-in;
    position: relative;
    border: 1px solid #eee;
}

.main-img {
    max-height: 100%;
    object-fit: contain;
}

.overlay-hint {
    position: absolute;
    bottom: 15px;
    right: 15px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 5px 10px;
    border-radius: 50%;
    font-size: 12px;
}

.thumb-item {
    width: 65px;
    height: 50px;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: 0.3s;
}

.thumb-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.active-thumb {
    border-color: #003366;
    transform: scale(1.1);
}

/* --- LIGHTBOX (ZOOM) --- */
.lightbox-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: zoom-out;
}

.img-zoom {
    max-width: 90%;
    max-height: 90%;
    border-radius: 8px;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
}

.close-zoom {
    position: absolute;
    top: 30px;
    right: 50px;
    color: white;
    font-size: 50px;
    cursor: pointer;
}

/* --- CARDS & STATS --- */
.stat-card {
    transition: all 0.3s ease;
    background: white;
}

.stat-card:hover {
    transform: translateY(-5px);
    border-color: #003366 !important;
}

.icon-box-shape {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.bg-light-info {
    background: #e3f2fd;
}

.bg-light-danger {
    background: #ffebee;
}

.bg-light-success {
    background: #e8f5e9;
}

.bg-light-warning {
    background: #fff8e1;
}

.qr-preview-img {
    width: 100px;
    cursor: pointer;
    border-radius: 10px;
    background: white;
    padding: 5px;
}

/* --- HISTORIAL TABLE --- */
.history-tr {
    transition: 0.2s;
}

.history-tr:hover {
    background-color: #f8f9fa;
}

.event-icon-circle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.movement-pill {
    background: #ffffff;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}

.tamep-line-indicator {
    width: 5px;
    height: 30px;
    background: #003366;
    border-radius: 10px;
}

/* --- ANIMACIONES --- */
.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.5s ease;
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateX(20px);
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateX(-20px);
}

.label-custom {
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #8392ab;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
}

.ls-1 {
    letter-spacing: 1.5px;
}

.italic {
    font-style: italic;
}
</style>