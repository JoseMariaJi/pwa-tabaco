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
const APP_VERSION = "v20";  // cambia esto cuando cambies el SW

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

/*boton de mostrar grafico*/
document.getElementById("mostrargrafico").addEventListener("click", () => {
    mostrarGrafico();
});


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
        actualizarGrafico();
        alert("Datos importados correctamente.");
    };

    lector.readAsText(archivo);
});


/* GRAFICO */
let grafico = null;

const coloresContexto = {
    "Ordenador": "#4A90E2",
    "Descanso": "#7ED321",
    "Pelicula": "#F5A623",
    "Social": "#BD10E0",
    "Post-ingesta": "#D0021B",
    "Otro": "#9B9B9B"
};

function mostrarGrafico() {
    document.getElementById("pantalla-principal").style.display = "none";
    document.getElementById("pantalla-grafico").style.display = "block";

    actualizarGrafico();
}

document.getElementById("volver-principal").addEventListener("click", () => {
    document.getElementById("pantalla-grafico").style.display = "none";
    document.getElementById("pantalla-principal").style.display = "block";
});

document.getElementById("selector-periodo").addEventListener("change", actualizarGrafico);
document.getElementById("selector-contexto").addEventListener("change", actualizarGrafico);

function actualizarGrafico() {
    const periodo = document.getElementById("selector-periodo").value;
    const contexto = document.getElementById("selector-contexto").value;

    const { labels, datosPorContexto } = calcularDatos(periodo);

    // Construir datasets
    let datasets = [];

    if (contexto === "todos") {
        // Todos los contextos → barras apiladas
        for (let ctx in datosPorContexto) {
            datasets.push({
                label: ctx,
                data: datosPorContexto[ctx],
                backgroundColor: coloresContexto[ctx],
                stack: "stack1"
            });
        }
    } else {
        // Solo un contexto → un solo dataset
        datasets.push({
            label: contexto,
            data: datosPorContexto[contexto],
            backgroundColor: coloresContexto[contexto],
            stack: "stack1"
        });
    }

    // Destruir gráfico previo
    if (grafico) grafico.destroy();
    const canvas = document.getElementById("canvas-grafico");
canvas.style.width = "2000px";   // o el ancho que quieras
canvas.width = 2000;             // MUY IMPORTANTE: fijar el width real del canvas


    const ctx = document.getElementById("canvas-grafico").getContext("2d");

    grafico = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets
        },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: "#000",
                    anchor: "center",
                    align: "center",
                    font: { size: 12 },
                    formatter: (value, ctx) => {
                        if (value <= 0) return "";

                        // Calcular total del día (suma de todos los contextos)
                        let total = 0;
                        ctx.chart.data.datasets.forEach(ds => {
                            total += ds.data[ctx.dataIndex];
                        });

                        // Calcular porcentaje
                        let pct = (value / total * 100).toFixed(0);

                        return `${value} (${pct}%)`;
                    }

                }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true }
            }
        },
        plugins: [ChartDataLabels]
    });
// Generar eje Y fijo según el máximo del gráfico
const maxY = grafico.scales.y.max;
grafico.update();
if (contexto === "todos") {
    document.getElementById("eje-y-fijo").style.display = "block";
    generarEjeY(grafico.scales.y.max);
} else {
    document.getElementById("eje-y-fijo").style.display = "none";
}

    // Scroll al final
    const cont = document.getElementById("contenedor-grafico");
    setTimeout(() => {
        cont.scrollLeft = cont.scrollWidth;
    }, 50);
}


/* calculo de periodos */
function calcularDatos(periodo) {
    const ahora = new Date();
    let labels = [];
    let datosPorContexto = {
        "Ordenador": [],
        "Descanso": [],
        "Pelicula": [],
        "Social": [],
        "Post-ingesta": [],
        "Otro": []
    };

    function formatearFecha(d) {
        return d.toISOString().split("T")[0];
    }

    if (periodo === "dia") {
        for (let i = 15; i >= 0; i--) {
            let d = new Date();
            d.setDate(ahora.getDate() - i);
            let fecha = formatearFecha(d);
            labels.push(fecha);

            // Inicializar
            for (let ctx in datosPorContexto) datosPorContexto[ctx].push(0);

            registros.forEach(r => {
                if (r.fecha === fecha) {
                    datosPorContexto[r.contexto][labels.length - 1]++;
                }
            });
        }
    }

    if (periodo === "semana") {
    // Obtener la semana ISO actual
    const actual = obtenerSemanaISO(ahora);

    // Generar las últimas 6 semanas
    let semanas = [];
    for (let i = 5; i >= 0; i--) {
        let year = actual.year;
        let week = actual.week - i;

        // Si la semana es <= 0, retrocedemos al año anterior
        if (week <= 0) {
            year--;
            const semanasAñoAnterior = obtenerSemanaISO(new Date(year, 11, 31)).week;
            week = semanasAñoAnterior + week;
        }

        semanas.push({ year, week });
        labels.push(`${year}-W${week}`);
    }

    // Inicializar datos
    semanas.forEach(() => {
        for (let ctx in datosPorContexto) datosPorContexto[ctx].push(0);
    });

    // Rellenar datos desde registros
    registros.forEach(r => {
        const { year, week } = obtenerSemanaISO(r.fecha);
        const idx = semanas.findIndex(s => s.year === year && s.week === week);
        if (idx !== -1) {
            datosPorContexto[r.contexto][idx]++;
        }
    });
}


    return { labels, datosPorContexto };
}

function obtenerSemanaISO(fecha) {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);

    // Jueves de la semana actual
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));

    const semana1 = new Date(d.getFullYear(), 0, 4);
    const diff = (d - semana1) / 86400000;

    return {
        year: d.getFullYear(),
        week: 1 + Math.floor(diff / 7)
    };
}

function generarEjeY(max) {
    const eje = document.getElementById("eje-y-fijo");
    eje.innerHTML = "";

    const pasoNumero = 5;  // número cada 5
    const pasoRaya = 1;    // raya cada 1

    // Coordenadas reales del gráfico
    const top = grafico.chartArea.top;
    const bottom = grafico.chartArea.bottom;

    // Coordenada exacta del valor 0 en el canvas
    const y0 = grafico.scales.y.getPixelForValue(0);

    // Altura útil desde el valor máximo hasta el 0 real
    const alturaUtil = y0 - top;

    // Unidades desde max hasta 0
    const numUnidades = max;

    // Altura por unidad real
    const alturaUnidad = alturaUtil / numUnidades;

    // Generar desde max hasta 0
    for (let v = max; v >= 0; v -= pasoRaya) {
        const div = document.createElement("div");
        div.style.height = alturaUnidad + "px";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "flex-end";

        // Número solo cada 5
        const numero = (v % pasoNumero === 0)
            ? `<span>${v}</span>`
            : `<span style="width:20px;"></span>`;

        div.innerHTML = `
            ${numero}
            <span class="raya"></span>
        `;

        eje.appendChild(div);
    }
}
