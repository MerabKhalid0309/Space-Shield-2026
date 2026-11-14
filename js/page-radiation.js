// Starts the Radiation Monitor page.
// It reuses showRadiationPanel() from radiation.js and showContextCard() from context.js.

async function initRadiationPage() {
  let settings;

  try {
    settings = await loadJSON("data/settings.json");
  } catch (error) {
    console.error(error);
    document.getElementById("radiation-content").textContent =
      "Could not load data. Use Live Server.";
    document.getElementById("context-content").textContent =
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
}

initRadiationPage();