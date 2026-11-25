const finalizarProcesoCompleto = async () => {
  if (!formularioExtra.regional || !formularioExtra.usuario) {
    alert("Complete los datos del responsable."); return;
  }
  
  cargando.value = true;
  
  try {
    // 1. Preparamos el contenedor del acta (el mismo HTML que ya diseñamos)
    // Usamos un div temporal que no se vea en pantalla
    const element = document.createElement('div');
    element.innerHTML = generarHTMLActa(); // Esta función la creamos abajo

    // 2. Configuración de html2pdf
    const opt = {
      margin: 1,
      filename: `Acta_${tipoProcesoExtra.value}_${idActivoRecienCreado.value}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // 3. Generamos el PDF como un BLOB (binario) para enviarlo al servidor
    const pdfBlob = await html2pdf().set(opt).from(element).output('blob');

    // 4. Usamos FormData porque vamos a enviar un ARCHIVO (File) al servidor
    const fd = new FormData();
    fd.append('activo', idActivoRecienCreado.value);
    fd.append('tipo', formularioExtra.tipo);
    fd.append('regional', formularioExtra.regional);
    fd.append('gerencia', formularioExtra.gerencia);
    fd.append('cargo', formularioExtra.cargo);
    fd.append('usuario', formularioExtra.usuario);
    fd.append('ubicacion', formularioExtra.ubicacion || formularioActivo.ubicacion_base);
    fd.append('motivo_cambio_o_baja', formularioExtra.motivo_cambio_o_baja);
    fd.append('esta_activa', formularioExtra.tipo === 'Asignacion');
    
    // Aquí está la magia: adjuntamos el PDF generado automáticamente
    fd.append('documento_respaldo', pdfBlob, `Acta_${idActivoRecienCreado.value}.pdf`);

    // 5. Enviamos a Django (Nota: quitamos los JSON, ahora es multipart/form-data)
    await axios.post(`${API_URL}/designaciones/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    procesoFinalizadoExitosa.value = true;
    mostrarModalExtra.value = false;
    
    alert("Proceso finalizado. El acta digital ha sido guardada en el servidor.");

  } catch (error) {
    console.error(error);
    alert("Error al procesar el acta digital.");
  } finally {
    cargando.value = false;
  }
};
const generarHTMLActa = () => {
  const nombreResponsable = opciones.usuarios.find(u => u.id === formularioExtra.usuario)?.nombre_completo || '---';
  const titulo = tipoProcesoExtra.value === 'Baja' ? "ACTA DE BAJA DE ACTIVO" : "ACTA DE ENTREGA DE ACTIVO";
  
  return `
    <div style="font-family: Arial; padding: 40px;">
      <h2 style="color: #004481; text-align: center;">${titulo}</h2>
      <hr>
      <p><b>Fecha:</b> ${new Date().toLocaleDateString()}</p>
      <p><b>Activo:</b> ${formularioActivo.nombre_especifico} (${formularioActivo.codigo_tamep})</p>
      <p><b>Serie:</b> ${formularioActivo.serie}</p>
      <p><b>Responsable:</b> ${nombreResponsable}</p>
      <div style="margin-top: 20px;">
        <p><b>Justificación/Motivo:</b></p>
        <p>${formularioExtra.motivo_cambio_o_baja || 'Entrega de equipo para funciones laborales.'}</p>
      </div>
      <div style="margin-top: 100px; display: flex; justify-content: space-around; text-align: center;">
        <div style="border-top: 1px solid black; width: 200px;">Entregado por</div>
        <div style="border-top: 1px solid black; width: 200px;">Recibido conforme</div>
      </div>
    </div>
  `;
};