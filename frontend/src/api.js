export async function getApiHealth() {
  const response = await fetch("/api/health");

  if (!response.ok) {
    throw new Error("The API returned " + response.status + ".");
  }

  return response.json();
}