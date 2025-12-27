import React from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"

export function PlaidLinkButton({ linkToken, userId, onAccountsAdded }: { linkToken: string, userId: string, onAccountsAdded: () => void }) {
  const handleClick = async () => {
    if (!window.Plaid) {
      alert("Plaid.js not loaded")
      return
    }
    // Get user's Supabase access token
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token

    window.Plaid.create({
      token: linkToken,
      onSuccess: async (public_token, metadata) => {
        // Send public_token, userId, and access token to backend
        const res = await fetch("/api/plaid/exchange-public-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ public_token, user_id: userId }),
        })
        if (res.ok) {
          alert("Accounts imported from Plaid!")
          onAccountsAdded() // Refresh accounts in UI
        } else {
          const err = await res.json()
          alert("Error importing accounts: " + err.error)
        }
      },
      onExit: (err, metadata) => {
        if (err) alert("Plaid exited: " + err.display_message)
      },
    }).open()
  }

  return (
    <Button type="button" onClick={handleClick} variant="primary">
      Link Bank Account
    </Button>
  )
}