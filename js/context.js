// Space-weather context card.
// Rule: the shape is { date, type, note, source }.
// This card gives CONTEXT only. It never says anything about crew dose.

// Adapter for context events. Later this could read real NASA DONKI data.
async function getContextEvents() {
  const events = await loadJSON("data/context-sample.json");

  return events.map(function (item) {
    return {
      date: item.date,
      type: item.type,
      note: item.note,
      source: item.source
    };
  });
}

// Build the card.
async function showContextCard() {
  const container = document.getElementById("context-content");
  const events = await getContextEvents();

  if (events.length === 0) {
    container.textContent = "No space-weather events to show.";
    return;
  }

  // Show the most recent event (newest date first).
  events.sort(function (a, b) { return b.date.localeCompare(a.date); });
  const event = events[0];

  container.innerHTML =
    '<span class="context-badge">Context only, not crew dose</span>' +
    '<div class="context-date">' + event.date + '</div>' +
    '<div class="context-type">' + event.type + '</div>' +
    '<p class="context-note">' + event.note + '</p>' +
    '<span class="source-tag">Source: ' + event.source + '</span>';
}