// Auth utilities removed - using Supabase auth

export async function authedPost<T>(url: string, body?: unknown): Promise<T> {
  const user = { uid: 'user-id' }; // Auth utilities removed
  const idToken = 'mock-token'; // getIdToken removed

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: body ? JSON.stringify(body) : "{}",
    credentials: "omit",
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return res.json();
}
