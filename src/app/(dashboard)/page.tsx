'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { AppSidebar } from "@/components/app-sidebar"
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
  
  // State declaration:
  const [expenses, setExpenses] = useState<Expense[]>([]) // arr of expense objs
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Online Purchases') // default to "online-purchases" if "category" not selected
  const [transactions, setTransactions] = useState<any[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const router = useRouter() // router is created outside the useEffect and is used inside it. React's built-in linting rule flag it and demand that you include it in the dependency array: [router] --as in useEffect below.
  const [loading, setLoading] = useState(true)

  // Check authentication on mount
  useEffect(() => {
      // 1. Define the asynchronous function to handle the authentication logic.
      const checkAuth = async () => {
        // 1.1. Initialize the Supabase client instance.
        const supabase = createClient()
        
        // 1.2. Attempt to retrieve the current user session from Supabase. 
        // This checks local storage and may validate the session with the server.
        const { data: { session } } = await supabase.auth.getSession()
        
        // 2. Conditional Logic (The Guard)
        
        // 2.1. If 'session' is null (no active user session found):
        if (!session) {
          // Redirect the user to the '/login' page. This prevents unauthorized access.
          router.push('/login') 
        } else {
          // 2.2. If a valid session exists:
          // Set the loading state to false, which allows the component (the dashboard content) to render.
          setLoading(false)
        }
      }
      
      // 3. Execute the checkAuth function immediately after component mount.
      checkAuth()
  // The router dependency is included to satisfy linting rules for exhaustive dependencies.
  }, [router])
  
  // Fetch transactions from Supabase on component mount
  useEffect(() => {
    // 1. Define async function to fetch transactions from database
    const fetchTransactions = async () => {
      // 1.1. Create Supabase client instance (reads env vars for API keys)
      const supabase = createClient()

      // 1.2. Query the 'transactions' table
      const { data, error} = await supabase
        .from('transactions')           // Table name in Supabase
        .select('*')                    // Select all columns (id, amount, description, etc.)
        .order('date', { ascending: false })  // Sort by date, newest first
        .limit(3)                       // Only get 3 most recent transactions
      
      // RLS Policy automatically adds: WHERE user_id = auth.uid()
      // So user only sees their own transactions!

      // 2. Handle the response
      if (error) {
        // 2.1. If database query failed, log error to console
        console.error('Error fetching transactions: ', error)
      } else {
        // 2.2. If successful, update state with data
        // (data || []) prevents null errors - uses empty array if data is null
        setTransactions(data || [])
      }

      // 3. Stop loading spinner regardless of success/failure
      setLoadingTransactions(false)
    }

    // 4. Execute the fetch function immediately
    fetchTransactions()
  }, [])  // Empty dependency array = run once on mount, never again
  
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    const newExpense: Expense = {
      id: crypto.randomUUID(), // collision proofing
      amount: parseFloat(amount),
      description,
      category,
      date: new Date().toISOString().split('T')[0]
    }
    setExpenses([...expenses, newExpense]) // spread operator, copies all existing expenses. adds the new one at the end
    setAmount('') // Clears all the form inputs
    setDescription('')
    setCategory('online-purchases') // Resets category back to default 'food'
  }

  const handleDeleteExpense = (id: string) => {
  setExpenses(expenses.filter(expense => expense.id !== id))
  }

  // handle total calculation:
    // .reduce() - loops through all expenses and accumulates a value
    // sum - the running total (starts at 0)
    // expense - each expense object as we loop
    // sum + expense.amount - adds each expense's amount to the running total
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  
  // if loading -> Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }
  
  // else return entire component
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
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
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                My Balance
              </div>
              <div className="mt-3 text-3xl font-bold">$125,430</div>
              <div className="mt-1 text-xs text-green-600">↑ 12.5% compared to last month</div>
              <div className="mt-4 flex gap-2">
                <button className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">Transfer</button>
                <button className="rounded-md border px-3 py-1.5 text-xs">Request</button>
              </div>
            </div>

            {/* Income */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Income
              </div>
              <div className="mt-3 text-3xl font-bold">$38,700</div>
              <div className="mt-1 text-xs text-green-600">↑ 8.5% compared to last month</div>
            </div>

            {/* Expenses */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                Expenses
              </div>
              <div className="mt-3 text-3xl font-bold">$26,450</div>
              <div className="mt-1 text-xs text-red-600">↓ 5.5% compared to last month</div>
            </div>

            {/* My Debts */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                My Debts
              </div>
              <div className="mt-3 text-3xl font-bold">$8,525</div>
              <div className="mt-1 text-xs text-muted-foreground">Across 2 credit cards</div>
            </div>
          </div>

          {/* Middle Section - Credit Cards & Transactions */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Credit Cards Due Soon */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Credit Cards Due Soon</h3>
                <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-600">3 overdue invoices</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <svg className="size-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Chase Sapphire</div>
                      <div className="text-xs text-muted-foreground">Due Dec 15, 2025</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">$2,450</div>
                    <div className="text-xs text-red-600">Overdue</div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
                      <svg className="size-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Amex Gold</div>
                      <div className="text-xs text-muted-foreground">Due Dec 20, 2025</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">$1,890</div>
                    <div className="text-xs text-muted-foreground">8 days left</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Recent Transactions</h3>
                <button className="text-xs text-muted-foreground hover:text-foreground">View All</button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-pink-500/10">
                      <span className="text-lg">S</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Samantha William</div>
                      <div className="text-xs text-muted-foreground">30 April 2024, 10:15 AM</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-green-600">+$850</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-cyan-500/10">
                      <span className="text-lg">🛒</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Grocery at Shop</div>
                      <div className="text-xs text-muted-foreground">29 April 2024, 6:45 PM</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-red-600">-$125</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-orange-500/10">
                      <span className="text-lg">☕</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Coffee</div>
                      <div className="text-xs text-muted-foreground">21 April 2024, 8:30 AM</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-red-600">-$8</div>
                </div>
              </div>
            </div>
          </div>

          {/* My Wallet */}
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">My Wallet</h3>
              <button className="rounded-md border px-3 py-1.5 text-xs">+ Add New</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Credit Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white">
                <div className="mb-8">
                  <div className="text-xs opacity-80">Credit Card</div>
                  <div className="mt-1 font-mono text-lg tracking-wider">5375 •••• •••• 2368</div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">$5,325.57</div>
                  <div className="rounded bg-white/20 px-2 py-1 text-xs font-semibold">VISA</div>
                </div>
              </div>

              {/* Digital Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
                <div className="mb-8">
                  <div className="text-xs opacity-80">Digital Card</div>
                  <div className="mt-1 font-mono text-lg tracking-wider">5375 •••• •••• ••45</div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">$10,892.43</div>
                  <div className="rounded bg-white/20 px-2 py-1 text-xs font-semibold">MC</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}