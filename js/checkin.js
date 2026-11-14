// Daily check-in form.
// Rule: the shape is { date, heartRate, temperature, sleepHours, mood, symptoms, source }.
// Check-ins are saved in the browser (localStorage) on this device.

const CHECKIN_STORAGE_KEY = "spaceShieldCheckins";

// ---------- SAVING AND LOADING ----------

function readSavedCheckins() {
  try {
    const text = localStorage.getItem(CHECKIN_STORAGE_KEY);
    return text ? JSON.parse(text) : [];
  } catch (error) {
    return [];
  }
}

function writeSavedCheckins(list) {
  list.sort(function (a, b) { return a.date.localeCompare(b.date); });
  localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(list));
  // Tell other parts of the app (like the trend charts in Step 7) that data changed.
  document.dispatchEvent(new CustomEvent("checkins-changed"));
}

// THE ADAPTER for check-ins: the rest of the app reads check-ins only through this function.
async function getCheckins() {
  return readSavedCheckins().map(function (item) {
    return {
      date: item.date,
      heartRate: item.heartRate,
      temperature: item.temperature,
      sleepHours: item.sleepHours,
      mood: item.mood,
      symptoms: item.symptoms,
      source: item.source
    };
  });
}

// Add one entry. If that date already exists, it is replaced.
function addCheckin(entry) {
  const list = readSavedCheckins().filter(function (item) {
    return item.date !== entry.date;
  });
  list.push(entry);
  writeSavedCheckins(list);
}

// ---------- SMALL HELPERS ----------

// Suggest the day after the latest saved check-in (or the mission start date).
function suggestNextDate(settings) {
  const list = readSavedCheckins();
  if (list.length === 0) { return settings.mission.startDate; }
  const last = list[list.length - 1].date;
  const next = new Date(last + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function showCheckinMessage(text) {
  document.getElementById("checkin-message").textContent = text;
}

// ---------- THE LIST OF ENTRIES ----------

function renderCheckinList(units) {
  const list = readSavedCheckins().slice().reverse(); // newest first
  const box = document.getElementById("checkin-list");

  if (list.length === 0) {
    box.innerHTML = '<p class="placeholder">No check-ins yet.</p>';
    return;
  }

  let rows = "";
  list.forEach(function (item) {
    rows +=
      "<tr>" +
      "<td>" + item.date + "</td>" +
      "<td>" + item.heartRate + "</td>" +
      "<td>" + item.temperature + "</td>" +
      "<td>" + item.sleepHours + "</td>" +
      "<td>" + item.mood + "</td>" +
      "<td>" + (item.symptoms.length ? item.symptoms.join(", ") : "None ticked") + "</td>" +
      "<td>" + item.source + "</td>" +
      "</tr>";
  });

  box.innerHTML =
    '<div class="table-scroll"><table class="checkin-table">' +
    "<thead><tr><th>Date</th><th>Heart rate<br>(" + units.heartRate + ")</th>" +
    "<th>Temp<br>(" + units.temperature + ")</th><th>Sleep<br>(" + units.sleepHours + ")</th>" +
    "<th>Mood<br>(" + units.mood + ")</th><th>Symptoms ticked</th><th>Source</th></tr></thead>" +
    "<tbody>" + rows + "</tbody></table></div>";
}

// ---------- THE FORM ----------

async function showCheckinSection(settings) {
  const container = document.getElementById("checkin-content");
  const units = settings.units;

  // Build the symptom checkboxes from settings.json
  let symptomBoxes = "";
  settings.symptomChecklist.forEach(function (name) {
    symptomBoxes +=
      '<label class="symptom"><input type="checkbox" name="symptom" value="' + name + '"> ' + name + "</label>";
  });

  container.innerHTML =
    '<form id="checkin-form">' +

      '<label class="field">Date' +
        '<input type="date" id="ci-date" required>' +
      "</label>" +

      '<label class="field">Heart rate (' + units.heartRate + ")" +
        '<input type="number" id="ci-hr" min="20" max="250" step="1" required>' +
        '<small>How: sit still and rested, then use the crew\'s mission-approved device or follow the mission procedure.</small>' +
      "</label>" +

      '<label class="field">Body temperature (' + units.temperature + ")" +
        '<input type="number" id="ci-temp" min="30" max="45" step="0.1" required>' +
        '<small>How: use the mission-approved thermometer, the same way each day.</small>' +
      "</label>" +

      '<label class="field">Sleep last night (' + units.sleepHours + ")" +
        '<input type="number" id="ci-sleep" min="0" max="24" step="0.1" required>' +
        '<small>How: estimate the total hours you slept. A sleep device reading is fine if the crew has one.</small>' +
      "</label>" +

      '<label class="field">Mood (' + units.mood + ")" +
        '<select id="ci-mood" required>' +
          '<option value="">Choose…</option>' +
          '<option value="1">1 (low)</option><option value="2">2</option>' +
          '<option value="3">3</option><option value="4">4</option>' +
          '<option value="5">5 (high)</option>' +
        "</select>" +
        '<small>How: pick the number that best matches how you feel right now.</small>' +
      "</label>" +

      '<fieldset class="symptoms"><legend>Symptoms (tick any you notice)</legend>' +
        symptomBoxes +
      "</fieldset>" +

      '<div class="button-row">' +
        '<button type="submit" class="btn">Save check-in</button>' +
        '<button type="button" class="btn secondary" id="ci-load-sample">Load sample check-ins</button>' +
        '<button type="button" class="btn secondary" id="ci-clear">Clear all</button>' +
      "</div>" +
    "</form>" +

    '<p id="checkin-message" class="checkin-message" role="status"></p>' +
    '<div id="checkin-list"></div>';

  document.getElementById("ci-date").value = suggestNextDate(settings);
  renderCheckinList(units);

  // --- Save button ---
  document.getElementById("checkin-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const symptoms = [];
    document.querySelectorAll('input[name="symptom"]:checked').forEach(function (box) {
      symptoms.push(box.value);
    });

    addCheckin({
      date: document.getElementById("ci-date").value,
      heartRate: parseFloat(document.getElementById("ci-hr").value),
      temperature: parseFloat(document.getElementById("ci-temp").value),
      sleepHours: parseFloat(document.getElementById("ci-sleep").value),
      mood: parseInt(document.getElementById("ci-mood").value, 10),
      symptoms: symptoms,
      source: "Entered by crew"
    });

    // The app records symptoms. It does not say what they mean.
    if (symptoms.length > 0) {
      showCheckinMessage(
        "Check-in saved. Symptoms recorded. Please follow mission-approved procedures " +
        "and contact the flight surgeon as the mission protocol says."
      );
    } else {
      showCheckinMessage("Check-in saved.");
    }

    event.target.reset();
    document.getElementById("ci-date").value = suggestNextDate(settings);
    renderCheckinList(units);
  });

  // --- Load sample check-ins button ---
  document.getElementById("ci-load-sample").addEventListener("click", async function () {
    if (readSavedCheckins().length > 0 &&
        !confirm("This replaces the check-ins saved in this browser with the sample check-ins. Continue?")) {
      return;
    }
    try {
      const sample = await loadJSON("data/checkins-sample.json");
      writeSavedCheckins(sample);
      document.getElementById("ci-date").value = suggestNextDate(settings);
      renderCheckinList(units);
      showCheckinMessage("Sample check-ins loaded (14 days).");
    } catch (error) {
      console.error(error);
      showCheckinMessage("Could not load the sample check-ins.");
    }
  });

  // --- Clear button ---
  document.getElementById("ci-clear").addEventListener("click", function () {
    if (!confirm("Delete all check-ins saved in this browser?")) { return; }
    writeSavedCheckins([]);
    document.getElementById("ci-date").value = suggestNextDate(settings);
    renderCheckinList(units);
    showCheckinMessage("All check-ins cleared.");
  });
}