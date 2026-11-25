import { jsPDF } from "jspdf";
import logoTamep from "@/assets/img/fondotam-blanco.png"; 
import Swal from "sweetalert2";

export const generarEtiquetaTermica = (activo) => {
  if (!activo || !activo.qrUrl) {
    return Swal.fire("Error", "Faltan datos o el código QR para imprimir.", "warning");
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [80, 30] 
  });

  try { 
    doc.addImage(logoTamep, "PNG", 3, 3, 16, 10); 
  } catch (e) { 
    console.warn("Aviso: Logo no cargado en el PDF."); 
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("EP TRANSPORTE AÉREO MILITAR", 3, 15);

  doc.setLineWidth(0.3);
  doc.line(3, 16.5, 52, 16.5);

  try { 
    doc.addImage(activo.qrUrl, "PNG", 55, 4, 22, 22); 
  } catch (e) { 
    console.warn("Aviso: QR no cargado."); 
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11); 
  doc.text(`COD: ${activo.codigo_tamep || 'S/D'}`, 3, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11); 
  doc.text(`H: ${activo.codigo_tab || 'S/N'}`, 3, 26);
  doc.autoPrint();
  const pdfUrl = doc.output('bloburl');
  const nuevaPestana = window.open(pdfUrl, '_blank');
  if (!nuevaPestana || nuevaPestana.closed || typeof nuevaPestana.closed == 'undefined') {
    Swal.fire({
      title: 'Ventana Bloqueada',
      text: 'Tu navegador bloqueó el PDF de la etiqueta. Por favor, permite las ventanas emergentes para SIAEM.',
      icon: 'warning',
      confirmButtonText: 'Entendido'
    });
  }
};