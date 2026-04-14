// Cargar registros previos o crear array vacío
let registros = JSON.parse(localStorage.getItem("registros")) || [];

// Elementos
const boton = document.getElementById("boton-rojo");
const contexto = document.getElementById("contexto");
const mensaje = document.getElementById("mensaje");
const contador = document.getElementById("contador");
const ultimo = document.getElementById("ultimo");
const descargar = document.getElementById("descargar");

// Vibración y registro
boton.addEventListener("click", () => {
    if (contexto.value === "") {
        mensaje.textContent = "Debes seleccionar un contexto";
        mensaje.classList.remove("oculto");
        return;
    }

    mensaje.classList.add("oculto");

    // Vibración ligera
    if (navigator.vibrate) navigator.vibrate(50);

    const ahora = new Date();
    const fecha = ahora.toISOString().split("T")[0];
    const hora = ahora.toTimeString().split(" ")[0];

    registros.push({
        fecha,
        hora,
        contexto: contexto.value
    });

    localStorage.setItem("registros", JSON.stringify(registros));

    actualizarPantalla();
});

// Actualizar contador y último cigarrillo
function actualizarPantalla() {
    const hoy = new Date().toISOString().split("T")[0];
    const deHoy = registros.filter(r => r.fecha === hoy);

    contador.textContent = `Hoy (${hoy}): ${deHoy.length} cigarrillos`;

    if (deHoy.length > 0) {
        const ultimoReg = deHoy[deHoy.length - 1];
        ultimo.textContent = `Último: ${ultimoReg.hora}`;
    } else {
        ultimo.textContent = "Último: --";
    }
}

actualizarPantalla();

// Descargar CSV
descargar.addEventListener("click", () => {
    let csv = "fecha;hora;contexto\n";
    registros.forEach(r => {
        csv += `${r.fecha};${r.hora};${r.contexto}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const ahora = new Date();
    const nombre = `tabaco_${ahora.toISOString().replace(/[:.]/g, "-")}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();

    URL.revokeObjectURL(url);
});
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
}
