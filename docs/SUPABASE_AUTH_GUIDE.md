# Supabase Authentication & RLS Guide

## How Authentication Works in This App

### Overview
This document explains how Supabase knows which user is making a request and how Row Level Security (RLS) protects user data.

---

## 1. Authentication Flow

### Login Process
When a user logs in (see `src/components/login-form.tsx`):

```typescript
// From login-form.tsx
const supabase = createClient()
const { error } = await supabase.auth.signInWithPassword({ email, password })
```

**What happens:**
1. Supabase verifies credentials
2. Generates a JWT (JSON Web Token) containing user info
3. Stores token in browser's localStorage
4. Returns session with user data

### JWT Token Structure
The token contains:
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // ← User's unique ID
  "email": "user@example.com",
  "role": "authenticated",
  "iat": 1670419200,  // Issued at timestamp
  "exp": 1670505600   // Expiration timestamp
}
```

---

## 2. How Database Queries Know the User

### Client-Side Query Example
From `src/app/(dashboard)/page.tsx`:

```typescript
// Create Supabase client
const supabase = createClient()

// Check authentication
const { data: { session } } = await supabase.auth.getSession()
// session.user.id = "550e8400-e29b-41d4-a716-446655440000"

// Query expenses (RLS automatically filters by user)
const { data: expenses } = await supabase
  .from('expenses')
  .select('*')
// Only returns expenses where user_id matches the authenticated user
```

### Behind the Scenes
Every request includes the JWT token in headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                      ↑ This token contains user_id
```

---

## 3. Row Level Security (RLS) Policies

### Database Schema (from SQL Editor)

```sql
-- expenses table
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount decimal(10,2) not null,
  description text not null,
  category text not null,
  date date not null default current_date,
  created_at timestamptz default now() not null
);

-- Enable RLS
alter table expenses enable row level security;
```

### RLS Policies

#### SELECT Policy (Read)
```sql
create policy "Users can view own expenses"
  on expenses for select
  using (auth.uid() = user_id);
  --     ↑ Gets user ID from JWT token
```

**Translation:**
```sql
-- When user queries expenses, Supabase automatically adds:
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
                 ↑ from auth.uid()
```

#### INSERT Policy (Create)
```sql
create policy "Users can insert own expenses"
  on expenses for insert
  with check (auth.uid() = user_id);
```

**What this means:**
- User can only insert rows where `user_id` matches their authenticated ID
- Prevents creating expenses for other users

#### UPDATE Policy (Modify)
```sql
create policy "Users can update own expenses"
  on expenses for update
  using (auth.uid() = user_id);
```

#### DELETE Policy (Remove)
```sql
create policy "Users can delete own expenses"
  on expenses for delete
  using (auth.uid() = user_id);
```

---

## 4. How `auth.uid()` Works

### The Magic Function

`auth.uid()` is a PostgreSQL function that:
1. Reads the JWT token from request headers
2. Verifies the signature (can't be faked)
3. Extracts the `sub` claim (user ID)
4. Returns it as a UUID

### Example in Action

**User A** (ID: `aaa-111`) queries expenses:
```typescript
const { data } = await supabase.from('expenses').select('*')
```

PostgreSQL executes:
```sql
SELECT * FROM expenses 
WHERE user_id = 'aaa-111'  -- from auth.uid()
```

**User B** (ID: `bbb-222`) queries expenses:
```typescript
const { data } = await supabase.from('expenses').select('*')
```

PostgreSQL executes:
```sql
SELECT * FROM expenses 
WHERE user_id = 'bbb-222'  -- from auth.uid()
```

**Result:** Each user only sees their own data!

---

## 5. Complete Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER LOGS IN                                             │
│    src/components/login-form.tsx                            │
│    → supabase.auth.signInWithPassword()                     │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SUPABASE GENERATES JWT                                   │
│    Token: { sub: "user-id-here", email: "...", ... }        │
│    Stored in: localStorage                                  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. USER MAKES DATABASE QUERY                                │
│    src/app/(dashboard)/page.tsx                             │
│    → supabase.from('expenses').select('*')                  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CLIENT AUTOMATICALLY ADDS JWT TO REQUEST                 │
│    Headers: { Authorization: "Bearer <jwt-token>" }         │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SUPABASE BACKEND RECEIVES REQUEST                        │
│    → Validates JWT signature                                │
│    → Extracts user_id from token                            │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. RLS POLICY RUNS                                          │
│    → auth.uid() returns "user-id-from-jwt"                  │
│    → Query becomes: WHERE user_id = auth.uid()              │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. DATABASE RETURNS ONLY USER'S DATA                        │
│    → Only rows where user_id matches authenticated user     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Code Examples from This Project

### Authentication Check (Dashboard)
```typescript
// src/app/(dashboard)/page.tsx
useEffect(() => {
  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')  // Redirect if not logged in
    } else {
      setLoading(false)
      // session.user.id contains the user's UUID
      // This ID is used by RLS policies automatically
    }
  }
  
  checkAuth()
}, [router])
```

### Insert with Automatic user_id
```typescript
// Example: Adding an expense
const supabase = createClient()

const { data, error } = await supabase
  .from('expenses')
  .insert({
    amount: 50.00,
    description: "Coffee",
    category: "food",
    date: "2025-12-08",
    user_id: session.user.id  // ← Must match authenticated user
  })

// RLS INSERT policy checks: auth.uid() = user_id
// If user tries to insert with different user_id, it fails!
```

### Query with Automatic Filtering
```typescript
// Example: Fetching expenses
const supabase = createClient()

const { data: expenses, error } = await supabase
  .from('expenses')
  .select('*')
  .order('date', { ascending: false })

// RLS SELECT policy adds: WHERE user_id = auth.uid()
// User automatically only sees their own expenses
// No need to manually add WHERE clause!
```

---

## 7. Security Features

### Why This is Secure

1. **JWT is signed** - Can't be forged or modified
2. **JWT expires** - Must re-authenticate periodically
3. **RLS runs on database** - Can't be bypassed from client code
4. **Server-side validation** - Even if client is compromised, database rejects invalid requests

### What If User Tries to Hack?

**Scenario:** Malicious user tries to view another user's data

```typescript
// Hacker tries to bypass RLS by querying with SQL injection
const { data } = await supabase
  .from('expenses')
  .select('*')
  .eq('user_id', 'some-other-users-id')  // ← Won't work!

// Result: Returns empty array []
// RLS policy still applies: WHERE user_id = auth.uid()
// Even with .eq() filter, database only returns rows matching their JWT
```

---

## 8. Best Practices

### Always Enable RLS
```sql
-- For every user-specific table
alter table your_table enable row level security;
```

### Use `on delete cascade`
```sql
-- When user is deleted, automatically delete their data
user_id uuid references auth.users(id) on delete cascade not null
```

### Check Authentication Client-Side
```typescript
// Redirect unauthenticated users
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  router.push('/login')
}
```

### Trust RLS, Not Client Code
```typescript
// ❌ DON'T rely on client-side filtering
const { data } = await supabase.from('expenses').select('*')
const myExpenses = data.filter(e => e.user_id === currentUser.id)

// ✅ DO trust RLS to filter automatically
const { data } = await supabase.from('expenses').select('*')
// Already filtered by RLS policy
```

---

## 9. Common Issues & Solutions

### Issue: "Row Level Security policy for table violated"
**Cause:** Trying to insert/update with wrong user_id

**Solution:** Make sure user_id matches session.user.id
```typescript
const { data: { session } } = await supabase.auth.getSession()
await supabase.from('expenses').insert({
  user_id: session.user.id,  // ← Must match authenticated user
  // ... other fields
})
```

### Issue: "No rows returned" when data exists
**Cause:** RLS policy filtering out rows

**Solution:** Check RLS policies in Supabase dashboard
- Table Editor → Click table → Policies tab
- Ensure SELECT policy exists with `auth.uid() = user_id`

### Issue: Can't delete other users' data (expected!)
**Cause:** DELETE policy prevents it (working as intended)

**Solution:** This is correct behavior. Users should only delete their own data.

---

## 10. Additional Resources

- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **RLS Guide:** https://supabase.com/docs/guides/database/postgres/row-level-security
- **JWT Debugger:** https://jwt.io (paste token to decode)
- **Project Reference:** Badget app - https://github.com/Codehagen/Badget

---

## Quick Reference

| Function | Purpose | Example |
|----------|---------|---------|
| `auth.uid()` | Get authenticated user ID | `WHERE user_id = auth.uid()` |
| `createClient()` | Create Supabase client | `const supabase = createClient()` |
| `auth.getSession()` | Get current session | `const { data: { session } } = await supabase.auth.getSession()` |
| `session.user.id` | User's UUID | `"550e8400-e29b-41d4-a716-446655440000"` |
| `enable row level security` | Turn on RLS | `alter table expenses enable row level security;` |

---

*Last updated: December 8, 2025*
*Project: Spending Tracker*
*Database: Supabase PostgreSQL*
