import { NextRequest, NextResponse } from "next/server"


export async function POST(req: NextRequest) {
  // Only allow GET for link token creation
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function GET(req: NextRequest) {
  // Get Plaid credentials from environment variables
  const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID
  const PLAID_SECRET = process.env.PLAID_SECRET
  const PLAID_ENV = process.env.PLAID_ENV || "sandbox"
  

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return NextResponse.json({ error: "Missing Plaid credentials" }, { status: 500 })
  }

  // Dynamically import plaid package (so it works in Next.js API route)
  const plaid = await import("plaid")
  const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = plaid;

  const config = new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
        "PLAID-SECRET": PLAID_SECRET,
      },
    },
  })
  const client = new PlaidApi(config)

  try {
    const response = await client.linkTokenCreate({
      user: { client_user_id: "unique-user-id" }, // TODO: use real user id from auth
      client_name: "Spending Tracker",
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    })
    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Plaid error" }, { status: 500 })
  }
}
