// Starts the Mission Overview page.
// It shows short summaries only. The full data lives on the other pages.

// Work out which mission day it is (start date = day 1).
function getMissionDay(startDate, currentDate) {
  const oneDay = 24 * 60 * 60 * 1000;
  const start = new Date(startDate);
  const current = new Date(currentDate);
  return Math.floor((current - start) / oneDay) + 1;
}

// Demo mode: open the page with ?demo=1 to start from the sample check-ins every time.
async function applyDemoModeIfRequested() {
  if (new URLSearchParams(window.location.search).get("demo") !== "1") { return; }
  try {
    const sample = await loadJSON("data/checkins-sample.json");
    localStorage.setItem("spaceShieldCheckins", JSON.stringify(sample));
  } catch (error) {
    console.error(error);
  }
}

// Mission facts (from settings.json)
function showMissionFacts(settings) {
  const mission = settings.mission;
  const day = getMissionDay(mission.startDate, mission.sampleCurrentDate);
  document.getElementById("mission-name").textContent = mission.name;
  document.getElementById("mission-day").textContent = "Day " + day + " (sample data)";
  document.getElementById("signal-delay").textContent =
    mission.sampleSignalDelayMinutes + " min each way (sample)";
}

// Radiation summary: only the latest reading, with its source label.
async function showRadiationSummary() {
  const box = document.getElementById("radiation-summary");
  const readings = await getRadiationReadings();

  if (readings.length === 0) {
    box.innerHTML = '<p class="placeholder">No radiation readings to show.</p>';
    return;
  }

  readings.sort(function (a, b) { return a.timestamp.localeCompare(b.timestamp); });
  const latest = readings[readings.length - 1];

  box.innerHTML =
    '<span class="fact-label">Latest dose rate (' + latest.timestamp.slice(0, 10) + ')</span>' +
    '<div class="big-number">' + latest.doseRate.toLocaleString() + ' ' + latest.unit + '</div>' +
    '<p class="summary-note">One reading from ' + readings.length + ' in the sample file. ' +
    'Space-weather context is on the Radiation Monitor page, separate from dose readings.</p>' +
    '<span class="source-tag">Source: ' + latest.source + '</span>';
}

// Check-in summary: only the latest check-in, with its source label.
async function showHealthSummary(settings) {
  const box = document.getElementById("health-summary");
  const checkins = await getCheckins();
  const units = settings.units;

  if (checkins.length === 0) {
    box.innerHTML =
      '<p class="placeholder">No check-ins yet. Open Crew Check-In to add one or load the sample check-ins.</p>';
    return;
  }

  const latest = checkins[checkins.length - 1];
  const symptomText = latest.symptoms.length ? latest.symptoms.join(", ") : "None ticked";

  box.innerHTML =
    '<span class="fact-label">Check-in for ' + latest.date + '</span>' +
    '<div class="stat-grid">' +
      '<div><span class="fact-label">Heart rate</span><strong>' + latest.heartRate + '</strong> ' + units.heartRate + '</div>' +
      '<div><span class="fact-label">Temperature</span><strong>' + latest.temperature + '</strong> ' + units.temperature + '</div>' +
      '<div><span class="fact-label">Sleep</span><strong>' + latest.sleepHours + '</strong> ' + units.sleepHours + '</div>' +
      '<div><span class="fact-label">Mood</span><strong>' + latest.mood + '</strong> on a scale of ' + units.mood + '</div>' +
    '</div>' +
    '<p class="summary-note">Symptoms ticked: ' + symptomText + '. Trends against each person\'s own usual are on the Crew Check-In page.</p>' +
    '<span class="source-tag">Source: ' + latest.source + '</span>';
}

async function initOverviewPage() {
  await applyDemoModeIfRequested();

  let settings;
  try {
    settings = await loadJSON("data/settings.json");
    showMissionFacts(settings);
  } catch (error) {
    console.error(error);
    document.getElementById("mission-name").textContent = "Could not load data. Use Live Server.";
    return;
  }

  try {
    await showRadiationSummary();
  } catch (error) {
    console.error(error);
    document.getElementById("radiation-summary").textContent = "Could not load radiation readings.";
  }

  try {
    await showHealthSummary(settings);
  } catch (error) {
    console.error(error);
    document.getElementById("health-summary").textContent = "Could not load the latest check-in.";
  }
}

initOverviewPage();