"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { SupabaseAuthClient } from "@supabase/supabase-js/dist/module/lib/SupabaseAuthClient"
import { sign } from "crypto"
import { redirect } from "next/dist/server/api-utils"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent the browser from refreshing the page.
    e.preventDefault()

    // Show loading UI (disable button, show spinner, etc.)
    setLoading(true)

    // Clear any previous error/success message.
    setMessage("")

    // Create a fresh Supabase client (reads env vars internally).
    const supabase = createClient()
    
    /*  
      Call the correct Supabase auth method based on the form mode.

      For sign-up:
        - supabase.auth.signUp({ email, password })
        - Always returns a "user" object (even if email already exists)
        - But the "session" is null until the user confirms their email
          IF email-confirmation is enabled (default on Supabase).

      For login:
        - supabase.auth.signInWithPassword({ email, password })
        - Returns a valid session on success
        - Returns an AuthError if credentials are wrong

      `error`:
        - null → request succeeded
        - object → something failed (invalid credentials, user exists, weak password, etc)
    */
    const { error } = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { first_name: firstName, last_name: lastName }
            }
          })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Custom message for already registered email during sign up
      if (isSignUp && error.message && error.message.toLowerCase().includes("already registered")) {
        setMessage("This email is already registered. Please log in instead.");
      } else {
        setMessage(error.message);
      }
    } else {
      // No error: request succeeded.
      setMessage(
        isSignUp 
          ? "Check your email to confirm your account."
          : "Success!"
      );
      if (!isSignUp) {
        window.location.href = "/";
      }
    }

    // End loading UI.
    setLoading(false)
  }

  const handleOAuthLogin = async (provider: 'google') => {
    // Create a Supabase client instance
    const supabase = createClient() // <-- you need () to call the function

    /*
      Initiate OAuth login with the chosen provider (Google or Apple).

      Supabase OAuth flow:
      - Opens a popup or redirects the user to the provider's login page.
      - The user authenticates with Google.
      - After success, the provider redirects back to your app at the `redirectTo` URL.

      Notes:
      - `redirectTo` should be a URL in your app where you handle the callback.
      - You can handle additional logic on the callback page, like saving user info or updating state.
    */
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/callback` // (auth) route group doesn't add to URL path
      }
    })

    // If OAuth login fails (network error, canceled login, etc.), display the error.
    if (error) setMessage(error.message)
  }


  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isSignUp ? "Create an account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            Login with your Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {message && (
              <p className="text-sm text-destructive mb-4">{message}</p>
            )}
            <FieldGroup>
              <Field>
                <Button variant="primary" type="button" onClick={() => handleOAuthLogin('google')}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Login with Google
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
              {/* First and Last Name fields only for sign up */}
              {isSignUp && (
                <>
                  <Field>
                    <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                    <Input
                      id="firstName"
                      value={firstName}
                      placeholder="First Name"
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                    <Input
                      id="lastName"
                      value={lastName}
                      placeholder="Last Name"
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </Field>
                </>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  placeholder="Email"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {!isSignUp && (
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  placeholder="Password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Loading..." : (isSignUp ? "Sign up" : "Login")}
                </Button>
                <FieldDescription className="text-center">
                  {isSignUp ? "Already have an account? " : "Don't have an account? "}
                  <a 
                    href="#"
                    onClick={(e) => {
                    e.preventDefault()
                    setIsSignUp(!isSignUp)
                    }}
                  >
                    {isSignUp ? "Sign in" : "Sign up"}
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
      
    </div>
  )
}
