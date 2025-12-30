'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { AppSidebar } from "@/components/app-sidebar"
import { AccountCard } from "@/components/account-card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface Expense {
  id: string
  amount: number
  description: string
  category: string
  date: string
}


export default function Home() {
  
  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  
  // Authentication & Navigation
  const router = useRouter()  // Next.js router for page navigation (redirects to /login if not authenticated)
  const [loading, setLoading] = useState(true)  // Loading state while checking if user is logged in
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)  // Current logged-in user info
  
  // Manual Expense Form (local state, not yet connected to database)
  const [expenses, setExpenses] = useState<Expense[]>([])  // Array of manually entered expenses
  const [amount, setAmount] = useState('')  // Form input: dollar amount being entered
  const [description, setDescription] = useState('')  // Form input: what the expense was for
  const [category, setCategory] = useState('Online Purchases')  // Form input: expense category dropdown
  
  // Transactions from Database (for display and calculations)
  const [transactions, setTransactions] = useState<any[]>([])  // 3 most recent transactions (for "Recent Transactions" section)
  const [allTransactions, setAllTransactions] = useState<any[]>([])  // ALL transactions (for calculating totals)
  const [loadingTransactions, setLoadingTransactions] = useState(true)  // Loading state for transaction queries
  
  // Accounts from Database (bank accounts & credit cards)
  const [accounts, setAccounts] = useState<any[]>([])  // All user accounts from database
  const [loadingAccounts, setLoadingAccounts] = useState(true)  // Loading state for accounts query

  // ═══════════════════════════════════════════════════════════════════
  // AUTHENTICATION CHECK (runs once when page loads)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      
      // 1. Fetch session from Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      // 2. Redirect if no session exists
      if (!session) {
        router.push('/login')
        return // Exit early to avoid running the 'else' logic
      }

      // 3. Destructure metadata since names are guaranteed to exist
      const { first_name, last_name } = session.user.user_metadata

      // 4. Update state with the confirmed user data
      setUser({
        name: `${first_name} ${last_name}`,
        email: session.user.email
      })
      
      // 5. Reveal the dashboard
      setLoading(false)
    }
    
    checkAuth()
  }, [router])  // Runs once on mount, reruns if router changes
  
  // ═══════════════════════════════════════════════════════════════════
  // FETCH TRANSACTIONS FROM DATABASE (runs once when page loads)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchTransactions = async () => {
      const supabase = createClient()

      // Query 1: Get ALL transactions (for calculating totals like income/expenses)
      const { data: allData, error: allError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
      
      if (allError) {
        console.error('Error fetching all transactions:', allError)
      } else {
        setAllTransactions(allData || [])  // Store all transactions for calculations
      }

      // Query 2: Get only 3 most recent transactions (for "Recent Transactions" UI section)
      const { data, error} = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(3)  // Only need 3 for display
      
      // 🔐 Security Note: RLS (Row Level Security) automatically filters results
      // Only transactions where user_id = auth.uid() are returned
      // Users can NEVER see other users' transactions!

      if (error) {
        console.error('Error fetching transactions: ', error)
      } else {
        setTransactions(data || [])  // Store recent transactions for display
      }

      setLoadingTransactions(false)  // Stop showing loading spinner
    }

    fetchTransactions()
  }, [])  // Empty array [] = run once when component mounts, never run again
  
  // ═══════════════════════════════════════════════════════════════════
  // FETCH ACCOUNTS FROM DATABASE (runs once when page loads)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchAccounts = async () => {
      const supabase = createClient()

      // Query all accounts (checking, savings, credit cards)
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false })  // Newest accounts first
      
      // 🔐 Security Note: RLS automatically filters to only this user's accounts
      // WHERE user_id = auth.uid() is added automatically by Supabase

      if (error) {
        console.error('Error fetching accounts:', error)
      } else {
        setAccounts(data || [])  // Store accounts for display and calculations
      }

      setLoadingAccounts(false)  // Stop showing loading spinner
    }

    fetchAccounts()
  }, [])  // Empty array [] = run once when component mounts, never run again
  
  // ═══════════════════════════════════════════════════════════════════
  // EVENT HANDLERS (functions triggered by user actions)
  // ═══════════════════════════════════════════════════════════════════
  
  // Handle manual expense form submission
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()  // Stop browser from refreshing page (default form behavior)
    
    const newExpense: Expense = {
      id: crypto.randomUUID(),  // Generate unique ID (prevents duplicates)
      amount: parseFloat(amount),  // Convert string "50.00" → number 50.00
      description,  // Shorthand for description: description
      category,
      date: new Date().toISOString().split('T')[0]  // Format: "2025-12-09"
    }
    
    setExpenses([...expenses, newExpense])  // Add new expense to array using spread operator
    
    // Clear form inputs after submission
    setAmount('')
    setDescription('')
    setCategory('online-purchases')
  }

  // Delete expense by filtering it out of the array
  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(expense => expense.id !== id))  // Keep all expenses EXCEPT the one with matching id
  }

  // ═══════════════════════════════════════════════════════════════════
  // FINANCIAL CALCULATIONS (computed from database data)
  // ═══════════════════════════════════════════════════════════════════
  
  // Total Income: sum of all transactions where type = 'income'
  const totalIncome = allTransactions
    .filter(t => t.type === 'income')  // Only income transactions
    .reduce((sum, t) => sum + t.amount, 0)  // Add up all amounts (starts at 0)
  
  // Total Expenses: sum of all transactions where type = 'expense'
  const totalExpenses = allTransactions
    .filter(t => t.type === 'expense')  // Only expense transactions
    .reduce((sum, t) => sum + t.amount, 0)  // Add up all amounts
  
  // Total Balance: sum of all account balances (checking + savings + credit cards)
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  
  // Total Debts: sum of negative balances on credit cards only
  const totalDebts = accounts
    .filter(acc => acc.type === 'credit_card' && acc.balance < 0)  // Only credit cards with debt
    .reduce((sum, acc) => sum + Math.abs(acc.balance), 0)  // Make positive and add up
  
  // Manual Expense Total: sum of local expenses (not connected to database yet)
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  
  // ═══════════════════════════════════════════════════════════════════
  // RENDER LOGIC
  // ═══════════════════════════════════════════════════════════════════
  
  // Show loading screen while checking if user is authenticated
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }
  


  // User is authenticated → render the full dashboard
  return (
    <SidebarProvider>
      <AppSidebar user={user || undefined} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical"  />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Spending Tracker
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Top Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* My Balance */}
            <div className="rounded-xl border bg-card p-6 shadow-lg ">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                My Balance
              </div>
              <div className="mt-3 font-bold text-2xl md:text-xl overflow-hidden truncate">
                {loadingAccounts ? '...' : `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Total across all accounts</div>
            </div>

            {/* Income */}
            <div className="rounded-xl border bg-card p-6 shadow-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Income
              </div>
              <div className="mt-3 font-bold text-2xl md:text-xl overflow-hidden truncate">
                {loadingTransactions ? '...' : `$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Total income earned</div>
            </div>

            {/* Expenses */}
            <div className="rounded-xl border bg-card p-6 shadow-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                Expenses
              </div>
              <div className="mt-3 font-bold text-2xl md:text-xl overflow-hidden truncate">
                {loadingTransactions ? '...' : `$${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Total expenses spent</div>
            </div>

            {/* My Debts */}
            <div className="rounded-xl border bg-card p-6 shadow-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                My Debts
              </div>
              <div className="mt-3 font-bold text-2xl md:text-xl overflow-hidden truncate">
                {loadingAccounts ? '...' : `$${totalDebts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {loadingAccounts ? '' : `Across ${accounts.filter(acc => acc.type === 'credit_card' && acc.balance < 0).length} credit cards`}
              </div>
            </div>
          </div>

          {/* Middle Section - Credit Cards & Transactions */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Credit Cards Due Soon */}
            <div className="rounded-xl border bg-card p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Credit Cards Due Soon</h3>
                {!loadingAccounts && accounts.filter(acc => acc.type === 'credit_card' && acc.balance < 0).length > 0 && (
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-600">
                    {accounts.filter(acc => acc.type === 'credit_card' && acc.balance < 0).length} cards with balance
                  </span>
                )}
              </div>
              
              {loadingAccounts ? (
                <p className="text-sm text-muted-foreground">Loading credit cards...</p>
              ) : accounts.filter(acc => acc.type === 'credit_card').length === 0 ? (
                <p className="text-sm text-muted-foreground">No credit cards added yet</p>
              ) : (
                <div className="space-y-3">
                  {accounts
                    .filter(acc => acc.type === 'credit_card')
                    .map((card) => (
                      <div key={card.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                            <svg className="size-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium">{card.name}</div>
                            <div className="text-xs text-muted-foreground">{card.institution}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ${Math.abs(card.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-xs ${card.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {card.balance < 0 ? 'Balance due' : 'Credit available'}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="rounded-xl border bg-card p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Recent Transactions</h3>
                <button className="text-xs text-muted-foreground hover:text-foreground">View All</button>
              </div>
              
              {loadingTransactions ? (
                // Loading state while fetching transactions
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : transactions.length === 0 ? (
                // Empty state when no transactions exist
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              ) : (
                // Display real transactions from database
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-pink-500/10">
                          <span className="text-lg">{transaction.description[0]}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{transaction.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Wallet */}
          <div className="rounded-xl border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">My Wallet</h3>
              <Link href="/accounts" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 border border-border bg-background text-foreground hover:bg-accent">+ Add New</Link>
            </div>
            
            {loadingAccounts ? (
              // Loading state while fetching accounts
              <p className="text-sm text-muted-foreground">Loading accounts...</p>
            ) : accounts.length === 0 ? (
              // Empty state when no accounts exist
              <p className="text-sm text-muted-foreground">No accounts yet. Click "+ Add New" to add your first account.</p>
            ) : (
              // Display real accounts from database
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:max-w-8xl">
                {accounts.map((account, index) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    index={index}

                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}