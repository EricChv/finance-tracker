import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // 1. Get user JWT from Authorization header
  const authHeader = req.headers.get("authorization");
  const jwt = authHeader?.replace("Bearer ", "");
  if (!jwt) return NextResponse.json({ error: "No auth token" }, { status: 401 });

  // 2. Create Supabase client with JWT for RLS
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  // 3. Get user_id from JWT
  const { data: { user } } = await supabase.auth.getUser();
  const user_id = user?.id;
  if (!user_id) return NextResponse.json({ error: "No user" }, { status: 401 });

  // 4. Get access_token from plaid_items
  const { data: plaidItems, error: plaidError } = await supabase
    .from("plaid_items")
    .select("access_token")
    .eq("user_id", user_id)
    .maybeSingle();
  if (plaidError || !plaidItems) return NextResponse.json({ error: "No Plaid item" }, { status: 400 });

  const access_token = plaidItems.access_token;

  // 5. Call Plaid /transactions/get
  const plaid = await import("plaid");
  const { Configuration, PlaidApi, PlaidEnvironments } = plaid;
  const config = new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
        "PLAID-SECRET": process.env.PLAID_SECRET!,
      },
    },
  });
  const client = new PlaidApi(config);

  // Get last 30 days
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const plaidRes = await client.transactionsGet({
    access_token,
    start_date: startDate,
    end_date: endDate,
    options: { count: 100, offset: 0 },
  });

  const transactions = plaidRes.data.transactions;

  // 6. Insert transactions into Supabase (skip duplicates)
  for (const tx of transactions) {
    await supabase.from("transactions").upsert({
      user_id,
      account_id: tx.account_id,
      name: tx.name,
      amount: tx.amount,
      date: tx.date,
      category: tx.category?.join(", ") || null,
      plaid_transaction_id: tx.transaction_id,
    }, { onConflict: "plaid_transaction_id" });
  }

  return NextResponse.json({ success: true, count: transactions.length });
}