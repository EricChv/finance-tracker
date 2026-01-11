import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Track your expenses",
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" >
      <body>
        {children}
        <Script 
          src="https://cdn.teller.io/connect/connect.js" 
          strategy="beforeInteractive" 
        />
      </body>
    </html>
    
  )
}