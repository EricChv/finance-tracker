/*
  ═══════════════════════════════════════════════════════════════════
  TRANSACTIONS PAGE - View and Manage All Transactions
  ═══════════════════════════════════════════════════════════════════
  
  This page allows users to:
  - View all their transactions (income and expenses)
  - Filter by type (all, income, expenses)
  - Search by description
  - Sort by date, amount, or description
  - See transaction details (date, description, amount, type)
  - Add new transactions
  - Delete existing transactions
  
  Data Flow:
  1. User must be logged in (checked via Supabase session)
  2. Page fetches all transactions from Supabase 'transactions' table
  3. User can filter, search, and sort the transaction list
  4. User can add new transactions via form
  5. Transaction list refreshes automatically after add/delete
  
  Database Table: transactions
  - Columns: id, user_id, amount, description, type, date, created_at
  - RLS Policy: Users can only see/modify their own transactions
*/

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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ═══════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

interface Transaction {
  id: string
  user_id: string
  amount: number
  description: string
  type: 'income' | 'expense'
  category?: string
  date: string
  created_at: string
}

export default function TransactionsPage() {
  
  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  
  const router = useRouter()
  
  // Authentication & Data Loading
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  
  // Filter & Search States
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Add Transaction Form States
  const [showForm, setShowForm] = useState(false)
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formType, setFormType] = useState<'income' | 'expense'>('expense')
  const [formCategory, setFormCategory] = useState('Online Purchases')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  // ═══════════════════════════════════════════════════════════════════
  // AUTHENTICATION CHECK
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
      } else {
        setUser({
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || 'user@example.com'
        })
        setLoading(false)
        fetchTransactions()
      }
    }
    
    checkAuth()
  }, [router])

  // ═══════════════════════════════════════════════════════════════════
  // FETCH TRANSACTIONS FROM DATABASE
  // ═══════════════════════════════════════════════════════════════════
  const fetchTransactions = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) return

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      return
    }

    setTransactions(data || [])
  }

  // ═══════════════════════════════════════════════════════════════════
  // ADD NEW TRANSACTION
  // ═══════════════════════════════════════════════════════════════════
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: session.user.id,
        amount: parseFloat(formAmount),
        description: formDescription,
        type: formType,
        category: formCategory,
        date: formDate
      }])

    if (error) {
      console.error('Error adding transaction:', error)
      alert('Failed to add transaction. Please try again.')
    } else {
      // Reset form
      setFormAmount('')
      setFormDescription('')
      setFormType('expense')
      setFormCategory('Online Purchases')
      setFormDate(new Date().toISOString().split('T')[0])
      setShowForm(false)
      
      // Refresh transaction list
      fetchTransactions()
    }

    setSaving(false)
  }

  // ═══════════════════════════════════════════════════════════════════
  // DELETE TRANSACTION
  // ═══════════════════════════════════════════════════════════════════
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting transaction:', error)
      alert('Failed to delete transaction. Please try again.')
    } else {
      fetchTransactions()
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // FILTER, SEARCH & SORT LOGIC
  // ═══════════════════════════════════════════════════════════════════
  const filteredAndSortedTransactions = transactions
    .filter(transaction => {
      // Filter by type
      if (filterType !== 'all' && transaction.type !== filterType) return false
      
      // Filter by search query
      if (searchQuery && !transaction.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount
      } else if (sortBy === 'description') {
        comparison = a.description.localeCompare(b.description)
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Calculate totals for filtered transactions
  const totalIncome = filteredAndSortedTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalExpenses = filteredAndSortedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user || undefined} />
      <SidebarInset>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Transactions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MAIN CONTENT */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-1 flex-col gap-4 p-4">
          
          {/* Page Title & Add Transaction Button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Transactions</h1>
              <p className="text-muted-foreground">View and manage all your transactions</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Add Transaction'}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Income</CardDescription>
                <CardTitle className="text-3xl text-green-700">
                  ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Expenses</CardDescription>
                <CardTitle className="text-3xl text-red-700">
                  ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Net Balance</CardDescription>
                <CardTitle className={`text-3xl ${totalIncome - totalExpenses >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ${(totalIncome - totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Add Transaction Form */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Transaction</CardTitle>
                <CardDescription>Enter the transaction details below</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTransaction} className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Type *</Label>
                      <Select value={formType} onValueChange={(value: 'income' | 'expense') => setFormType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      placeholder="e.g., Grocery shopping"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={formCategory} onValueChange={setFormCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Online Purchases">Online Purchases</SelectItem>
                          <SelectItem value="Groceries">Groceries</SelectItem>
                          <SelectItem value="Transportation">Transportation</SelectItem>
                          <SelectItem value="Entertainment">Entertainment</SelectItem>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? 'Adding...' : 'Add Transaction'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Filters & Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label>Filter by Type</Label>
                  <Select value={filterType} onValueChange={(value: 'all' | 'income' | 'expense') => setFilterType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Transactions</SelectItem>
                      <SelectItem value="income">Income Only</SelectItem>
                      <SelectItem value="expense">Expenses Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Sort By</Label>
                  <Select value={sortBy} onValueChange={(value: 'date' | 'amount' | 'description') => setSortBy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="description">Description</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Order</Label>
                  <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest First</SelectItem>
                      <SelectItem value="asc">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search descriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle>
                {filteredAndSortedTransactions.length} Transaction{filteredAndSortedTransactions.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAndSortedTransactions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No transactions found</p>
                  <p className="mt-2 text-sm">Try adjusting your filters or add a new transaction</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAndSortedTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex size-12 items-center justify-center rounded-full ${
                          transaction.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          <span className="text-xl">{transaction.description[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{new Date(transaction.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}</span>
                            {transaction.category && (
                              <>
                                <span>•</span>
                                <span>{transaction.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className={`text-lg font-semibold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
