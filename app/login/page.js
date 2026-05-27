'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import styles from './login.module.css'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (searchParams.get('signup') === 'true') setIsSignup(true)
  }, [searchParams])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignup) {
      const { data: signUpData, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else if (signUpData?.user) {
        await supabase.from('profiles').upsert({ id: signUpData.user.id, email: signUpData.user.email })
        router.push('/dashboard')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.logo}>Paper<span>Gone</span></Link>
      <div className={styles.card}>
        <h1 className={styles.title}>{isSignup ? 'Create account' : 'Welcome back'}</h1>
        <p className={styles.sub}>{isSignup ? 'Start organizing your documents with AI' : 'Sign in to your account'}</p>

        {message && <div className={styles.successMsg}>{message}</div>}
        {error && <div className={styles.errorMsg}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className={styles.input}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Loading...' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className={styles.toggle}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button className={styles.toggleBtn} onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? 'Sign in' : 'Sign up free'}
          </button>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
