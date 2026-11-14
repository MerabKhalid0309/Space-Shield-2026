// Space Shield: main script.
// Later steps add more code in this file or in new files in the js/ folder.

// Small helper: read a JSON file and return its contents.
async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Could not load " + path);
  }
  return response.json();
}

// Work out which mission day it is (start date = day 1).
function getMissionDay(startDate, currentDate) {
  const oneDay = 24 * 60 * 60 * 1000;
  const start = new Date(startDate);
  const current = new Date(currentDate);
  return Math.floor((current - start) / oneDay) + 1;
}

// Fill in the mission header from settings.json
function showMissionHeader(settings) {
  const mission = settings.mission;
  document.getElementById("mission-name").textContent = mission.name;

  const day = getMissionDay(mission.startDate, mission.sampleCurrentDate);
  document.getElementById("mission-day").textContent = "Day " + day + " (sample data)";
  
  document.getElementById("signal-delay").textContent =
    mission.sampleSignalDelayMinutes + " min each way (sample)";
}

// Start the app
async function init() {
  try {
    const settings = await loadJSON("data/settings.json");
    showMissionHeader(settings);
  } catch (error) {
    console.error(error);
    document.getElementById("mission-name").textContent =
      "Could not load data. Use Live Server.";
  }
}
async function init() {
  let settings;

  // Header
  try {
    settings = await loadJSON("data/settings.json");
    showMissionHeader(settings);
  } catch (error) {
    console.error(error);
    document.getElementById("mission-name").textContent =
      "Could not load data. Use Live Server.";
    return;
  }

  // Radiation panel
  try {
    await showRadiationPanel(settings);
  } catch (error) {
    console.error(error);
    document.getElementById("radiation-content").textContent =
      "Could not load radiation readings.";
  }

    // Space-weather context card
  try {
    await showContextCard();
  } catch (error) {
    console.error(error);
    document.getElementById("context-content").textContent =
      "Could not load space-weather context.";
  }

    // Daily check-in form
  try {
    await showCheckinSection(settings);
  } catch (error) {
    console.error(error);
    document.getElementById("checkin-content").textContent =
      "Could not load the check-in form.";
  }

    // Health trend charts
  try {
    await showTrendsSection(settings);
  } catch (error) {
    console.error(error);
    document.getElementById("trends-content").textContent =
      "Could not load the health trends.";
  }

    // Guidance panel
  try {
    await showGuidanceSection(settings);
  } catch (error) {
    console.error(error);
    document.getElementById("guidance-content").textContent =
      "Could not load the guidance.";
  }

}

init();