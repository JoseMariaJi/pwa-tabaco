// Cargar registros previos o crear array vacío
let registros = JSON.parse(localStorage.getItem("registros")) || [];
let bloqueo = false;
// Elementos
const boton = document.getElementById("boton-rojo");
const contexto = document.getElementById("contexto");
const mensaje = document.getElementById("mensaje");
const contador = document.getElementById("contador");
const ultimo = document.getElementById("ultimo");
const descargar = document.getElementById("descargar");
const APP_VERSION = "v10";  // cambia esto cuando cambies el SW

document.getElementById("version").textContent = APP_VERSION;

// Vibración y registro
boton.addEventListener("click", () => {
    if (contexto.value === "") {
        mensaje.textContent = "Debes seleccionar un contexto";
        mensaje.classList.remove("oculto");
        return;
    }
    if (bloqueo) return; // evita doble pulsación

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
    // después de guardar en localStorage
    bloqueo = true; // activa el bloqueo
    boton.classList.add("bloqueado"); // se pone gris
    actualizarPantalla();
    // desbloquear después de X segundos
    setTimeout(() => {
        bloqueo = false;
        boton.classList.remove("bloqueado"); // vuelve a rojo
    }, 10000); // 3 segundos, ajusta si quieres

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
    navigator.serviceWorker.register("service-worker.js").then(() => {
        navigator.serviceWorker.addEventListener("message", event => {
            if (event.data.action === "reload") {
                console.log("Nueva versión detectada, recargando…");
                location.reload();
            }
        });
    });
}

// Botón para importar CSV
document.getElementById("importarBtn").addEventListener("click", () => {
    document.getElementById("archivoCSV").click();
});

document.getElementById("archivoCSV").addEventListener("change", function() {
    const archivo = this.files[0];
    if (!archivo) return;

    const lector = new FileReader();

    lector.onload = function(e) {
        const texto = e.target.result;
        const lineas = texto.split("\n").map(l => l.trim()).filter(l => l.length > 0);

        // Primera línea es cabecera: fecha;hora;contexto
        const registrosImportados = [];

        for (let i = 1; i < lineas.length; i++) {
            const partes = lineas[i].split(";");
            if (partes.length < 3) continue;

            registrosImportados.push({
                fecha: partes[0],
                hora: partes[1],
                contexto: partes[2]
            });
        }

        // Guardar en localStorage
        localStorage.setItem("registros", JSON.stringify(registrosImportados));

        // Actualizar pantalla
        actualizarPantalla();

        alert("Datos importados correctamente.");
    };

    lector.readAsText(archivo);
});
