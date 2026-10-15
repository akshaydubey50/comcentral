import { Button } from '@mui/material';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Building2, ChartNoAxesCombined, FileCheck2, History, SearchCheck } from 'lucide-react';

import styles from './welcome-content.module.css';

const capabilities = [
  { id: 'directory', icon: <SearchCheck aria-hidden />, label: 'PEOPLE', title: 'Keep the directory useful', description: 'Create, update, archive, restore, filter, and export employee records from one workspace.', detail: 'A clear view of the people behind the numbers.' },
  { id: 'csv-import', icon: <FileCheck2 aria-hidden />, label: 'MIGRATION', title: 'Review CSV migrations', description: 'Validate a CSV, inspect row-level issues, and confirm the reviewed file before records are imported.', detail: 'Review first. Import with confidence.' },
  { id: 'salary-history', icon: <History aria-hidden />, label: 'HISTORY', title: 'Keep salary decisions traceable', description: 'Record each salary change with its reason, previous amount, new amount, author, and date. Revisit the history on the employee record.', detail: 'The amount changes. The context stays.' },
  { id: 'reporting', icon: <ChartNoAxesCombined aria-hidden />, label: 'PERSPECTIVE', title: 'Understand current pay', description: 'Compare headcount, pay ranges, and tenure groups in native currencies, with dated approximate USD reporting when FX data is available.', detail: 'See the bigger picture. Keep the exact figures.' },
] as const;

const steps = [
  { title: 'Create your HR account', description: 'Register with your name, work email, and password to open the workspace immediately.' },
  { title: 'Bring your employee records', description: 'Add employees individually or download the CSV template, validate your file, and confirm the import.' },
  { title: 'Maintain and understand pay', description: 'Find employees, record salary changes, and explore reports for the population you select.' },
] as const;

/** A navigable explanation of the product, without invented employee data or metrics. */
function WorkspaceMap() {
  return (
    <aside className={styles.workspaceMap} aria-labelledby="workspace-map-title">
      <div className={styles.mapHeading}>
        <span className={styles.eyebrow}>THE CONNECTED RECORD</span>
        <span className={styles.mapMark} aria-hidden>CC</span>
      </div>
      <p id="workspace-map-title" className={styles.mapTitle}>Every number has a story.</p>
      <nav aria-label="Explore workspace tools">
        <a href="#directory" className={styles.mapLink} aria-labelledby="directory-link-label" aria-describedby="directory-link-description">
          <span className={styles.mapIcon}><SearchCheck aria-hidden /></span>
          <span><strong id="directory-link-label">Employee directory</strong><small id="directory-link-description">The person, role, and place</small></span>
          <ArrowRight size={18} aria-hidden />
        </a>
        <div className={styles.connector} aria-hidden><span />Record the change</div>
        <a href="#salary-history" className={`${styles.mapLink} ${styles.historyLink}`} aria-labelledby="history-link-label" aria-describedby="history-link-description">
          <span className={styles.mapIcon}><History aria-hidden /></span>
          <span><strong id="history-link-label">Salary history</strong><small id="history-link-description">The amount, reason, and author</small></span>
          <ArrowRight size={18} aria-hidden />
        </a>
        <div className={styles.connector} aria-hidden><span />See the context</div>
        <a href="#reporting" className={styles.mapLink} aria-labelledby="insights-link-label" aria-describedby="insights-link-description">
          <span className={styles.mapIcon}><ChartNoAxesCombined aria-hidden /></span>
          <span><strong id="insights-link-label">Pay insights</strong><small id="insights-link-description">The groups, ranges, and patterns</small></span>
          <ArrowRight size={18} aria-hidden />
        </a>
      </nav>
      <p className={styles.mapCaption}>Explore how the workspace fits together <ArrowDown size={14} aria-hidden /></p>
    </aside>
  );
}

/** Shared public presentation for anonymous home and the permanent welcome route. */
export function WelcomeContent() {
  return (
    <div className={styles.page}>
      <Button component="a" className="skip-link" href="#home-content">Skip to content</Button>
      <header className={`${styles.container} ${styles.header}`}>
        <Link href="/" aria-label="ComCentral home" className={styles.brand}>
          <span className={styles.brandIcon}><Building2 size={23} aria-hidden /></span>
          <span><strong>ComCentral</strong><small>People &amp; pay, connected.</small></span>
        </Link>
        <nav aria-label="Home navigation" className={styles.headerNav}>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Button component="a" href="/login" variant="outlined">Sign in</Button>
        </nav>
      </header>

      <main id="home-content" tabIndex={-1}>
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="home-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span className={styles.accentLine} aria-hidden />YOUR PEOPLE. THE FULL PICTURE.</p>
            <h1 id="home-title" className={styles.heroTitle}>Know your people. <span>Understand their pay.</span></h1>
            <p className={styles.heroDescription}>Bring employee records, salary decisions, and reporting into a single, traceable workflow. A little less spreadsheet. A lot more context.</p>
            <nav aria-label="Get started" className={styles.heroActions}>
              <Button component="a" href="/register" variant="contained" size="large" endIcon={<ArrowRight size={18} aria-hidden />}>Create account</Button>
              <Button component="a" href="#features" size="large" endIcon={<ArrowDown size={17} aria-hidden />}>Explore the workspace</Button>
            </nav>
            <p className={styles.accessNote}>Immediate access. One shared HR workspace.</p>
          </div>
          <WorkspaceMap />
        </section>

        <section id="features" aria-labelledby="features-title" className={styles.features}>
          <div className={styles.container}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>FOUR PARTS. ONE WORKSPACE.</p>
              <h2 id="features-title">Practical tools for employee and compensation work</h2>
              <p>Start with a reliable record. Keep the detail that makes it useful.</p>
            </div>
            <div>
              {capabilities.map((capability, index) => (
                <article id={capability.id} key={capability.id} className={styles.featureRow} aria-labelledby={`${capability.id}-title`}>
                  <div className={styles.featureNumber} aria-hidden>0{index + 1}</div>
                  <div className={styles.featureName}>
                    <span className={styles.featureLabel}>{capability.icon}{capability.label}</span>
                    <h3 id={`${capability.id}-title`}>{capability.title}</h3>
                  </div>
                  <div className={styles.featureDescription}>
                    <p>{capability.description}</p>
                    <p className={styles.featureDetail}>{capability.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="workflow-title" className={`${styles.container} ${styles.workflow}`}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>A STRAIGHTFORWARD START</p>
            <h2 id="workflow-title">From spreadsheet to daily HR work</h2>
          </div>
          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepMarker} aria-hidden>{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="access-title" className={`${styles.container} ${styles.accessSection}`}>
          <div className={styles.accessContent}>
            <p className={styles.eyebrow}>READY WHEN YOU ARE</p>
            <h2 id="access-title">One shared HR workspace</h2>
            <p>Every registered HR account can view and manage the same organization&apos;s employee and salary records. Registration opens the workspace immediately, with no invitation or approval step.</p>
          </div>
          <Button component="a" href="/register" variant="contained" size="large" endIcon={<ArrowRight size={18} aria-hidden />} sx={{ bgcolor: 'primary.light', color: 'primary.dark', '&:hover': { bgcolor: 'white' } }}>Get started with ComCentral</Button>
        </section>
      </main>

      <footer className={`${styles.container} ${styles.footer}`}>
        <div><strong>ComCentral</strong><p>Employee records. Annual base pay. Clear context.</p></div>
        <Button component="a" href="/login" endIcon={<ArrowRight size={16} aria-hidden />}>Open your workspace</Button>
      </footer>
    </div>
  );
}
