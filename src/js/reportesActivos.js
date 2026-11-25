import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from "@/assets/img/fondotam-blanco.png";
/* eslint-disable */
const cargarImagen = (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
};

export const generarFichaTecnicaPDF = async (activo, nombreArchivo) => {
    const doc = jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });
    const API_URL = "https://siaem.tamep.bo"; 
    const azulTamep = [0, 51, 102];

    // 1. CARGA DE TODAS LAS IMÁGENES (Las 3 del activo + QR + Logo)
    const prepararUrl = (path) => path ? (path.startsWith('http') ? path : API_URL + path) : null;

    const [imgLogo, imgQR, img1, img2, img3] = await Promise.all([
        cargarImagen(logo),
        cargarImagen(prepararUrl(activo.imagen_qr)),
        cargarImagen(prepararUrl(activo.imagen_activo)),
        cargarImagen(prepararUrl(activo.imagen_lateral)),
        cargarImagen(prepararUrl(activo.imagen_sn))
    ]);

    // --- ENCABEZADO ---
    if (imgLogo) doc.addImage(imgLogo, 'PNG', 15, 10, 22, 14);
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(azulTamep[0], azulTamep[1], azulTamep[2]);
    doc.text("EMPRESA PÚBLICA - TAMEP", 45, 14);
    doc.setFontSize(7).setTextColor(100);
    doc.text("SISTEMA DE GESTIÓN DE ACTIVOS TAMEP-CLOUD", 45, 19);

    // Cuadro Código TAMEP
    doc.setDrawColor(azulTamep[0], azulTamep[1], azulTamep[2]).setLineWidth(0.5).rect(155, 10, 45, 15);
    doc.setFontSize(7).text("CÓDIGO UNICO", 177.5, 14, { align: "center" });
    doc.setFontSize(11).text(activo.codigo_tamep, 177.5, 21, { align: "center" });

    doc.setTextColor(0).setFontSize(14).text("HOJA DE VIDA Y FICHA TÉCNICA", 105, 35, { align: "center" });
    doc.setLineWidth(0.2).line(15, 37, 200, 37);

    // --- SECCIÓN 1: DATOS ---
    autoTable(doc, {
        startY: 40,
        margin: { left: 15, right: 15 },
        theme: 'striped',
        headStyles: { fillColor: azulTamep, fontSize: 8 },
        head: [['1. IDENTIFICACIÓN DEL ACTIVO FIJO']],
        body: [
            [`Descripción: ${activo.nombre_especifico}`],
            [`Categoría: ${activo.tipo_nombre}  |  Nro. Serie: ${activo.serie || 'S/N'}`],
            [`Ubicación: ${activo.regional_nombre} - ${activo.ubicacion_nombre}`]
        ],
        styles: { fontSize: 8, cellPadding: 2 }
    });

    // --- SECCIÓN 2: GALERÍA DE IMÁGENES (TRIPLE) ---
    let yPos = doc.lastAutoTable.finalY + 5;
    doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(azulTamep[0], azulTamep[1], azulTamep[2]);
    doc.text("2. REGISTRO FOTOGRÁFICO Y EVIDENCIA", 15, yPos);

    // Layout: 3 imágenes en fila + QR a la derecha
    const imgW = 43; // Ancho de cada foto
    const imgH = 35; // Alto de cada foto
    const gap = 3;   // Espacio entre fotos

    // Dibujar los 3 contenedores de fotos
    const fotos = [img1, img2, img3];
    const etiquetas = ["VISTA FRONTAL", "VISTA LATERAL / PUERTOS", "PLACA / S.N."];

    fotos.forEach((img, i) => {
        const x = 15 + (i * (imgW + gap));
        doc.setDrawColor(230).rect(x, yPos + 2, imgW, imgH); // Recuadro gris
        if (img) {
            doc.addImage(img, 'JPEG', x + 1, yPos + 3, imgW - 2, imgH - 2, undefined, 'FAST');
        } else {
            doc.setFontSize(6).setTextColor(150);
            doc.text("NO DISPONIBLE", x + (imgW/2), yPos + (imgH/2), { align: "center" });
        }
        doc.setFontSize(5).setTextColor(100);
        doc.text(etiquetas[i], x + (imgW/2), yPos + imgH + 5, { align: "center" });
    });

    // Contenedor QR (Más grande para que sea escaneable)
    const qrSize = 35;
    const qrX = 15 + (3 * (imgW + gap)) + 2; // Al lado de las 3 fotos
    doc.setDrawColor(azulTamep[0], azulTamep[1], azulTamep[2]).rect(158, yPos + 2, 42, imgH + 5);
    if (imgQR) {
        doc.addImage(imgQR, 'PNG', 164, yPos + 5, 30, 30);
        doc.setFontSize(6).text("VALIDACIÓN DIGITAL", 179, yPos + 40, { align: "center" });
    }

    // --- SECCIÓN 3: HISTORIAL (FULL WIDTH) ---
    yPos += 50;
    doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(azulTamep[0], azulTamep[1], azulTamep[2]);
    doc.text("3. HISTORIAL DE MOVIMIENTOS Y TRAZABILIDAD", 15, yPos);

    const dataHistorial = (activo.historial_custodios || []).map(h => [
        { content: `${h.fecha}\nActa: ${h.acta}`, styles: { fontStyle: 'bold' } },
        `${h.tipo}\n${h.detalle}`,
        `${h.emisor} >> ${h.receptor}`
    ]);

    autoTable(doc, {
        startY: yPos + 3,
        margin: { left: 15, right: 15 },
        theme: 'grid',
        headStyles: { fillColor: [50, 50, 50], fontSize: 7 },
        head: [['FECHA / ACTA', 'EVENTO / OBSERVACIÓN', 'FLUJO DE CUSTODIA']],
        body: dataHistorial,
        styles: { fontSize: 7 },
        columnStyles: { 0: { cellWidth: 35 }, 2: { cellWidth: 55 } }
    });

    // --- SECCIÓN 4: FIRMAS ---
    const pageHeight = doc.internal.pageSize.height;
    yPos = pageHeight - 40;
    doc.setDrawColor(0).setLineWidth(0.1).line(25, yPos, 85, yPos); 
    doc.line(125, yPos, 185, yPos);
    doc.setFontSize(8).setFont("helvetica", "bold").text("RESPONSABLE ACTIVOS", 55, yPos + 5, { align: "center" });
    doc.text("CUSTODIO ASIGNADO", 155, yPos + 5, { align: "center" });

    doc.save(`${nombreArchivo}.pdf`);
};