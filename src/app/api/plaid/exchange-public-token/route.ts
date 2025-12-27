import { NextRequest, NextResponse } from "next/server";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { createClient } from "@supabase/supabase-js";

// 1. Initialize Clients outside the handler (or in a separate /lib file)
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

export async function POST(req: NextRequest) {
  try {
    const { public_token } = await req.json();
    if (!public_token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    // 2. Setup Supabase with the user's JWT
    const authHeader = req.headers.get("authorization");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    // 3. Identify User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 4. Exchange Plaid Token
    const { data: { access_token, item_id } } = await plaidClient.itemPublicTokenExchange({ public_token });

    // 5. Store Plaid Item (Upsert handles duplicates automatically)
    const { error: itemError } = await supabase
      .from("plaid_items")
      .upsert({ user_id: user.id, access_token, item_id }, { onConflict: 'item_id' });

    if (itemError) throw itemError;

    // 6. Fetch and Map Accounts
    const { data: { accounts } } = await plaidClient.accountsGet({ access_token });
    
    const accountsToInsert = accounts.map(acct => ({
      user_id: user.id,
      name: acct.name,
      type: acct.type,
      balance: acct.balances.current || 0,
      account_number_last_four: acct.mask,
      institution_name: acct.official_name || acct.name,
    }));

    // 7. Bulk Upsert Accounts
    const { error: acctError } = await supabase
      .from("accounts")
      .upsert(accountsToInsert, { onConflict: 'account_number_last_four' }); // or whichever unique constraint you use

    if (acctError) throw acctError;

    return NextResponse.json({ success: true, count: accounts.length });

  } catch (err: any) {
    console.error("Route Error:", err);
    return NextResponse.json(
      { error: err.response?.data?.error_message || err.message || "Server Error" }, 
      { status: 500 }
    );
  }
}