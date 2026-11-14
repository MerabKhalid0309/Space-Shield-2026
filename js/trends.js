// Health trend charts: each person is compared with THEIR OWN usual values.
// No medical ranges are used anywhere in this file.

// The four indicators we draw. "key" matches the check-in shape.
const TREND_INDICATORS = [
  { key: "heartRate",   title: "Heart rate",        decimals: 0, baselineDecimals: 1 },
  { key: "temperature", title: "Body temperature",  decimals: 1, baselineDecimals: 2 },
  { key: "sleepHours",  title: "Sleep",             decimals: 1, baselineDecimals: 1 },
  { key: "mood",        title: "Mood",              decimals: 0, baselineDecimals: 1 }
];

// Keep the charts here so we can replace them when data changes.
const trendCharts = {};

// ---------- SMALL HELPERS ----------

function averageOf(numbers) {
  let sum = 0;
  numbers.forEach(function (n) { sum = sum + n; });
  return sum / numbers.length;
}

// Compare one value with the person's usual value.
// Returns "higher", "lower" or "same". "amount" is the display setting.
function compareToUsual(value, usual, amount) {
  const difference = value - usual;
  if (Math.abs(difference) >= amount) {
    return difference > 0 ? "higher" : "lower";
  }
  return "same";
}

function destroyTrendCharts() {
  Object.keys(trendCharts).forEach(function (key) {
    trendCharts[key].destroy();
    delete trendCharts[key];
  });
}

// ---------- THE SECTION ----------

function showTrendsSection(settings) {
  const container = document.getElementById("trends-content");

  let cards = "";
  TREND_INDICATORS.forEach(function (indicator) {
    cards +=
      '<div class="trend-card">' +
        "<h3>" + indicator.title + "</h3>" +
        '<div class="trend-chart-box"><canvas id="trend-chart-' + indicator.key + '"></canvas></div>' +
        '<div class="trend-status" id="trend-status-' + indicator.key + '"></div>' +
      "</div>";
  });

  container.innerHTML =
    '<p id="trend-message" class="trend-message"></p>' +
    '<div id="trend-grid" class="trend-grid">' + cards + "</div>" +
    '<p class="trend-explain">Colour and words show only that a value differs from <em>your own</em> usual. ' +
    "They do not mean something is wrong, and they are not a diagnosis. " +
    "Radiation and health data are shown separately and are not linked here.</p>" +
    '<p class="limit-note">' + settings.changeAmounts.label + "</p>" +
    '<span class="source-tag" id="trend-source"></span>';

  // Redraw whenever a check-in is saved, loaded or cleared.
  document.addEventListener("checkins-changed", function () {
    drawTrends(settings);
  });

  return drawTrends(settings);
}

async function drawTrends(settings) {
  const checkins = await getCheckins();
  const needed = settings.baselineDays;
  const message = document.getElementById("trend-message");
  const grid = document.getElementById("trend-grid");
  const sourceTag = document.getElementById("trend-source");

  // Not enough data yet to know the person's usual values.
  if (checkins.length < needed) {
    destroyTrendCharts();
    grid.style.display = "none";
    sourceTag.style.display = "none";
    message.textContent =
      "Your usual values come from your first " + needed + " check-ins. You have " +
      checkins.length + " so far. Add more check-ins (or load the sample check-ins) to see your trends.";
    return;
  }

  grid.style.display = "";
  sourceTag.style.display = "";

  const baselineEntries = checkins.slice(0, needed);
  message.textContent =
    "Your usual = the average of your first " + needed + " check-ins (" +
    baselineEntries[0].date + " to " + baselineEntries[needed - 1].date + ").";

  // Source labels for every check-in on screen
  const sources = [];
  checkins.forEach(function (c) {
    if (sources.indexOf(c.source) === -1) { sources.push(c.source); }
  });
  sourceTag.textContent = "Source: " + sources.join(", ");

  const labels = checkins.map(function (c) { return c.date; });
  Chart.defaults.color = "#9aa6c7";

  TREND_INDICATORS.forEach(function (indicator) {
    const unit = settings.units[indicator.key];
    const amount = settings.changeAmounts[indicator.key];

    const values = checkins.map(function (c) { return c[indicator.key]; });
    const usual = averageOf(baselineEntries.map(function (c) { return c[indicator.key]; }));

    // Colour each point: amber = changed from usual, teal = about usual.
    const pointColours = values.map(function (v) {
      return compareToUsual(v, usual, amount) === "same" ? "#4cd4b0" : "#ffb454";
    });

    if (trendCharts[indicator.key]) { trendCharts[indicator.key].destroy(); }

    trendCharts[indicator.key] = new Chart(
      document.getElementById("trend-chart-" + indicator.key),
      {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Your values",
              data: values,
              borderColor: "#5ac8fa",
              pointBackgroundColor: pointColours,
              pointBorderColor: pointColours,
              pointRadius: 4,
              tension: 0.2
            },
            {
              label: "Your usual",
              data: values.map(function () { return usual; }),
              borderColor: "#9aa6c7",
              borderDash: [6, 6],
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { boxWidth: 14, font: { size: 11 } } } },
          scales: {
            x: { grid: { color: "#263056" }, ticks: { maxTicksLimit: 5 } },
            y: { grid: { color: "#263056" }, title: { display: true, text: unit } }
          }
        }
      }
    );

    // Text status for the latest check-in (words, not only colour)
    const latest = checkins[checkins.length - 1];
    const latestValue = latest[indicator.key];
    const result = compareToUsual(latestValue, usual, amount);
    const diff = latestValue - usual;
    const sign = diff > 0 ? "+" : "";

    let words;
    let cssClass;
    if (result === "same") {
      words = "About your usual";
      cssClass = "usual";
    } else {
      words = "Changed from your usual: " + result + " (" + sign + diff.toFixed(indicator.decimals + 1) + ")";
      cssClass = "changed";
    }

    const status = document.getElementById("trend-status-" + indicator.key);
    status.className = "trend-status " + cssClass;
    status.innerHTML =
      "<strong>" + words + "</strong><br>" +
      "Latest (" + latest.date + "): " + latestValue.toFixed(indicator.decimals) + " · " +
      "your usual: " + usual.toFixed(indicator.baselineDecimals);
  });
}