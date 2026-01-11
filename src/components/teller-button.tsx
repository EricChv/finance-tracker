'use client'
import { useEffect, useState, type MouseEventHandler } from "react"
import { Button } from "@/components/ui/button"

type TellerButtonProps = React.ComponentProps<typeof Button> & {
  label?: string
}

export function TellerButton({
  label = "🏦 Connect Bank",
  children,
  ...buttonProps
}: TellerButtonProps) {
  const [tellerInstance, setTellerInstance] = useState<any>(null)

  useEffect(() => {
    // Initialize Teller Connect once the script is available
    if (!process.env.NEXT_PUBLIC_TELLER_APP_ID) {
      console.warn("Missing NEXT_PUBLIC_TELLER_APP_ID; Teller Connect disabled")
      return
    }

    if (window.TellerConnect) {
      const instance = window.TellerConnect.setup({
        applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID,
        products: ["verify"],
        onSuccess(enrollment) {
          console.log("Success!", enrollment.accessToken)
        },
        onExit() {
          console.log("User closed Teller")
        },
      })

      setTellerInstance(instance)
      return () => instance.destroy?.()
    }
  }, [])

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    // Prevent open if another handler cancelled the click
    if (event.defaultPrevented) return
    tellerInstance?.open()
  }

  const isReady = Boolean(tellerInstance)

  return (
    <Button
      onClick={handleClick}
      disabled={!isReady}
      variant="primary"
      {...buttonProps}
    >
      {isReady ? children ?? label : "Loading Teller..."}
    </Button>
  )
}