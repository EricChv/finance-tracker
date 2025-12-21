// Utility to fetch a Plaid Link token from your backend
export async function getPlaidLinkToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/plaid/create-link-token")
    if (!res.ok) throw new Error("Failed to fetch link token")
    const data = await res.json()
    return data.link_token || null
  } catch (err) {
    console.error("Error fetching Plaid link token:", err)
    return null
  }
}
