// Radiation Monitor: range controls, summary cards, interactive chart, context markers, table.
// Rule: the rest of the app only knows this shape: { timestamp, doseRate, unit, source }

// THE ADAPTER: all radiation data comes through this one function.
// Today it reads a sample file. Later it could read a real dosimeter.
// Whatever the source, it must return a list of items in the fixed shape.
async function getRadiationReadings() {
  const readings = await loadJSON("data/radiation-sample.json");

  return readings.map(function (item) {
    return {
      timestamp: item.timestamp,
      doseRate: item.doseRate,
      unit: item.unit,
      source: item.source
    };
  });
}

// Work out the estimated dose from DAILY dose rates, but only when that is safe.
// A rate of "µSv/day" lasting one day gives a dose in µSv.
// If the units or the timing do not fit, we refuse to add, instead of showing a wrong number.
function calculateEstimatedDose(readings) {
  const unit = readings[0].unit;

  // Check 1: every reading must use the same unit, and it must be a per-day rate.
  const sameUnit = readings.every(function (r) { return r.unit === unit; });
  if (!sameUnit || !unit.endsWith("/day")) {
    return {
      ok: false,
      reason: "Readings are not all daily dose rates (such as µSv/day), so adding them would give a misleading number."
    };
  }

  // Check 2: at most one reading for each date.
  const dates = readings.map(function (r) { return r.timestamp.slice(0, 10); });
  const uniqueDates = dates.filter(function (d, i) { return dates.indexOf(d) === i; });
  if (uniqueDates.length !== dates.length) {
    return {
      ok: false,
      reason: "More than one reading exists for the same day, so adding them as daily values would double-count."
    };
  }

  // Add the daily values.
  let total = 0;
  readings.forEach(function (r) { total = total + r.doseRate; });

  // Count days between the first and last date, to spot missing days.
  const oneDay = 24 * 60 * 60 * 1000;
  const first = new Date(uniqueDates[0] + "T00:00:00Z");
  const last = new Date(uniqueDates[uniqueDates.length - 1] + "T00:00:00Z");
  const spanDays = Math.round((last - first) / oneDay) + 1;

  return {
    ok: true,
    total: total,
    unit: unit.replace("/day", ""),   // µSv/day becomes µSv
    days: uniqueDates.length,
    missingDays: spanDays - uniqueDates.length
  };
}

// ---------- SMALL HELPERS ----------

let radiationChart = null;
let selectedRange = 14;   // days shown when the page opens

function dateOf(reading) { return reading.timestamp.slice(0, 10); }

function addDays(dateText, days) {
  const d = new Date(dateText + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(firstDate, lastDate) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(lastDate + "T00:00:00Z") - new Date(firstDate + "T00:00:00Z")) / oneDay);
}

function uniqueValues(list) {
  return list.filter(function (value, i) { return list.indexOf(value) === i; });
}

function formatNumber(value) {
  return Number(value.toFixed(1)).toLocaleString();
}

// Readings that fall in the last N days, counted back from the newest reading.
function readingsForRange(readings, days) {
  const newest = dateOf(readings[readings.length - 1]);
  const firstWanted = addDays(newest, -(days - 1));
  return readings.filter(function (r) { return dateOf(r) >= firstWanted; });
}

// Latest, average and highest of the readings that are shown.
function summarizeReadings(readings) {
  let sum = 0;
  let highest = readings[0];
  readings.forEach(function (r) {
    sum = sum + r.doseRate;
    if (r.doseRate > highest.doseRate) { highest = r; }
  });
  return {
    latest: readings[readings.length - 1],
    average: sum / readings.length,
    highest: highest
  };
}

// ---------- CONTEXT MARKERS ON THE CHART ----------
// Draws a dashed vertical line on each date that has a space-weather event.
// This is context only. It does not say the event changed any reading.

const contextMarkerPlugin = {
  id: "contextMarkers",
  afterDatasetsDraw: function (chart, args, options) {
    const markers = options.markers || [];
    const area = chart.chartArea;
    const ctx = chart.ctx;

    markers.forEach(function (marker) {
      const index = chart.data.labels.indexOf(marker.date);
      if (index === -1) { return; }

      const x = chart.scales.x.getPixelForValue(index);
      const text = "Space-weather event (context only)";

      ctx.save();
      ctx.strokeStyle = "#64B9D0";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x, area.top);
      ctx.lineTo(x, area.bottom);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = "#64B9D0";
      ctx.font = "12px system-ui, sans-serif";
      const nearRightEdge = x + 10 + ctx.measureText(text).width > area.right;
      ctx.textAlign = nearRightEdge ? "right" : "left";
      ctx.fillText(text, nearRightEdge ? x - 6 : x + 6, area.top + 14);
      ctx.restore();
    });
  }
};

// ---------- THE CHART ----------

function drawRadiationChart(shown, unit, events) {
  const labels = shown.map(dateOf);
  const values = shown.map(function (r) { return r.doseRate; });

  if (radiationChart) { radiationChart.destroy(); }

  Chart.defaults.color = "#8997AE";
  radiationChart = new Chart(document.getElementById("radiation-chart"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Dose rate (" + unit + ")",
        data: values,
        borderColor: "#7896C7",
        backgroundColor: "rgba(120, 150, 199, 0.14)",
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 7,
        pointBackgroundColor: "#7896C7"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { grid: { color: "#202C42" }, ticks: { maxTicksLimit: 8 } },
        y: {
          grid: { color: "#202C42" },
          grace: "15%",
          title: { display: true, text: "Dose rate (" + unit + ")" }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#111A2B",
          borderColor: "#202C42",
          borderWidth: 1,
          titleColor: "#DCE3EF",
          bodyColor: "#DCE3EF",
          padding: 12,
          callbacks: {
            title: function (items) { return "Date: " + items[0].label; },
            label: function (item) {
              return "Dose rate: " + item.parsed.y.toLocaleString() + " " + unit;
            },
            afterLabel: function (item) {
              return "Source: " + shown[item.dataIndex].source;
            }
          }
        },
        contextMarkers: { markers: events }
      }
    },
    plugins: [contextMarkerPlugin]
  });
}

// ---------- THE WHOLE PANEL ----------

async function showRadiationPanel(settings) {
  const container = document.getElementById("radiation-content");
  const all = await getRadiationReadings();

  if (all.length === 0) {
    container.textContent = "No radiation readings to show.";
    return;
  }
  all.sort(function (a, b) { return a.timestamp.localeCompare(b.timestamp); });

  // Space-weather events (context only). If they cannot load, the chart still works.
  let events = [];
  try {
    events = await getContextEvents();
  } catch (error) {
    console.error(error);
  }

  const sources = uniqueValues(all.map(function (r) { return r.source; }));
  const allSample = sources.every(function (s) { return s.toLowerCase().indexOf("sample") !== -1; });
  const chipText = allSample ? "SAMPLE DATA · NOT LIVE" : "Source: " + sources.join(", ");

  container.innerHTML = `
    <div class="telemetry-head">
      <div>
        <span class="tele-kicker">Radiation telemetry · dose rate</span>
        <div class="tele-title">Dose rate over time</div>
      </div>
      <span class="data-chip">${chipText}</span>
    </div>

    <div class="range-row">
      <div class="range-controls" role="group" aria-label="Choose a time range">
        <button type="button" class="range-btn" data-range="7" aria-pressed="false">7 days</button>
        <button type="button" class="range-btn" data-range="14" aria-pressed="false">14 days</button>
        <button type="button" class="range-btn" data-range="30" aria-pressed="false">30 days</button>
      </div>
      <p class="range-note" id="range-note" aria-live="polite"></p>
    </div>

    <div class="summary-cards" id="telemetry-summary"></div>

    <div class="chart-box tall"><canvas id="radiation-chart" aria-label="Line chart of daily dose rate"></canvas></div>
    <p class="chart-hint">Hover or tap the chart to see the date, value, unit and source for each reading.</p>

    <div class="context-list" id="context-markers"></div>

    <h3 class="list-heading">Readings shown</h3>
    <div id="readings-table"></div>

    <p class="tele-footnote">
      These are sample readings for the demonstration. No alert levels or limits are applied, and nothing here
      is linked to crew health check-ins.
    </p>
    <span class="source-tag">Source: ${sources.join(", ")}</span>
  `;

  // Draw everything for the chosen range.
  function render() {
    const shown = readingsForRange(all, selectedRange);

    // Highlight the chosen button
    container.querySelectorAll(".range-btn").forEach(function (button) {
      const active = Number(button.dataset.range) === selectedRange;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    // Say honestly how much data is really available
    const lastDate = dateOf(all[all.length - 1]);
    const coveredDays = daysBetween(dateOf(all[0]), lastDate) + 1;
    let note = "Showing " + shown.length + " reading(s), " + dateOf(shown[0]) + " to " + lastDate + ".";
    if (coveredDays < selectedRange) {
      note += " The data covers only " + coveredDays + " days, so this range shows all of it.";
    }
    document.getElementById("range-note").textContent = note;

    // Units must match before we label axes or add anything
    const units = uniqueValues(shown.map(function (r) { return r.unit; }));
    if (units.length !== 1) {
      if (radiationChart) { radiationChart.destroy(); radiationChart = null; }
      document.getElementById("telemetry-summary").innerHTML =
        '<p class="tele-footnote">The readings use different units, so no chart or summary is shown.</p>';
      document.getElementById("readings-table").innerHTML = "";
      document.getElementById("context-markers").innerHTML = "";
      return;
    }
    const unit = units[0];

    // Summary cards
    const stats = summarizeReadings(shown);
    const dose = calculateEstimatedDose(shown);

    let doseCard;
    if (dose.ok) {
      let gap = "";
      if (dose.missingDays > 0) {
        gap = " " + dose.missingDays + " day(s) in this period have no reading and are not counted.";
      }
      doseCard = `
        <div class="stat-card">
          <span class="fact-label">Estimated dose in this period</span>
          <div class="stat-value">${dose.total.toLocaleString()} <span class="stat-unit">${dose.unit}</span></div>
          <span class="stat-sub">Estimate from ${dose.days} daily readings. It assumes each reading is that day's
          average dose rate. Not an official mission total.${gap}</span>
        </div>`;
    } else {
      doseCard = `
        <div class="stat-card">
          <span class="fact-label">Estimated dose in this period</span>
          <div class="stat-value">Not shown</div>
          <span class="stat-sub">${dose.reason}</span>
        </div>`;
    }

    document.getElementById("telemetry-summary").innerHTML = `
      <div class="stat-card">
        <span class="fact-label">Latest reading</span>
        <div class="stat-value">${stats.latest.doseRate.toLocaleString()} <span class="stat-unit">${unit}</span></div>
        <span class="stat-sub">${dateOf(stats.latest)} · ${stats.latest.source}</span>
      </div>
      <div class="stat-card">
        <span class="fact-label">Average in this period</span>
        <div class="stat-value">${formatNumber(stats.average)} <span class="stat-unit">${unit}</span></div>
        <span class="stat-sub">Mean of ${shown.length} reading(s)</span>
      </div>
      <div class="stat-card">
        <span class="fact-label">Highest in this period</span>
        <div class="stat-value">${stats.highest.doseRate.toLocaleString()} <span class="stat-unit">${unit}</span></div>
        <span class="stat-sub">${dateOf(stats.highest)} · ${stats.highest.source}</span>
      </div>
      ${doseCard}
    `;

    // Context markers: only events whose date is inside the period
    const firstShown = dateOf(shown[0]);
    const eventsShown = events.filter(function (e) { return e.date >= firstShown && e.date <= lastDate; });
    drawRadiationChart(shown, unit, eventsShown);

    let markerHtml;
    if (eventsShown.length === 0) {
      markerHtml = "No space-weather events recorded in this period.";
    } else {
      markerHtml = "<strong>Context markers in this period:</strong> " +
        eventsShown.map(function (e) { return e.date + " · " + e.type + " (" + e.source + ")"; }).join("; ");
    }
    document.getElementById("context-markers").innerHTML =
      "<p>" + markerHtml + "</p>" +
      "<p>Markers show when an event was recorded. They are context only and do not mean an event caused any reading.</p>";

    // Table of the readings that are shown (newest first)
    let rows = "";
    shown.slice().reverse().forEach(function (r) {
      rows += "<tr><td>" + dateOf(r) + "</td><td>" + r.doseRate.toLocaleString() + "</td><td>" + r.source + "</td></tr>";
    });
    document.getElementById("readings-table").innerHTML =
      '<div class="table-scroll"><table class="checkin-table readings-table">' +
      "<thead><tr><th>Date</th><th>Dose rate (" + unit + ")</th><th>Source</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  container.querySelectorAll(".range-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      selectedRange = Number(button.dataset.range);
      render();
    });
  });

  render();
}