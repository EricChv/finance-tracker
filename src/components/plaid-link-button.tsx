import React from "react"
import { Button } from "@/components/ui/button"

// This is a minimal Plaid Link button using the Plaid Link SDK
// You must have a backend endpoint that creates a link token (see /api/plaid/create-link-token)

export function PlaidLinkButton({ linkToken }: { linkToken: string }) {
  const handleClick = () => {
    if (!window.Plaid) {
      alert("Plaid.js not loaded")
      return
    }
    window.Plaid.create({
      token: linkToken,
      onSuccess: (public_token, metadata) => {
        // You should send public_token to your backend to exchange for access_token
        alert("Plaid linked! Public token: " + public_token)
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
