// Guidance panel.
// SAFETY RULES for every sentence written here:
//   - no diagnosis
//   - no medical limit or "normal range"
//   - no claim that radiation caused anything
// Reminders always point to mission-approved procedures and the flight surgeon.

const STANDING_REMINDER =
  "Space Shield is a support tool, not medical advice. " +
  "Follow mission-approved safety and medical procedures, and contact the flight surgeon " +
  "as the mission protocol says.";

// Two short lines per item: what it is, and why it is tracked.
const GUIDANCE_EXPLAINERS = [
  {
    title: "Radiation dose rate",
    what: "How much radiation a measuring device (a dosimeter) records, shown per day.",
    why: "NASA describes space radiation as invisible to the human eye, so the way to know about it is to measure it. We show the readings by themselves, separate from your check-ins."
  },
  {
    title: "Space-weather context",
    what: "A note about activity on the Sun, such as a solar storm.",
    why: "It gives background on what space was like that day. It is context only and does not tell you your own dose."
  },
  {
    title: "Heart rate",
    what: "How many times your heart beats in one minute.",
    why: "It is tracked so you can see whether it shifts from your own usual."
  },
  {
    title: "Body temperature",
    what: "The temperature of your body, taken the same way each day.",
    why: "It is tracked so you can see whether it shifts from your own usual."
  },
  {
    title: "Sleep",
    what: "How many hours you slept last night.",
    why: "It is tracked so you can see whether it shifts from your own usual."
  },
  {
    title: "Mood",
    what: "A number from 1 to 5 for how you feel right now.",
    why: "It is tracked so you can see whether it shifts from your own usual."
  },
  {
    title: "Symptoms",
    what: "A checklist of things you may notice in yourself.",
    why: "Ticking one records it for you and the crew. The app does not say what a symptom means."
  }
];

// ---------- BUILD THE REMINDERS (they depend on the latest check-in) ----------

async function buildReminders(settings) {
  const checkins = await getCheckins();
  const reminders = [];

  if (checkins.length === 0) {
    reminders.push("No check-ins yet. When you add one, any reminders will show here.");
    return reminders;
  }

  const latest = checkins[checkins.length - 1];

  // 1. Symptoms ticked: record it and point to protocol. Never explain the symptom.
  if (latest.symptoms.length > 0) {
    reminders.push(
      "On " + latest.date + " you ticked: " + latest.symptoms.join(", ") + ". " +
      "This is recorded. Please follow mission-approved procedures and contact the flight surgeon " +
      "as the mission protocol says."
    );
  }

  // 2. Values that differ from the person's own usual (needs enough check-ins for a baseline)
  const needed = settings.baselineDays;
  if (checkins.length >= needed) {
    const baselineEntries = checkins.slice(0, needed);
    const changedNames = [];

    TREND_INDICATORS.forEach(function (indicator) {
      const usual = averageOf(baselineEntries.map(function (c) { return c[indicator.key]; }));
      const amount = settings.changeAmounts[indicator.key];
      if (compareToUsual(latest[indicator.key], usual, amount) !== "same") {
        changedNames.push(indicator.title.toLowerCase());
      }
    });

    if (changedNames.length > 0) {
      reminders.push(
        "In your latest check-in (" + latest.date + "), these differ from your own usual: " +
        changedNames.join(", ") + ". This does not tell us why. " +
        "If you are unsure, follow mission-approved procedures and contact the flight surgeon " +
        "as the mission protocol says."
      );
    }
  }

  if (reminders.length === 0) {
    reminders.push("Nothing to flag from your latest check-in. Keep checking in at the same time each day.");
  }

  return reminders;
}

// ---------- DRAW THE PANEL ----------

async function drawGuidance(settings) {
  const reminders = await buildReminders(settings);

  let reminderHtml = "";
  reminders.forEach(function (text) {
    reminderHtml += '<li>' + text + "</li>";
  });

  let explainerHtml = "";
  GUIDANCE_EXPLAINERS.forEach(function (item) {
    explainerHtml +=
      '<div class="explainer">' +
        "<h3>" + item.title + "</h3>" +
        "<p><strong>What it is:</strong> " + item.what + "</p>" +
        "<p><strong>Why it is tracked:</strong> " + item.why + "</p>" +
      "</div>";
  });

  document.getElementById("guidance-content").innerHTML =
    '<div class="reminder-box">' +
      "<h3>Gentle reminders</h3>" +
      "<ul>" + reminderHtml + "</ul>" +
      '<p class="standing-reminder">' + STANDING_REMINDER + "</p>" +
    "</div>" +
    '<div class="explainer-grid">' + explainerHtml + "</div>";
}

function showGuidanceSection(settings) {
  // Redraw whenever a check-in is saved, loaded or cleared.
  document.addEventListener("checkins-changed", function () {
    drawGuidance(settings);
  });
  return drawGuidance(settings);
}