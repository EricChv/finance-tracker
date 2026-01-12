import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const { accessToken, supabaseAccessToken, supabaseRefreshToken } = await request.json()

    if (!supabaseAccessToken || !supabaseRefreshToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: { get() { return undefined }, set() {}, remove() {} },
      }
    )

    const { data: sessionResult, error: setSessionError } = await supabase.auth.setSession({
      access_token: supabaseAccessToken,
      refresh_token: supabaseRefreshToken,
    })
    if (setSessionError || !sessionResult?.user) {
      console.error("setSession error:", setSessionError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = sessionResult.user

    // Use Basic Auth with access token (format: -u TOKEN: in curl)
    const tellerAuth = Buffer.from(`${accessToken}:`).toString("base64")
    const tellerResponse = await fetch("https://api.teller.io/accounts", {
      headers: {
        Authorization: `Basic ${tellerAuth}`,
      },
    })
    if (!tellerResponse.ok) {
      const body = await tellerResponse.text()
      console.error("Teller fetch failed:", tellerResponse.status, body)
      return NextResponse.json(
        { error: body || "Failed to fetch accounts from Teller" },
        { status: tellerResponse.status }
      )
    }

    const tellerAccounts = await tellerResponse.json()
    console.log("Teller accounts response:", JSON.stringify(tellerAccounts, null, 2))
    
    if (!Array.isArray(tellerAccounts)) {
      console.error("Unexpected Teller response format:", tellerAccounts)
      return NextResponse.json(
        { error: "Invalid response format from Teller" },
        { status: 500 }
      )
    }

    const rows = tellerAccounts.map((account: any) => ({
      user_id: user.id,
      teller_account_id: account.id,
      name: account.name ?? "Bank Account",
      type: account.type?.toLowerCase() ?? "depository",
      balance_current: 0,
      balance_available: 0,
      last_four: account.last_four ?? null,
      institution_name: account.institution?.name ?? "Bank",
    }))
    
    console.log("Prepared rows for insert:", JSON.stringify(rows, null, 2))

    if (rows.length > 0) {
      console.log(`Inserting ${rows.length} accounts into Supabase`)
      const { error, data } = await supabase.from("accounts").insert(rows)
      if (error) {
        console.error("Supabase insert error:", error)
        return NextResponse.json({ error: "Failed to save accounts" }, { status: 500 })
      }
      console.log("Insert successful:", data)
      
      // Now fetch balances for each account
      console.log("Fetching balances for accounts...")
      for (const account of tellerAccounts) {
        try {
          const balanceAuth = Buffer.from(`${accessToken}:`).toString("base64")
          const balanceResponse = await fetch(`https://api.teller.io/accounts/${account.id}/balances`, {
            headers: { Authorization: `Basic ${balanceAuth}` },
          })
          
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json()
            console.log(`Balance for ${account.id}:`, balanceData)
            
            // Update account with balances
            const { error: updateError } = await supabase
              .from("accounts")
              .update({
                balance_current: balanceData.balance || 0,
                balance_available: balanceData.available || 0,
              })
              .eq("teller_account_id", account.id)
              .eq("user_id", user.id)
            
            if (updateError) {
              console.error(`Failed to update balance for ${account.id}:`, updateError)
            }
          }
        } catch (err) {
          console.error(`Error fetching balance for ${account.id}:`, err)
        }
      }
      
      // Now sync transactions for all enrolled accounts
      console.log("Starting transaction sync...")
      const accountIds = tellerAccounts.map((acc: any) => acc.id)
      
      try {
        const syncResponse = await fetch(`${new URL(request.url).origin}/api/transactions/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken,
            supabaseAccessToken,
            supabaseRefreshToken,
            accountIds,
          }),
        })
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json()
          console.log("Transaction sync result:", syncResult)
        } else {
          const body = await syncResponse.text()
          console.error("Transaction sync failed:", syncResponse.status, body)
        }
      } catch (err) {
        console.error("Error calling transaction sync:", err)
      }
    } else {
      console.warn("No accounts to insert from Teller response")
    }

    return NextResponse.json({ success: true, inserted: rows.length })
  } catch (error) {
    console.error("Error processing Teller enrollment:", error)
    return NextResponse.json({ error: "Failed to process enrollment" }, { status: 500 })
  }
}