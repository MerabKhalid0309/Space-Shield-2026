// Guided three-step check-in: Body, Rest, How I Feel.
// It reuses these helpers from checkin.js:
//   addCheckin, readSavedCheckins, writeSavedCheckins,
//   suggestNextDate, renderCheckinList, showCheckinMessage
// Nothing here judges a value. "Complete" only means "this step was filled in".

const WIZARD_STEPS = [
  { key: "body", title: "Body" },
  { key: "rest", title: "Rest" },
  { key: "feel", title: "How I Feel" }
];

function showCheckinWizard(settings) {
  const container = document.getElementById("checkin-content");
  const units = settings.units;
  const lastStep = WIZARD_STEPS.length - 1;
  let currentStep = 0;

  // ----- Build the pieces that come from settings.json -----
  let stepperItems = "";
  WIZARD_STEPS.forEach(function (step, i) {
    stepperItems +=
      `<li class="step-item" data-step-item="${i}">
         <span class="step-num">Step ${i + 1}</span>
         <span class="step-name">${step.title}</span>
         <span class="step-state"></span>
       </li>`;
  });

  let moodOptions = "";
  for (let n = 1; n <= 5; n++) {
    const word = n === 1 ? "low" : (n === 5 ? "high" : "");
    moodOptions +=
      `<label class="choice-card mood-card">
         <input type="radio" name="mood" value="${n}">
         <span><strong>${n}</strong>${word ? "<small>" + word + "</small>" : ""}</span>
       </label>`;
  }

  let symptomOptions = "";
  settings.symptomChecklist.forEach(function (name) {
    symptomOptions +=
      `<label class="choice-card">
         <input type="checkbox" name="symptom" value="${name}">
         <span>${name}</span>
       </label>`;
  });

  // ----- Build the page -----
  container.innerHTML = `
    <p class="entry-note">
      <strong>How values get here:</strong> they are typed in by the crew, or loaded as sample data.
      Space Shield does not measure anything automatically.
    </p>

    <label class="wiz-field date-field">Check-in date
      <input type="date" id="ci-date" required>
    </label>

    <ol class="stepper" aria-label="Check-in steps">${stepperItems}</ol>

    <div class="progress-wrap">
      <div class="progress-label" id="wiz-progress-label"></div>
      <div class="progress" id="wiz-progress" role="progressbar" aria-labelledby="wiz-progress-label"
           aria-valuemin="0" aria-valuemax="${WIZARD_STEPS.length}" aria-valuenow="0">
        <div class="progress-fill" id="wiz-progress-fill"></div>
      </div>
    </div>

    <p class="sr-only" id="wiz-live" aria-live="polite"></p>

    <form id="checkin-form" novalidate>

      <section class="step-panel two-cols" data-panel="0">
        <h3 class="step-heading" tabindex="-1">Step 1 of 3: Body</h3>

        <div class="big-field">
          <label for="ci-hr">Heart rate (${units.heartRate})</label>
          <input type="number" id="ci-hr" inputmode="decimal" step="1" min="0" aria-describedby="hint-hr err-hr">
          <small id="hint-hr">How: sit still and rested, then use the crew's mission-approved device or follow the mission procedure.</small>
          <span class="field-error" id="err-hr" role="alert"></span>
        </div>

        <div class="big-field">
          <label for="ci-temp">Body temperature (${units.temperature})</label>
          <input type="number" id="ci-temp" inputmode="decimal" step="0.1" min="0" aria-describedby="hint-temp err-temp">
          <small id="hint-temp">How: use the mission-approved thermometer, the same way each day.</small>
          <span class="field-error" id="err-temp" role="alert"></span>
        </div>
      </section>

      <section class="step-panel" data-panel="1" hidden>
        <h3 class="step-heading" tabindex="-1">Step 2 of 3: Rest</h3>

        <div class="big-field">
          <label for="ci-sleep">Sleep last night (${units.sleepHours})</label>
          <input type="number" id="ci-sleep" inputmode="decimal" step="0.1" min="0" max="24" aria-describedby="hint-sleep err-sleep">
          <small id="hint-sleep">How: estimate the total hours you slept. A sleep device reading is fine if the crew has one.</small>
          <span class="field-error" id="err-sleep" role="alert"></span>
        </div>
      </section>

      <section class="step-panel" data-panel="2" hidden>
        <h3 class="step-heading" tabindex="-1">Step 3 of 3: How I Feel</h3>

        <fieldset class="big-field">
          <legend>Mood (${units.mood})</legend>
          <div class="mood-options">${moodOptions}</div>
          <small id="hint-mood">How: pick the number that best matches how you feel right now.</small>
          <span class="field-error" id="err-mood" role="alert"></span>
        </fieldset>

        <fieldset class="big-field">
          <legend>Symptoms (tick any you notice, or leave all blank)</legend>
          <div class="symptom-options">${symptomOptions}</div>
          <small>Ticking a symptom only records it. Space Shield does not say what a symptom means.</small>
        </fieldset>
      </section>

      <div class="wizard-buttons">
        <button type="button" class="btn secondary large" id="wiz-back">Back</button>
        <button type="button" class="btn large" id="wiz-next">Next</button>
        <button type="submit" class="btn large" id="wiz-save">Save check-in</button>
      </div>
    </form>

    <p id="checkin-message" class="checkin-message" role="status"></p>
    <div id="wiz-badge"></div>

    <label class="badge-toggle">
      <input type="checkbox" id="wiz-badge-toggle" checked> Show a mission badge after saving
    </label>

    <div class="demo-tools">
      <span class="fact-label">Demo tools</span>
      <div class="button-row">
        <button type="button" class="btn secondary" id="ci-load-sample">Load sample check-ins</button>
        <button type="button" class="btn secondary" id="ci-clear">Clear all</button>
      </div>
    </div>

    <h3 class="list-heading">Saved check-ins</h3>
    <div id="checkin-list"></div>
  `;

  // ----- Small helpers -----
  function el(id) { return document.getElementById(id); }

  function readNumber(id) {
    const text = el(id).value.trim();
    if (text === "") { return null; }
    const value = parseFloat(text);
    return isFinite(value) ? value : null;
  }

  function setError(id, message) { el(id).textContent = message; }

  // A step is "complete" when it has been filled in. This never looks at whether a value is good or bad.
  function stepIsComplete(i) {
    if (i === 0) {
      const hr = readNumber("ci-hr");
      const temp = readNumber("ci-temp");
      return hr !== null && hr > 0 && temp !== null && temp > 0;
    }
    if (i === 1) {
      const sleep = readNumber("ci-sleep");
      return sleep !== null && sleep >= 0 && sleep <= 24;
    }
    return !!container.querySelector('input[name="mood"]:checked');
  }

  // Check a step and show a friendly message for anything missing.
  function validateStep(i) {
    if (i === 0) {
      const hr = readNumber("ci-hr");
      const temp = readNumber("ci-temp");
      setError("err-hr", hr !== null && hr > 0 ? "" : "Please type a number for heart rate.");
      setError("err-temp", temp !== null && temp > 0 ? "" : "Please type a number for temperature.");
    } else if (i === 1) {
      const sleep = readNumber("ci-sleep");
      const ok = sleep !== null && sleep >= 0 && sleep <= 24;
      setError("err-sleep", ok ? "" : "Please type the hours you slept (0 to 24).");
    } else {
      setError("err-mood", stepIsComplete(2) ? "" : "Please pick a mood number.");
    }
    return stepIsComplete(i);
  }

  // ----- Step indicator and completion bar -----
  function updateProgress() {
    let done = 0;
    WIZARD_STEPS.forEach(function (step, i) {
      const complete = stepIsComplete(i);
      if (complete) { done++; }

      const item = container.querySelector('[data-step-item="' + i + '"]');
      item.classList.toggle("is-done", complete);
      item.classList.toggle("is-current", i === currentStep);
      if (i === currentStep) { item.setAttribute("aria-current", "step"); }
      else { item.removeAttribute("aria-current"); }

      item.querySelector(".step-state").textContent =
        i === currentStep ? "Current" : (complete ? "Filled in" : "Not yet");
    });

    const percent = Math.round((done / WIZARD_STEPS.length) * 100);
    el("wiz-progress-fill").style.width = percent + "%";
    el("wiz-progress-label").textContent =
      "Check-in progress: " + done + " of " + WIZARD_STEPS.length + " steps filled in" +
      (done === WIZARD_STEPS.length ? " (ready to save)" : "");
    el("wiz-progress").setAttribute("aria-valuenow", done);
  }

  function showStep(i, moveFocus) {
    currentStep = i;

    container.querySelectorAll(".step-panel").forEach(function (panel) {
      panel.hidden = Number(panel.dataset.panel) !== i;
    });

    el("wiz-back").hidden = i === 0;
    el("wiz-next").hidden = i === lastStep;
    el("wiz-save").hidden = i !== lastStep;

    updateProgress();
    el("wiz-live").textContent = "Step " + (i + 1) + " of " + WIZARD_STEPS.length + ": " + WIZARD_STEPS[i].title;

    if (moveFocus) {
      container.querySelector('[data-panel="' + i + '"] .step-heading').focus();
    }
  }

  function goNext() {
    if (validateStep(currentStep)) { showStep(currentStep + 1, true); }
  }

  // ----- Saving -----
  function saveCheckin() {
    if (!el("ci-date").value) {
      showCheckinMessage("Please choose a check-in date.");
      el("ci-date").focus();
      return;
    }

    // Check every step. If one is missing something, go back to it.
    for (let i = 0; i <= lastStep; i++) {
      if (!validateStep(i)) {
        showStep(i, true);
        return;
      }
    }

    const symptoms = [];
    container.querySelectorAll('input[name="symptom"]:checked').forEach(function (box) {
      symptoms.push(box.value);
    });

    addCheckin({
      date: el("ci-date").value,
      heartRate: readNumber("ci-hr"),
      temperature: readNumber("ci-temp"),
      sleepHours: readNumber("ci-sleep"),
      mood: parseInt(container.querySelector('input[name="mood"]:checked').value, 10),
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

    // Optional badge: it only says a check-in was logged. It says nothing about the values.
    const savedDate = el("ci-date").value;
    const totalLogged = readSavedCheckins().length;
    if (el("wiz-badge-toggle").checked) {
      el("wiz-badge").innerHTML =
        `<div class="mission-badge">
           <span class="badge-icon" aria-hidden="true">🛰️</span>
           <div>
             <strong>Check-in logged</strong><br>
             <span>For ${savedDate} · ${totalLogged} logged so far</span><br>
             <small>This badge only shows that a check-in was saved. It says nothing about the values.</small>
           </div>
         </div>`;
    } else {
      el("wiz-badge").innerHTML = "";
    }

    // Reset for the next check-in
    el("checkin-form").reset();
    ["err-hr", "err-temp", "err-sleep", "err-mood"].forEach(function (id) { setError(id, ""); });
    el("ci-date").value = suggestNextDate(settings);
    showStep(0, false);
    renderCheckinList(units);
  }

  // ----- Wire up the buttons -----
  el("wiz-next").addEventListener("click", goNext);
  el("wiz-back").addEventListener("click", function () { showStep(currentStep - 1, true); });

  // Pressing Enter inside a box moves forward (or saves on the last step).
  el("checkin-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (currentStep < lastStep) { goNext(); } else { saveCheckin(); }
  });

  // Keep the bar and step indicator up to date while typing.
  el("checkin-form").addEventListener("input", updateProgress);
  el("checkin-form").addEventListener("change", updateProgress);

  // ----- Sample data and clear buttons (same behaviour as before) -----
  el("ci-load-sample").addEventListener("click", async function () {
    if (readSavedCheckins().length > 0 &&
        !confirm("This replaces the check-ins saved in this browser with the sample check-ins. Continue?")) {
      return;
    }
    try {
      const sample = await loadJSON("data/checkins-sample.json");
      writeSavedCheckins(sample);
      el("ci-date").value = suggestNextDate(settings);
      renderCheckinList(units);
      el("wiz-badge").innerHTML = "";
      showCheckinMessage("Sample check-ins loaded (14 days).");
    } catch (error) {
      console.error(error);
      showCheckinMessage("Could not load the sample check-ins.");
    }
  });

  el("ci-clear").addEventListener("click", function () {
    if (!confirm("Delete all check-ins saved in this browser?")) { return; }
    writeSavedCheckins([]);
    el("ci-date").value = suggestNextDate(settings);
    renderCheckinList(units);
    el("wiz-badge").innerHTML = "";
    showCheckinMessage("All check-ins cleared.");
  });

  // ----- Start -----
  el("ci-date").value = suggestNextDate(settings);
  renderCheckinList(units);
  showStep(0, false);
}