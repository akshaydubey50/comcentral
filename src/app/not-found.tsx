import Link from 'next/link';
import { ArrowLeft, ArrowRight, Building2, Compass, Users } from 'lucide-react';

import styles from './not-found.module.css';

/** Next renders this boundary for unmatched URLs without redirecting to a fake route. */
export default function NotFound() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" prefetch={false} className={styles.brand} aria-label="ComCentral home">
          <span className={styles.brandIcon}><Building2 size={23} aria-hidden="true" /></span>
          <span>ComCentral<small>People. Pay. Perspective.</small></span>
        </Link>
        <span className={styles.workspace}>HR WORKSPACE</span>
      </header>

      <main id="main-content" className={styles.main}>
        <section className={styles.content} aria-labelledby="not-found-title">
          <p className={styles.eyebrow}><span /> ERROR 404</p>
          <h1 id="not-found-title">Page not found.<br /><em>Let’s find your way back.</em></h1>
          <p className={styles.description}>
            The page you’re looking for may have moved, or the link may be incorrect.
            Check the address or head back to a familiar place.
          </p>
          <nav className={styles.actions} aria-label="Page recovery">
            <Link href="/" prefetch={false} className={styles.primaryLink}>
              <ArrowLeft size={18} aria-hidden="true" /> Back to home
            </Link>
            <Link href="/employees" prefetch={false} className={styles.secondaryLink}>
              <Users size={18} aria-hidden="true" /> Employee directory
            </Link>
          </nav>
          <p className={styles.help}>
            New here? <Link href="/welcome" prefetch={false}>Explore ComCentral <ArrowRight size={14} aria-hidden="true" /></Link>
          </p>
        </section>

        <div className={styles.illustration} aria-hidden="true">
          <div className={styles.mapHeading}><span>A SMALL DETOUR</span><Compass size={23} /></div>
          <div className={styles.errorCode}>404</div>
          <svg className={styles.map} viewBox="0 0 360 130" fill="none">
            <path d="M28 100H103C127 100 127 34 154 34H205C233 34 226 100 255 100H330" stroke="currentColor" strokeWidth="2" strokeDasharray="5 7" />
            <circle cx="28" cy="100" r="7" fill="currentColor" />
            <circle cx="180" cy="34" r="21" fill="var(--lost-paper)" stroke="currentColor" strokeWidth="2" />
            <path d="M180 23V37M180 43V45" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="330" cy="100" r="7" fill="var(--lost-paper)" stroke="currentColor" strokeWidth="2" />
          </svg>
          <div className={styles.mapCaption}><span /> A clear way back to your workspace.</div>
        </div>
      </main>

      <footer className={styles.footer}>ComCentral <span>Employee salary management</span></footer>
    </div>
  );
}
