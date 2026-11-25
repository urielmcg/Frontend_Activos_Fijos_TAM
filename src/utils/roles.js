export const ROLES = {
  ADMIN_INFORMATICO: 'admin_informatico',
  ADMIN_PRINCIPAL: 'admin_principal',
  ADMIN_REGIONAL: 'admin_regional',
  USUARIO: 'usuario',
  CONSULTOR: 'consultor',
};

export function getRol() {
  return localStorage.getItem('rol') || 'usuario';
}

// Mapa: ruta del sidebar -> roles que pueden verla/accederla
const MENU_PERMISOS = {
  'dashboard-default':       ['admin_informatico', 'admin_principal', 'admin_regional', 'usuario', 'consultor'],
  'Gestion de Activos':      ['admin_informatico', 'admin_principal', 'admin_regional', 'usuario', 'consultor'],
  'Nuevos Activos':          ['admin_informatico', 'admin_principal', 'admin_regional', 'consultor'],
  'Asignar Activos':         ['admin_informatico', 'admin_principal', 'admin_regional', 'consultor'],
  'Transferencias':          ['admin_informatico', 'admin_principal', 'admin_regional'],
  'telemetria':              ['admin_informatico', 'admin_principal'],
  'Reportes':                ['admin_informatico', 'admin_principal', 'admin_regional'],
  'Monitoreo':               ['admin_informatico', 'admin_principal'],
  'solicitud-mantenimiento': ['admin_informatico', 'admin_principal', 'admin_regional', 'usuario'],
  'Solicitud-mantenimiento': ['admin_informatico', 'admin_principal', 'admin_regional', 'usuario'],
  'Historial':               ['admin_informatico', 'admin_principal', 'admin_regional'],
  'modulo-predictivo':       ['admin_informatico'],
  'Configuracion-difusa':    ['admin_informatico'],
  'configuracion-difusa':    ['admin_informatico'],
  'Nuevos Usuarios':         ['admin_informatico', 'admin_principal'],
  'Personal':                ['admin_informatico', 'admin_principal'],
  'profile':                 ['admin_informatico', 'admin_principal', 'admin_regional', 'usuario', 'consultor'],
  'auditoria':               ['admin_informatico', 'admin_principal'],
};

export function tieneAcceso(ruta) {
  const rol = getRol();
  const rolesPermitidos = MENU_PERMISOS[ruta];
  if (!rolesPermitidos) return true;
  return rolesPermitidos.includes(rol);
}

// Para secciones completas del sidebar (encabezados)
const SECCIONES = {
  activos_fijos: ['admin_informatico', 'admin_principal', 'admin_regional', 'usuario', 'consultor'],
  soporte:       ['admin_informatico', 'admin_principal', 'admin_regional', 'usuario'],
  ia:            ['admin_informatico'],
  usuarios:      ['admin_informatico', 'admin_principal'],
};

export function seccionVisible(seccion) {
  const rol = getRol();
  return (SECCIONES[seccion] || []).includes(rol);
}
