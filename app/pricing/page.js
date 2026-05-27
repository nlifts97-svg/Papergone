'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './pricing.module.css'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '€0',
    desc: 'Perfect to try PaperGone',
    features: ['20 documents total', 'AI scanning & extraction', 'Smart folders', 'Search'],
    missing: ['Reminders', 'Sharing', 'Unlimited docs'],
    cta: 'Current plan',
    disabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€9',
    period: '/mo',
    desc: 'For individuals & freelancers',
    popular: true,
    features: ['Unlimited documents', 'Everything in Starter', 'Deadline reminders', 'Share documents', 'Advanced AI search', 'Priority support'],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'business',
    name: 'Business',
    price: '€49',
    period: '/mo',
    desc: 'For teams & companies',
    features: ['Everything in Pro', 'Team sharing & spaces', 'Multiple users', 'Admin dashboard', 'Permission controls', 'Dedicated support'],
    cta: 'Upgrade to Business',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [currentPlan, setCurrentPlan] = useState('starter')
  const [loading, setLoading] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser(user)
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
      if (data?.plan) setCurrentPlan(data.plan)
    })
  }, [])

  async function handleUpgrade(planId) {
    if (!user) { router.push('/login?signup=true'); return }
    setLoading(planId)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId, userId: user.id, email: user.email })
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setLoading(null)
  }

  return (
    <main className={styles.main}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>Paper<span>Gone</span></Link>
        <Link href="/dashboard" className={styles.navLink}>← Back to dashboard</Link>
      </nav>

      <div className={styles.hero}>
        <h1 className={styles.title}>Choose your plan</h1>
        <p className={styles.sub}>Upgrade anytime. Cancel anytime. No hidden fees.</p>
      </div>

      <div className={styles.grid}>
        {PLANS.map(plan => (
          <div key={plan.id} className={`${styles.card} ${plan.popular ? styles.popular : ''} ${currentPlan === plan.id ? styles.current : ''}`}>
            {plan.popular && <div className={styles.badge}>Most popular</div>}
            {currentPlan === plan.id && <div className={styles.currentBadge}>Current plan</div>}
            <div className={styles.planName}>{plan.name}</div>
            <div className={styles.price}>{plan.price}<span>{plan.period}</span></div>
            <div className={styles.desc}>{plan.desc}</div>
            <ul className={styles.features}>
              {plan.features.map((f, i) => <li key={i}>✓ {f}</li>)}
              {plan.missing?.map((f, i) => <li key={i} className={styles.missing}>✗ {f}</li>)}
            </ul>
            <button
              className={`${styles.btn} ${plan.popular ? styles.btnPrimary : styles.btnSecondary}`}
              onClick={() => handleUpgrade(plan.id)}
              disabled={currentPlan === plan.id || loading === plan.id}
            >
              {loading === plan.id ? 'Loading...' : currentPlan === plan.id ? 'Current plan' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      <p className={styles.footer}>Payments handled securely by Stripe. Cancel anytime from your account settings.</p>
    </main>
  )
}
