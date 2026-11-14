// Shared helpers used by every page.

// Read a JSON file and return its contents.
async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Could not load " + path);
  }
  return response.json();
}