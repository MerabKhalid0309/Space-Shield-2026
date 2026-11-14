// Starts the Guidance & Sources page.
// It reuses showGuidanceSection() from guidance.js.

async function initGuidancePage() {
  let settings;

  try {
    settings = await loadJSON("data/settings.json");
  } catch (error) {
    console.error(error);
    document.getElementById("guidance-content").textContent =
      "Could not load data. Use Live Server.";
    return;
  }

  try {
    await showGuidanceSection(settings);
  } catch (error) {
    console.error(error);
    document.getElementById("guidance-content").textContent =
      "Could not load the guidance.";
  }
}

initGuidancePage();