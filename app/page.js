'use client'
import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <nav className={styles.nav}>
        <div className={styles.logo}>Paper<span>Gone</span></div>
        <div className={styles.navLinks}>
          <Link href="/login" className={styles.navLogin}>Sign in</Link>
          <Link href="/login?signup=true" className={styles.navCta}>Get started free</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.badge}>AI-powered document assistant</div>
        <h1 className={styles.heroTitle}>
          Upload chaos.<br />Receive organization.
        </h1>
        <p className={styles.heroSub}>
          PaperGone automatically scans, reads, categorizes, and organizes your documents using AI. Receipts, bills, contracts, warranties — all handled instantly.
        </p>
        <div className={styles.heroCtas}>
          <Link href="/login?signup=true" className={styles.ctaPrimary}>Start for free →</Link>
          <Link href="#how" className={styles.ctaSecondary}>See how it works</Link>
        </div>
      </section>

      <section className={styles.demoBox}>
        <div className={styles.demoInner}>
          <div className={styles.demoLeft}>
            <div className={styles.demoDoc}>
              <div className={styles.demoDocIcon}>🧾</div>
              <div>
                <div className={styles.demoDocTitle}>Electricity bill March 2026</div>
                <div className={styles.demoDocSub}>€84.50 · Due April 15</div>
              </div>
              <div className={styles.demoBadge} style={{background:'#fdf3e3',color:'#92600a'}}>bill</div>
            </div>
            <div className={styles.demoDoc}>
              <div className={styles.demoDocIcon}>📄</div>
              <div>
                <div className={styles.demoDocTitle}>Lease agreement 2025</div>
                <div className={styles.demoDocSub}>Expires Dec 31, 2025</div>
              </div>
              <div className={styles.demoBadge} style={{background:'#eaf0fb',color:'#1a4a8a'}}>contract</div>
            </div>
            <div className={styles.demoDoc}>
              <div className={styles.demoDocIcon}>🛡️</div>
              <div>
                <div className={styles.demoDocTitle}>Samsung TV warranty</div>
                <div className={styles.demoDocSub}>Valid until 2027</div>
              </div>
              <div className={styles.demoBadge} style={{background:'#e8f5ee',color:'#1a7a4a'}}>warranty</div>
            </div>
          </div>
          <div className={styles.demoRight}>
            <div className={styles.demoArrow}>→</div>
            <div className={styles.demoAi}>
              <div className={styles.demoAiTitle}>AI organized</div>
              <div className={styles.demoAiItem}>📁 Bills / Energy / 2026</div>
              <div className={styles.demoAiItem}>📁 Legal / Lease</div>
              <div className={styles.demoAiItem}>📁 Warranties / Electronics</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features} id="how">
        <h2 className={styles.sectionTitle}>Everything handled automatically</h2>
        <div className={styles.featGrid}>
          {[
            { icon: '🔍', title: 'AI reads your docs', desc: 'Extracts dates, amounts, company names, deadlines — everything important.' },
            { icon: '📂', title: 'Smart folders', desc: 'Automatically creates and organizes into Bills, Contracts, Warranties, Taxes and more.' },
            { icon: '🔔', title: 'Deadline reminders', desc: 'Never miss a due date. AI detects expiry dates and payment deadlines.' },
            { icon: '🤝', title: 'Share with others', desc: 'Share bills with roommates, receipts with coworkers, documents with your partner.' },
            { icon: '🔎', title: 'Natural search', desc: 'Ask "show unpaid bills" or "find car documents" and get instant results.' },
            { icon: '🔒', title: 'Private & secure', desc: 'Your documents are encrypted. Only you (and who you invite) can see them.' },
          ].map((f, i) => (
            <div key={i} className={styles.featCard}>
              <div className={styles.featIcon}>{f.icon}</div>
              <h3 className={styles.featTitle}>{f.title}</h3>
              <p className={styles.featDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.pricing}>
        <h2 className={styles.sectionTitle}>Simple pricing</h2>
        <p className={styles.pricingSub}>Start free. Upgrade when you need more.</p>
        <div className={styles.pricingGrid}>
          <div className={styles.pricingCard}>
            <div className={styles.pricingName}>Starter</div>
            <div className={styles.pricingPrice}>€0<span>/mo</span></div>
            <div className={styles.pricingDesc}>Perfect to try PaperGone</div>
            <ul className={styles.pricingList}>
              <li>✓ 20 documents total</li>
              <li>✓ AI scanning & extraction</li>
              <li>✓ Smart folders</li>
              <li>✓ Search</li>
              <li style={{color:'#9e9e9e'}}>✗ Reminders</li>
              <li style={{color:'#9e9e9e'}}>✗ Sharing</li>
            </ul>
            <Link href="/login?signup=true" className={styles.pricingBtn}>Get started free</Link>
          </div>
          <div className={styles.pricingCard} style={{border:'2px solid #1a1a1a'}}>
            <div className={styles.pricingBadge}>Most popular</div>
            <div className={styles.pricingName}>Pro</div>
            <div className={styles.pricingPrice}>€9<span>/mo</span></div>
            <div className={styles.pricingDesc}>For individuals & freelancers</div>
            <ul className={styles.pricingList}>
              <li>✓ Unlimited documents</li>
              <li>✓ Everything in Starter</li>
              <li>✓ Deadline reminders</li>
              <li>✓ Share documents</li>
              <li>✓ Advanced AI search</li>
              <li>✓ Priority support</li>
            </ul>
            <Link href="/login?signup=true" className={styles.pricingBtn} style={{background:'#1a1a1a',color:'white'}}>Start free trial</Link>
          </div>
          <div className={styles.pricingCard}>
            <div className={styles.pricingName}>Business</div>
            <div className={styles.pricingPrice}>€49<span>/mo</span></div>
            <div className={styles.pricingDesc}>For teams & companies</div>
            <ul className={styles.pricingList}>
              <li>✓ Everything in Pro</li>
              <li>✓ Team sharing & spaces</li>
              <li>✓ Multiple users</li>
              <li>✓ Admin dashboard</li>
              <li>✓ Permission controls</li>
              <li>✓ Dedicated support</li>
            </ul>
            <Link href="/login?signup=true" className={styles.pricingBtn}>Contact us</Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.logo}>Paper<span>Gone</span></div>
        <p style={{color:'#9e9e9e',fontSize:'13px',marginTop:'8px'}}>© 2026 PaperGone. All rights reserved.</p>
      </footer>
    </main>
  )
}
