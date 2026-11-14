// Starts the Crew Check-In page.
// It reuses showCheckinWizard() from checkin-wizard.js and showTrendsSection() from trends.js.

async function initHealthPage() {
  let settings;

  try {
    settings = await loadJSON("data/settings.json");
  } catch (error) {
    console.error(error);
    document.getElementById("checkin-content").textContent =
      "Could not load data. Use Live Server.";
    document.getElementById("trends-content").textContent =
      "Could not load data. Use Live Server.";
    return;
  }

  // Guided check-in
  try {
    showCheckinWizard(settings);
  } catch (error) {
    console.error(error);
    document.getElementById("checkin-content").textContent =
      "Could not load the check-in.";
  }

  // Health trend charts
  try {
    await showTrendsSection(settings);
  } catch (error) {
    console.error(error);
    document.getElementById("trends-content").textContent =
      "Could not load the health trends.";
  }
}

initHealthPage();