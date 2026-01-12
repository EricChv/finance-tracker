import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const {
      accessToken,
      supabaseAccessToken,
      supabaseRefreshToken,
      accountIds,
    } = await request.json()

    if (!supabaseAccessToken || !supabaseRefreshToken || !accountIds || !Array.isArray(accountIds)) {
      return NextResponse.json(
        { error: "Missing required fields: accessToken, supabaseTokens, accountIds array" },
        { status: 400 }
      )
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
    const tellerAuth = Buffer.from(`${accessToken}:`).toString("base64")
    let totalTransactionsFetched = 0
    let totalTransactionsInserted = 0

    // Fetch account types so we can normalize amounts for credit cards
    const { data: accountRows, error: accountsError } = await supabase
      .from("accounts")
      .select("teller_account_id, type")
      .in("teller_account_id", accountIds)

    if (accountsError) {
      console.error("Failed to fetch accounts for type mapping:", accountsError)
    }

    const accountTypeMap: Record<string, string> = {}
    accountRows?.forEach((row: any) => {
      if (row.teller_account_id) {
        accountTypeMap[row.teller_account_id] = row.type || "depository"
      }
    })

    // Fetch transactions for each account
    for (const accountId of accountIds) {
      try {
        console.log(`Fetching transactions for account ${accountId}...`)

        // GET /accounts/{id}/transactions endpoint per Teller docs
        const transactionsResponse = await fetch(
          `https://api.teller.io/accounts/${accountId}/transactions`,
          {
            headers: {
              Authorization: `Basic ${tellerAuth}`,
            },
          }
        )

        if (!transactionsResponse.ok) {
          const body = await transactionsResponse.text()
          console.error(
            `Failed to fetch transactions for account ${accountId}:`,
            transactionsResponse.status,
            body
          )
          continue
        }

        const tellerTransactions = await transactionsResponse.json()
        console.log(
          `Received ${Array.isArray(tellerTransactions) ? tellerTransactions.length : 0} transactions for account ${accountId}`
        )
        console.log("Raw Teller transactions response:", JSON.stringify(tellerTransactions, null, 2))

        if (!Array.isArray(tellerTransactions)) {
          console.warn(`Unexpected response format for account ${accountId}:`, tellerTransactions)
          continue
        }

        totalTransactionsFetched += tellerTransactions.length

        // Map Teller transaction format to our database schema
        const rows = tellerTransactions.map((transaction: any) => {
          const accountType = accountTypeMap[accountId] || "depository"
          const isCredit = accountType === "credit" || accountType === "credit_card"
          const rawAmount = transaction.amount ?? 0
          // Normalize: credit card positive -> expense, so flip sign to store expenses as negative
          const normalizedAmount = isCredit ? rawAmount * -1 : rawAmount

          return {
            user_id: user.id,
            account_id: accountId,
            teller_transaction_id: transaction.id,
            amount: normalizedAmount,
            description: transaction.description ?? transaction.counterparty?.name ?? "Transaction",
            date: transaction.posted_at ?? transaction.created_at ?? new Date().toISOString(),
            category: transaction.details?.category ?? "Uncategorized",
            status: transaction.status ?? "posted",
            type: transaction.type ?? "debit", // "debit" or "credit"
            merchant: transaction.counterparty?.name ?? null,
          }
        })

        console.log(`Prepared ${rows.length} transaction rows for insert from account ${accountId}`)
        console.log("First transaction row sample:", rows.length > 0 ? JSON.stringify(rows[0], null, 2) : "no rows")

        if (rows.length > 0) {
          // Use upsert to avoid duplicates (if transaction already exists, skip it)
          const { error: upsertError, data: upsertData } = await supabase
            .from("transactions")
            .upsert(rows, { onConflict: "teller_transaction_id" })

          if (upsertError) {
            console.error(`Failed to upsert transactions for account ${accountId}:`, upsertError)
          } else {
            const insertedCount = (upsertData?.length || 0)
            console.log(`Successfully upserted ${insertedCount} transactions for account ${accountId}`)
            console.log("Upsert response data:", JSON.stringify(upsertData, null, 2))
            totalTransactionsInserted += insertedCount
          }
        }
      } catch (err) {
        console.error(`Error processing transactions for account ${accountId}:`, err)
        continue
      }
    }

    console.log(
      `Transaction sync complete: fetched ${totalTransactionsFetched}, inserted ${totalTransactionsInserted}`
    )

    return NextResponse.json({
      success: true,
      totalFetched: totalTransactionsFetched,
      totalInserted: totalTransactionsInserted,
    })
  } catch (error) {
    console.error("Error processing transaction sync:", error)
    return NextResponse.json({ error: "Failed to sync transactions" }, { status: 500 })
  }
}
