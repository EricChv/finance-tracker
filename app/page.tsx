'use client'

import { useState } from "react"

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
  const [category, setCategory] = useState('')

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
    setCategory('food') // Resets category back to default 'food'
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
  
  return (
    
  <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px'}}>
      <h1>Spending Tracker</h1>

      <form onSubmit={handleAddExpense}>
        <h2>Add New Expense</h2>

        {/* start: container for exp. description */}
        <div> 

          <label>
            Amount: $
            <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            />
          </label>

          <label>
            Description:
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </label>

          <label>
            Category:
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="online-purchases"> 💻 Online Purchases</option>
              <option value="bills">💡 Bills</option>
              <option value="food">🍔 Food</option>
              <option value="transport">🚗 Transport</option>
              <option value="entertainment">🎮 Entertainment</option>
              <option value="other">📦 Other</option>
            </select>
          </label>

        </div>
        {/* end: container for exp. description */}

        <button type="submit">Add expense</button>
      </form>

      <div style={{marginTop:'30px', padding:'15px', backgroundColor:'f0f0f0', borderRadius:'8px'}}>
        {/* fixed to 2 decimals */}
        <h2>Total Spending: ${total.toFixed(2)}</h2>
      </div>
      
      <div>
        <h2>Expenses ({expenses.length})</h2>
        {expenses.length === 0 ? (
          <p>No expenses yet. Add one above.</p>
        ) : (
          // show list
          <ul style={{listStyle: 'none', padding: 0}}>
            {expenses.map((expense) => (
              <li key={expense.id} style={{ padding: '15px', marginBottom:'10', border: '1px solid #ddd', borderRadius: '8px'}}>
                <strong>{expense.description}</strong> - ${expense.amount.toFixed(2)}
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {expense.category} • {expense.date}
                </div>
                <button  onClick={() => handleDeleteExpense(expense.id)} style={{ padding: '5px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  )
}