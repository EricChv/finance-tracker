import { createClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { accessToken, user } = await request.json()

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch account details from Teller API
    const tellerResponse = await fetch('https://api.teller.io/accounts', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!tellerResponse.ok) {
      throw new Error('Failed to fetch accounts from Teller')
    }

    const tellerAccounts = await tellerResponse.json()

    // Save each account to Supabase
    for (const account of tellerAccounts) {
      await supabase.from('accounts').insert({
        user_id: session.user.id,
        name: account.name || 'Bank Account',
        type: account.subtype?.toLowerCase() || 'checking',
        balance: parseFloat(account.balance) || 0,
        institution_name: 'Teller Connected',
        teller_account_id: account.id,
        teller_access_token: accessToken,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing Teller enrollment:', error)
    return NextResponse.json(
      { error: 'Failed to process enrollment' },
      { status: 500 }
    )
  }
}