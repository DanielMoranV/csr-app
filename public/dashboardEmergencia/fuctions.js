// ─── ESTADO ─────────────────────────────────────────────────────────────────
let allData = [],
  filteredData = [];
let currentMetric = "monto",
  currentPieMetric = "cantidad";
let currentRankMetric = "monto",
  currentRankMetricEspec = "monto",
  currentRankMetricCia = "monto";
let showLabels = false,
  isTableView = false;
let mainChart = null,
  pieChart = null;
let loadCount = 0; // Bug 4: rastrear cargas

const monthNames = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];
const fCurrency = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    v,
  );
const fNumber = (v) => new Intl.NumberFormat("es-PE").format(v);

Chart.register(ChartDataLabels);

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initUI();
  loadDefaultExcel();

  // Bug 4 fix: listener registrado una sola vez aquí
  document.getElementById("excelInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById("fileName").textContent = file.name;
    const reader = new FileReader();
    reader.onload = (evt) => processData(evt.target.result, file.name);
    reader.readAsArrayBuffer(file);
  });
});

// M8: initUI genera tooltips con cantidad de registros (se actualiza en applyFilters)
function initUI() {
  const container = document.getElementById("monthFilters");
  monthNames.forEach((m, i) => {
    container.innerHTML += `
            <label id="monthLabel_${i + 1}" title="${m}" class="relative cursor-pointer group">
                <input type="checkbox" value="${i + 1}" checked onchange="applyFilters()" class="hidden peer">
                <div class="flex items-center justify-center py-2 px-1 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 peer-checked:bg-sky-600 peer-checked:border-sky-600 peer-checked:text-white hover:border-sky-300 transition-all duration-300 shadow-sm peer-checked:shadow-md peer-checked:shadow-sky-200">
                    <span class="text-[9px] font-[800] uppercase">${m}</span>
                </div>
            </label>
        `;
  });
}

// ─── CARGA EXCEL ─────────────────────────────────────────────────────────────
async function loadDefaultExcel() {
  const filename = "DATA_VENTAS_2025_2026.xlsx";
  showStatus("SINCRONIZANDO CON BASE DE DATOS...", "blue");
  try {
    const response = await fetch(filename);
    if (!response.ok) throw new Error();
    const buffer = await response.arrayBuffer();
    processData(buffer, filename);
    document.getElementById("fileName").textContent = filename;
  } catch (err) {
    showStatus("ESPERANDO CARGA DE ARCHIVO LOCAL", "blue");
  }
}

function processData(data, name) {
  try {
    const workbook = XLSX.read(data, { type: "array" });
    const json = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
    );

    allData = json.map((row) => {
      let d;
      if (typeof row.fecha === "number") {
        // Corrección: extraer año, mes y día en UTC para evitar el desfase de zona horaria local
        const utc = new Date((Math.floor(row.fecha) - 25569) * 86400 * 1000);
        d = new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
      } else {
        d = new Date(row.fecha);
        // Si la fecha es un string ISO ("2025-01-01"), en JS se asume UTC. Lo corregimos:
        if (typeof row.fecha === "string" && row.fecha.includes("-")) {
          d = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
        }
      }
      return {
        ...row,
        year: d.getFullYear(),
        mes: parseInt(row.mes) || d.getMonth() + 1,
        importe: parseFloat(row.importe) || 0,
        area: (row.area || "GENERAL").toUpperCase(),
        // En el Excel la columna de médicos viene llamada "servicio" o "medico"
        medico: (row.servicio || row.medico || "")
          .toString()
          .trim()
          .toUpperCase(),
        cod_seg: (row.cod_seg || "").toString().trim(),
        cia: (row.cia || "").toString().trim().toUpperCase(),
        isParticular:
          row.cia && row.cia.toString().toUpperCase().includes("PARTICULAR"),
        _rawDate: d,
      };
    });

    loadCount++;
    setupFilters();
    applyFilters();

    // Mostrar elementos
    [
      "filterPanel",
      "kpiSection",
      "chartMainContainer",
      "chartPieContainer",
      "tableSection",
      "kpiDivider",
      "chartDivider",
      "tableDivider",
      "rankingSection",
      "rankingDivider",
      "ciaSection",
      "ciaDivider",
      "dataFooter",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("hidden");
    });

    // Bug 2 fix: aplicar display:grid explícito al kpiSection
    const kpi = document.getElementById("kpiSection");
    kpi.style.display = "grid";
    kpi.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
    kpi.style.gap = "2rem";
    kpi.style.marginBottom = "3rem";

    // M6: footer de metadatos
    updateFooter(name);

    showStatus("BASE DE DATOS ACTUALIZADA", "green");
  } catch (err) {
    showStatus("ERROR AL PROCESAR ESTRUCTURA CLÍNICA", "red");
  }
}

// ─── FILTROS ─────────────────────────────────────────────────────────────────
function setupFilters() {
  const years = [...new Set(allData.map((d) => d.year))]
    .filter((y) => !isNaN(y))
    .sort();
  const yearContainer = document.getElementById("yearFilters");
  yearContainer.innerHTML = "";
  years.forEach((yr) => {
    yearContainer.innerHTML += `
            <label class="flex items-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-white hover:shadow-lg transition-all duration-300">
                <input type="checkbox" value="${yr}" checked onchange="applyFilters()" class="mr-2 accent-sky-700 scale-[1.1]">
                <span class="text-[11px] font-bold text-slate-600">${yr}</span>
            </label>
        `;
  });

  const areas = [...new Set(allData.map((d) => d.area))].sort();
  const areaSelect = document.getElementById("areaSelect");
  areaSelect.innerHTML = '<option value="all">TODAS LAS UNIDADES</option>';
  areas.forEach(
    (a) => (areaSelect.innerHTML += `<option value="${a}">${a}</option>`),
  );

  // Bug 4 fix: remover listener previo antes de añadir nuevo
  const newSelect = areaSelect.cloneNode(true);
  areaSelect.parentNode.replaceChild(newSelect, areaSelect);
  newSelect.addEventListener("change", applyFilters);
}

function toggleAllMonths() {
  const checkboxes = document.querySelectorAll("#monthFilters input");
  // Verificamos si todos están marcados
  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
  // Si todos están marcados, los desmarcamos. Si no, los marcamos todos.
  checkboxes.forEach((cb) => (cb.checked = !allChecked));
  applyFilters();
}

function applyFilters() {
  const selYears = Array.from(
    document.querySelectorAll("#yearFilters input:checked"),
  ).map((i) => parseInt(i.value));
  const selMonths = Array.from(
    document.querySelectorAll("#monthFilters input:checked"),
  ).map((i) => parseInt(i.value));
  const selArea = document.getElementById("areaSelect").value;

  filteredData = allData.filter(
    (d) =>
      selYears.includes(d.year) &&
      selMonths.includes(d.mes) &&
      (selArea === "all" || d.area === selArea),
  );

  // M8: actualizar tooltips de mes con conteo
  monthNames.forEach((_, i) => {
    const monthNum = i + 1;
    const count = filteredData.filter((d) => d.mes === monthNum).length;
    const lbl = document.getElementById(`monthLabel_${monthNum}`);
    if (lbl) lbl.title = `${monthNames[i]}: ${fNumber(count)} registros`;
  });

  updateKPIs();
  // Bug 3 fix: pasar copia del array para evitar mutación por sort
  updateMainChart(selYears, [...selMonths]);
  updatePieChart();
  updateTable();
  updateRanking();
  updateRankingEspec();
  updateRankingCia();
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
function updateKPIs() {
  const total = filteredData.reduce((s, r) => s + r.importe, 0);
  const count = filteredData.length;
  const areas = [...new Set(filteredData.map((d) => d.area))].length;

  // M12: animación count-up
  animateCountUp("kpiTotal", total, (v) => fCurrency(v));
  animateCountUp("kpiCount", count, (v) => fNumber(Math.round(v)));
  animateCountUp("kpiAvg", count > 0 ? total / count : 0, (v) => fCurrency(v));
  animateCountUp("kpiAreas", areas, (v) => Math.round(v).toString());
}

// M12: count-up numérico
function animateCountUp(id, targetValue, formatter) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("kpi-animate");
  void el.offsetWidth; // reflow para reiniciar animación
  el.classList.add("kpi-animate");
  const duration = 600,
    steps = 30,
    stepTime = duration / steps;
  let current = 0,
    step = 0;
  const increment = targetValue / steps;
  const timer = setInterval(() => {
    step++;
    current = step < steps ? increment * step : targetValue;
    el.textContent = formatter(current);
    if (step >= steps) clearInterval(timer);
  }, stepTime);
}

// ─── MÉTRICA PRINCIPAL ────────────────────────────────────────────────────────
// Segmented control: clases seg-btn / seg-btn-active
function setMetric(m) {
  currentMetric = m;
  document.getElementById("btnMonto").className =
    m === "monto" ? "seg-btn seg-btn-active" : "seg-btn";
  document.getElementById("btnCant").className =
    m === "cantidad" ? "seg-btn seg-btn-active" : "seg-btn";
  applyFilters();
}

// Bug 7 fix: setPieMetric sincroniza estado visual con las mismas clases que setMetric
function setPieMetric(m) {
  currentPieMetric = m;
  document.getElementById("btnPieMonto").className =
    m === "monto" ? "seg-btn seg-btn-active" : "seg-btn";
  document.getElementById("btnPieCant").className =
    m === "cantidad" ? "seg-btn seg-btn-active" : "seg-btn";
  updatePieChart();
}

function toggleDataLabels() {
  showLabels = !showLabels;
  document.getElementById("btnLabels").className = showLabels
    ? "btn-labels btn-labels-active"
    : "btn-labels";
  applyFilters();
}

function toggleView() {
  isTableView = !isTableView;
  document.getElementById("mainChartWrapper").classList.toggle("hidden");
  document.getElementById("matrixTableWrapper").classList.toggle("hidden");
  document.getElementById("viewText").textContent = isTableView
    ? "Gráfico"
    : "Matriz";
  document.getElementById("viewIcon").textContent = isTableView ? "📊" : "📋";
  if (isTableView) updateMatrixTable();
}

// ─── GRÁFICO PRINCIPAL ────────────────────────────────────────────────────────
function updateMainChart(years, months) {
  // Bug 3 fix: sortedMonths es copia local, no muta el parámetro
  const sortedMonths = [...months].sort((a, b) => a - b);
  const ctx = document.getElementById("mainChart").getContext("2d");
  const colors = ["#0369a1", "#64748b", "#14b8a6", "#d97706"];

  const datasets = years.map((y, i) => {
    const data = sortedMonths.map((m) => {
      const group = filteredData.filter((d) => d.year === y && d.mes === m);
      return currentMetric === "monto"
        ? group.reduce((s, r) => s + r.importe, 0)
        : group.length;
    });
    return {
      label: `Año ${y}`,
      data,
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length] + "18",
      borderWidth: 3,
      tension: 0.45,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 8,
      pointBackgroundColor: "#fff",
      pointBorderWidth: 3,
    };
  });

  if (mainChart) mainChart.destroy();
  mainChart = new Chart(ctx, {
    type: "line",
    data: { labels: sortedMonths.map((m) => monthNames[m - 1]), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            padding: 25,
            font: { size: 11, weight: "bold" },
          },
        },
        datalabels: {
          display: showLabels,
          align: "top",
          backgroundColor: "#fff",
          borderRadius: 8,
          color: "#0f172a",
          font: { size: 10, weight: "800" },
          offset: 12,
          padding: 6,
          shadowBlur: 10,
          shadowColor: "rgba(0,0,0,0.1)",
          // M5: formato S/ con espacio y K
          formatter: (v) =>
            currentMetric === "monto"
              ? `S/ ${Math.round(v / 1000)}K`
              : fNumber(v),
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#f0f6ff", drawBorder: false },
          ticks: {
            font: { size: 10, weight: "600" },
            color: "#94a3b8",
            // M5: callback con S/ y espacio
            callback: (v) =>
              currentMetric === "monto" ? `S/ ${v / 1000}K` : v,
          },
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11, weight: "700" }, color: "#64748b" },
        },
      },
    },
  });
  if (isTableView) updateMatrixTable();
}

// ─── MATRIZ ───────────────────────────────────────────────────────────────────
function updateMatrixTable() {
  // Bug 6 fix: usar solo los meses seleccionados, no los 12
  const selMonths = Array.from(
    document.querySelectorAll("#monthFilters input:checked"),
  )
    .map((i) => parseInt(i.value))
    .sort((a, b) => a - b);
  const years = [...new Set(filteredData.map((d) => d.year))]
    .filter((y) => !isNaN(y))
    .sort();
  const head = document.getElementById("matrixHead");
  const body = document.getElementById("matrixBody");

  let headHTML = `<tr><th class="px-8 py-5 text-left">Periodo</th>`;
  years.forEach(
    (y) => (headHTML += `<th class="px-8 py-5 text-right">${y}</th>`),
  );
  headHTML += `</tr>`;
  head.innerHTML = headHTML;

  let bodyHTML = "";
  selMonths.forEach((m) => {
    bodyHTML += `<tr class="hover:bg-sky-50/30 transition-all"><td class="px-8 py-4 font-black text-slate-800">${monthNames[m - 1]}</td>`;
    years.forEach((y) => {
      const val = filteredData
        .filter((d) => d.year === y && d.mes === m)
        .reduce((s, r) => s + (currentMetric === "monto" ? r.importe : 1), 0);
      bodyHTML += `<td class="px-8 py-4 text-right font-bold text-slate-500">${currentMetric === "monto" ? fCurrency(val) : fNumber(val)}</td>`;
    });
    bodyHTML += `</tr>`;
  });
  body.innerHTML = bodyHTML;
}

// ─── DONUT ────────────────────────────────────────────────────────────────────
function updatePieChart() {
  let pVal, sVal;
  if (currentPieMetric === "monto") {
    pVal = filteredData
      .filter((d) => d.isParticular)
      .reduce((s, r) => s + r.importe, 0);
    sVal = filteredData
      .filter((d) => !d.isParticular)
      .reduce((s, r) => s + r.importe, 0);
  } else {
    pVal = filteredData.filter((d) => d.isParticular).length;
    sVal = filteredData.length - pVal;
  }
  const total = pVal + sVal;
  const ctx = document.getElementById("pieChart").getContext("2d");
  if (pieChart) pieChart.destroy();

  // Bug 5 fix: desactivar datalabels explícitamente en el donut
  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Particular", "Seguros"],
      datasets: [
        {
          data: [pVal, sVal],
          backgroundColor: ["#0369a1", "#bae6fd"],
          borderWidth: 0,
          hoverOffset: 20,
        },
      ],
    },
    options: {
      cutout: "80%",
      plugins: {
        legend: { display: false },
        datalabels: { display: false }, // Bug 5 fix
      },
    },
  });

  // M4: actualizar centro del donut
  const donutTotal = document.getElementById("donutTotal");
  const donutLabel = document.getElementById("donutLabel");
  if (donutTotal && donutLabel) {
    donutTotal.textContent =
      currentPieMetric === "monto" ? fCurrency(total) : fNumber(total);
    donutLabel.textContent =
      currentPieMetric === "monto" ? "Facturación" : "Atenciones";
  }

  const pP = total > 0 ? ((pVal / total) * 100).toFixed(1) : 0;
  const pS = total > 0 ? ((sVal / total) * 100).toFixed(1) : 0;

  document.getElementById("pieLegend").innerHTML = `
        <div class="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div class="flex items-center gap-4">
                <span class="w-3 h-3 rounded-full bg-sky-700 shadow-lg shadow-sky-200"></span>
                <span class="font-bold text-slate-600 text-xs">PARTICULAR</span>
            </div>
            <div class="text-right leading-tight">
                <span class="font-black text-slate-900 text-sm">${pP}%</span><br>
                <span class="text-[9px] text-slate-400 font-bold tracking-wider">${currentPieMetric === "monto" ? fCurrency(pVal) : fNumber(pVal)}</span>
            </div>
        </div>
        <div class="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div class="flex items-center gap-4">
                <span class="w-3 h-3 rounded-full bg-sky-200"></span>
                <span class="font-bold text-slate-600 text-xs">SEGUROS</span>
            </div>
            <div class="text-right leading-tight">
                <span class="font-black text-slate-900 text-sm">${pS}%</span><br>
                <span class="text-[9px] text-slate-400 font-bold tracking-wider">${currentPieMetric === "monto" ? fCurrency(sVal) : fNumber(sVal)}</span>
            </div>
        </div>
    `;
}

// ─── TABLA DE AUDITORÍA ───────────────────────────────────────────────────────
function updateTable() {
  const tbody = document.getElementById("areaTableBody");
  const emptyState = document.getElementById("tableEmptyState");
  tbody.innerHTML = "";

  const areas = [...new Set(filteredData.map((d) => d.area))].sort();

  // M9: empty state
  if (areas.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }
  if (emptyState) emptyState.classList.add("hidden");

  // M7: calcular max para barras proporcionales
  const totals = areas.map((a) =>
    filteredData.filter((d) => d.area === a).reduce((s, r) => s + r.importe, 0),
  );
  const maxTotal = Math.max(...totals);

  areas.forEach((a, idx) => {
    const rows = filteredData.filter((d) => d.area === a);
    const total = totals[idx];
    const part = rows
      .filter((d) => d.isParticular)
      .reduce((s, r) => s + r.importe, 0);
    const segu = total - part;
    const pct = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : 0;

    tbody.innerHTML += `
            <tr class="hover:bg-sky-50/30 transition-all group">
                <td class="px-10 py-6 font-black text-slate-800 text-xs group-hover:text-sky-700 transition-colors">${a}</td>
                <td class="px-10 py-5 text-right">
                    <span class="font-black text-sky-700 text-sm">${fCurrency(total)}</span>
                    <div class="spark-bar-track mt-1"><div class="spark-bar-fill" style="width:${pct}%"></div></div>
                </td>
                <td class="px-10 py-6 text-center font-extrabold text-slate-400 text-xs bg-slate-50/30">${fNumber(rows.length)}</td>
                <td class="px-10 py-6 text-right text-emerald-600 font-bold">${fCurrency(part)}</td>
                <td class="px-10 py-6 text-right text-slate-400 font-bold">${fCurrency(segu)}</td>
                <td class="px-10 py-6 text-center text-slate-300 font-black italic">${fCurrency(rows.length > 0 ? total / rows.length : 0)}</td>
            </tr>
        `;
  });
}

// ─── RANKING DE MÉDICOS ────────────────────────────────────────────────────────

function setRankingMetric(m) {
  currentRankMetric = m;
  document.getElementById("btnRankMonto").className =
    m === "monto"
      ? "seg-btn seg-btn-active !text-[10px] !px-3 !py-1.5"
      : "seg-btn !text-[10px] !px-3 !py-1.5";
  document.getElementById("btnRankCant").className =
    m === "cantidad"
      ? "seg-btn seg-btn-active !text-[10px] !px-3 !py-1.5"
      : "seg-btn !text-[10px] !px-3 !py-1.5";
  updateRanking();
}

function setRankingMetricEspec(m) {
  currentRankMetricEspec = m;
  document.getElementById("btnRankMontoEspec").className =
    m === "monto"
      ? "seg-btn seg-btn-active !text-[10px] !px-3 !py-1.5"
      : "seg-btn !text-[10px] !px-3 !py-1.5";
  document.getElementById("btnRankCantEspec").className =
    m === "cantidad"
      ? "seg-btn seg-btn-active !text-[10px] !px-3 !py-1.5"
      : "seg-btn !text-[10px] !px-3 !py-1.5";
  updateRankingEspec();
}

function getRankBadge(idx) {
  if (idx === 0)
    return '<span class="bg-amber-100 text-amber-600 font-black text-[10px] px-2 py-1 rounded-full border border-amber-200">#1 TOP</span>';
  if (idx === 1)
    return '<span class="bg-slate-200 text-slate-500 font-black text-[10px] px-2 py-1 rounded-full border border-slate-300">#2</span>';
  if (idx === 2)
    return '<span class="bg-orange-100 text-orange-600 font-black text-[10px] px-2 py-1 rounded-full border border-orange-200">#3</span>';
  return `<span class="text-slate-400 font-bold text-xs w-6 text-center">#${idx + 1}</span>`;
}

function updateRanking() {
  const grid = document.getElementById("rankingGrid");
  if (!grid) return;

  // Nombres de médicos de guardia
  const docNames =
    typeof MEDICOS !== "undefined"
      ? MEDICOS.map((m) => m.nombre.toUpperCase())
      : [];

  const stats = {};
  docNames.forEach((name) => {
    stats[name] = { monto: 0, cantidad: 0 };
  });

  filteredData.forEach((row) => {
    const med = row.medico;
    if (stats[med]) {
      const codSeg = row.cod_seg;
      const valid =
        codSeg === "50.00.01" || codSeg === "50.02.03" || codSeg === "50.00.00";

      if (valid) {
        stats[med].monto += row.importe;
        stats[med].cantidad += 1;
      }
    }
  });

  let ranking = Object.keys(stats).map((name) => ({
    nombre: name,
    monto: stats[name].monto,
    cantidad: stats[name].cantidad,
  }));

  // Ordenar y limitar al TOP 10
  ranking.sort((a, b) => b[currentRankMetric] - a[currentRankMetric]);
  ranking = ranking.slice(0, 10);

  grid.innerHTML = "";
  const maxVal = ranking.length > 0 ? ranking[0][currentRankMetric] : 0;

  ranking.forEach((doc, idx) => {
    if (doc[currentRankMetric] === 0) return;

    const valText =
      currentRankMetric === "monto"
        ? fCurrency(doc.monto)
        : fNumber(doc.cantidad);
    const secValText =
      currentRankMetric === "monto"
        ? `${fNumber(doc.cantidad)} atenciones`
        : `Facturado: ${fCurrency(doc.monto)}`;
    const pct =
      maxVal > 0 ? ((doc[currentRankMetric] / maxVal) * 100).toFixed(1) : 0;
    const rankBadge = getRankBadge(idx);

    grid.innerHTML += `
            <div class="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2 hover:bg-white hover:shadow-md transition-all">
                <div class="flex justify-between items-start gap-2">
                    <div class="flex items-start gap-2">
                        <div class="mt-1">${rankBadge}</div>
                        <div>
                            <h4 class="text-[11px] sm:text-xs font-[800] text-slate-800 leading-tight">${doc.nombre}</h4>
                            <p class="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Guardia</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-xs sm:text-sm font-black text-sky-700">${valText}</div>
                        <div class="text-[8px] sm:text-[9px] text-slate-400 font-bold">${secValText}</div>
                    </div>
                </div>
                <div class="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div class="bg-sky-500 h-full rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
  });

  if (grid.innerHTML === "") {
    grid.innerHTML = `
            <div class="py-8 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <span class="block text-2xl mb-2">🏥</span>
                No hay atenciones
            </div>
        `;
  }
}

function updateRankingEspec() {
  const grid = document.getElementById("rankingGridEspec");
  if (!grid) return;

  // Nombres de médicos de guardia (para excluirlos)
  const docNamesGuardia =
    typeof MEDICOS !== "undefined"
      ? MEDICOS.map((m) => m.nombre.toUpperCase())
      : [];

  const stats = {};

  filteredData.forEach((row) => {
    const med = row.medico;
    if (!med) return;

    const codSeg = row.cod_seg || "";

    // Regla base: códigos que inician con 50. o códigos exclusivos de especialistas
    const isEspecCode =
      codSeg.startsWith("50.") ||
      ["00.17.25", "00.18.90", "00.20.38", "00.17.01", "00.17.04"].includes(
        codSeg,
      );

    if (!isEspecCode) return;

    // Verificar si esta atención YA pertenece al ranking de Guardia
    const isGuardiaAttn =
      docNamesGuardia.includes(med) &&
      ["50.00.01", "50.02.03", "50.00.00"].includes(codSeg);

    // Si NO es una atención de guardia, es una atención de especialista (lo que queda)
    if (!isGuardiaAttn) {
      if (!stats[med]) stats[med] = { monto: 0, cantidad: 0 };
      stats[med].monto += row.importe;
      stats[med].cantidad += 1;
    }
  });

  let ranking = Object.keys(stats).map((name) => ({
    nombre: name,
    monto: stats[name].monto,
    cantidad: stats[name].cantidad,
  }));

  // Ordenar y limitar al TOP 10
  ranking.sort((a, b) => b[currentRankMetricEspec] - a[currentRankMetricEspec]);
  ranking = ranking.slice(0, 10);

  grid.innerHTML = "";
  const maxVal = ranking.length > 0 ? ranking[0][currentRankMetricEspec] : 0;

  ranking.forEach((doc, idx) => {
    if (doc[currentRankMetricEspec] === 0) return;

    const valText =
      currentRankMetricEspec === "monto"
        ? fCurrency(doc.monto)
        : fNumber(doc.cantidad);
    const secValText =
      currentRankMetricEspec === "monto"
        ? `${fNumber(doc.cantidad)} atenciones`
        : `Facturado: ${fCurrency(doc.monto)}`;
    const pct =
      maxVal > 0
        ? ((doc[currentRankMetricEspec] / maxVal) * 100).toFixed(1)
        : 0;
    const rankBadge = getRankBadge(idx);

    grid.innerHTML += `
            <div class="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2 hover:bg-white hover:shadow-md transition-all">
                <div class="flex justify-between items-start gap-2">
                    <div class="flex items-start gap-2">
                        <div class="mt-1">${rankBadge}</div>
                        <div>
                            <h4 class="text-[11px] sm:text-xs font-[800] text-slate-800 leading-tight">${doc.nombre}</h4>
                            <p class="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Especialista</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-xs sm:text-sm font-black text-indigo-600">${valText}</div>
                        <div class="text-[8px] sm:text-[9px] text-slate-400 font-bold">${secValText}</div>
                    </div>
                </div>
                <div class="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div class="bg-indigo-400 h-full rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
  });

  if (grid.innerHTML === "") {
    grid.innerHTML = `
            <div class="py-8 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <span class="block text-2xl mb-2">🩺</span>
                No hay atenciones
            </div>
        `;
  }
}

function setRankingMetricCia(m) {
  currentRankMetricCia = m;
  document.getElementById("btnRankMontoCia").className =
    m === "monto"
      ? "seg-btn seg-btn-active !text-[10px] !px-3 !py-1.5"
      : "seg-btn !text-[10px] !px-3 !py-1.5";
  document.getElementById("btnRankCantCia").className =
    m === "cantidad"
      ? "seg-btn seg-btn-active !text-[10px] !px-3 !py-1.5"
      : "seg-btn !text-[10px] !px-3 !py-1.5";
  updateRankingCia();
}

function updateRankingCia() {
  const grid = document.getElementById("rankingGridCia");
  if (!grid) return;

  const stats = {};

  filteredData.forEach((row) => {
    if (row.isParticular) return; // Excluye particular

    const cia = row.cia || "SIN ESPECIFICAR";

    if (!stats[cia]) stats[cia] = { monto: 0, cantidad: 0 };
    stats[cia].monto += row.importe;
    stats[cia].cantidad += 1;
  });

  let ranking = Object.keys(stats).map((name) => ({
    nombre: name,
    monto: stats[name].monto,
    cantidad: stats[name].cantidad,
  }));

  // Ordenar y limitar al TOP 10
  ranking.sort((a, b) => b[currentRankMetricCia] - a[currentRankMetricCia]);
  ranking = ranking.slice(0, 10);

  grid.innerHTML = "";
  const maxVal = ranking.length > 0 ? ranking[0][currentRankMetricCia] : 0;

  ranking.forEach((doc, idx) => {
    if (doc[currentRankMetricCia] === 0) return;

    const valText =
      currentRankMetricCia === "monto"
        ? fCurrency(doc.monto)
        : fNumber(doc.cantidad);
    const secValText =
      currentRankMetricCia === "monto"
        ? `${fNumber(doc.cantidad)} atenciones`
        : `Facturado: ${fCurrency(doc.monto)}`;
    const pct =
      maxVal > 0 ? ((doc[currentRankMetricCia] / maxVal) * 100).toFixed(1) : 0;
    const rankBadge = getRankBadge(idx);

    grid.innerHTML += `
            <div class="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2 hover:bg-white hover:shadow-md transition-all">
                <div class="flex justify-between items-start gap-2">
                    <div class="flex items-start gap-2">
                        <div class="mt-1">${rankBadge}</div>
                        <div>
                            <h4 class="text-[11px] sm:text-xs font-[800] text-slate-800 leading-tight truncate max-w-[120px] sm:max-w-[150px] lg:max-w-[200px]" title="${doc.nombre}">${doc.nombre}</h4>
                            <p class="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Seguro / Convenio</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-xs sm:text-sm font-black text-rose-600">${valText}</div>
                        <div class="text-[8px] sm:text-[9px] text-slate-400 font-bold">${secValText}</div>
                    </div>
                </div>
                <div class="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div class="bg-rose-400 h-full rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
  });

  if (grid.innerHTML === "") {
    grid.innerHTML = `
            <div class="col-span-full py-8 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <span class="block text-2xl mb-2">🏢</span>
                No hay atenciones por seguros
            </div>
        `;
  }
}

// ─── FOOTER DE METADATOS (M6) ─────────────────────────────────────────────────
function updateFooter(filename) {
  const el = document.getElementById("footerMeta");
  if (!el || allData.length === 0) return;
  const dates = allData.map((d) => d._rawDate).filter((d) => !isNaN(d));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  const fmt = (d) =>
    d.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const now = new Date().toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  });
  el.innerHTML = `
        <span>📂 ${filename}</span>
        &nbsp;·&nbsp;
        <span>📅 ${fmt(minDate)} — ${fmt(maxDate)}</span>
        &nbsp;·&nbsp;
        <span>🗃 ${fNumber(allData.length)} registros</span>
        &nbsp;·&nbsp;
        <span>🕐 Cargado: ${now}</span>
    `;
}

// ─── STATUS ───────────────────────────────────────────────────────────────────
function showStatus(msg, color) {
  const el = document.getElementById("statusMessage");
  if (!el) return;
  el.textContent = msg;
  const colors = {
    blue: "bg-sky-50 text-sky-700 border-sky-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    red: "bg-rose-50 text-rose-600 border-rose-100",
  };
  el.className = `p-6 rounded-[2rem] text-center font-black tracking-widest shadow-xl shadow-slate-100 border ${colors[color]} mb-12 block`;
  if (color === "green") setTimeout(() => el.classList.add("hidden"), 4000);
}
