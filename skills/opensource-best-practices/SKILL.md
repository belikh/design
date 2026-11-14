# opensource-best-practices

## Description

Teach an agent the full set of open source best practices from [GitHub's Open Source Guides](https://opensource.guide/) so the agent applies them when helping you create, maintain, contribute to, or govern open source projects.

Load this skill when you are about to:
- Start a new open source project (repository setup, licensing, README, CONTRIBUTING, CODE_OF_CONDUCT)
- Review or improve an existing project's health (docs, community, security, accessibility, governance)
- Contribute to someone else's project (issues, pull requests, communication)
- Set up maintainer workflows (triage, automation, releases, burnout boundaries)
- Make decisions about funding, metrics, legal, or leadership for a project

## What this skill covers

GitHub's Open Source Guides are 13 guides. Each one is summarised below with an "agent checklist" — concrete things your agent can do or produce for you.

---

## 1. Starting an Open Source Project

### What the guide says
Open source means anybody is free to use, study, modify, and distribute your project, enforced by a licence. "Free" refers to freedom, not price. Before launching, set goals (show off work vs. grow contributors vs. solve a problem). Every project should ship with:
- a LICENSE (MIT, Apache 2.0, or GPLv3 are the most popular)
- a README (what it does, why it's useful, how to get started, where to get help)
- a CONTRIBUTING file (how to participate, bug reports, feature suggestions, setup/tests)
- a CODE_OF_CONDUCT

Pick a name that is easy to remember, hints at what the project does, and does not conflict with existing projects or trademarks. The pre-launch checklist covers documentation, code (consistent conventions, no secrets in history), and people (legal/IP clarity, someone committed to community management, at least two admins).

### Agent checklist
- [ ] Suggest a licence (default MIT unless copyleft or patent needs apply) and add a LICENSE file
- [ ] Draft a README answering: what does it do, why useful, how to start, where to get help
- [ ] Draft a CONTRIBUTING file with issue/PR templates and setup/test instructions
- [ ] Add a CODE_OF_CONDUCT (Contributor Covenant is the default) linked from README/CONTRIBUTING
- [ ] Review the proposed project name for conflicts and trademark risk
- [ ] Run the pre-launch checklist (docs, code, people) before going public

---

## 2. How to Contribute to Open Source

### What the guide says
You don't have to contribute code — docs, design, organising, answering questions, and mentoring all count. Before contributing, scan the project (LICENSE, recent commits, open/closed issues and PRs, responsiveness) to confirm it's active and welcoming. Communicate effectively: give context, do your homework, keep requests short and public, assume good intentions, respect community decisions. Open an issue to discuss before a substantial PR. Open a PR early (draft/WIP), reference issues, include before/after screenshots for UI, test your changes, review AI-assisted output carefully, and match the project's style. After submission: no response → polite ping in the same thread (never private); changes requested → be responsive; not accepted → ask for feedback, respect the decision, fork if you disagree.

### Agent checklist
- [ ] Scan the target project with the checklist before any work
- [ ] Draft clear, context-rich issue or PR text (what, why, how to reproduce)
- [ ] Open an issue first for substantial work; open PRs early as drafts
- [ ] Include tests, screenshots for UI changes, and match project style
- [ ] Flag any AI-generated code for careful review before submission
- [ ] If no response, post a polite public ping; never DM maintainers

---

## 3. Best Practices for Maintainers

### What the guide says
Maintaining is more than code — it's issues, reviews, and community. Document your processes: write down the project vision (README or VISION), communicate expectations (how contributions are reviewed, what you accept, response time, hours you spend), and keep communication public. Learn to say no kindly and firmly: thank the contributor, explain why it doesn't fit scope, link to documentation, close the request. Be proactive with templates/checklists so contributors self-filter. Embrace mentorship for enthusiastic but rough contributors. Leverage your community: label "good first issue", share ownership (give commit access to repeat contributors, move to an Organisation with a backup admin), let others build on forks or via plugins/hooks. Bring in the robots: require tests and status checks on all contributions; automate with semantic-release, mention-bot, Danger, dependabot, issue/PR templates. It's okay to hit pause — take breaks, set boundaries (e.g. 2–5 hours/week), communicate when unavailable.

### Agent checklist
- [ ] Document project vision and contribution expectations in writing
- [ ] Keep all project communication public (direct people to issues, not DMs)
- [ ] Draft kind, firm "no" responses that reference documentation
- [ ] Add issue/PR templates and checklists to reduce low-quality contributions
- [ ] Set up required tests and status checks on branches
- [ ] Recommend automation tools (dependabot, semantic-release, Danger, mention-bot)
- [ ] Advise on boundaries and taking breaks to avoid burnout

---

## 4. Building Welcoming Communities

### What the guide says
Reduce friction at each stage of the contributor funnel (user → contributor → maintainer). Make documentation easy, clearly explain how to contribute, label "good first issue", thank newcomers, be responsive (replies within 48 hours strongly predict repeat contribution), accept diverse contribution types. Document everything in public — roadmap, decisions, meeting notes. Give the community a public place to congregate (issues, mailing list, chat); keep security and CoC reports private. Don't tolerate bad actors — call out unkind behaviour publicly and firmly, escalate to removal if needed. Meet contributors where they are (label issues by level, beginner landing pages). Share ownership (credit contributors, CONTRIBUTORS/AUTHORS file, newsletters, commit access, Organisation). Resolve conflicts: set the bar for kindness, treat README as constitution, seek consensus rather than voting, keep conversation focused on action, pick your battles, identify a tiebreaker in GOVERNANCE.md.

### Agent checklist
- [ ] Review docs for newcomer friction; add "good first issue" labels
- [ ] Draft responses that thank newcomers and acknowledge contributions
- [ ] Set up a public community channel and direct off-list questions to it
- [ ] Draft conflict-resolution responses (kind, firm, action-focused)
- [ ] Propose sharing ownership (commit access, Organisation, contributor credits)
- [ ] Recommend a GOVERNANCE.md with a named tiebreaker

---

## 5. Code of Conduct

### What the guide says
A CoC establishes behaviour expectations and protects participants and maintainers. Establish it early (ideally at project creation). Use prior art — Contributor Covenant (40,000+ projects), Django CoC, or Citizen Code of Conduct. Place CODE_OF_CONDUCT in the repo root, link from README/CONTRIBUTING. Decide enforcement before a violation: scope, who it applies to, what happens on violation, how to report (private email path), and an alternate recipient if the report is about the receiver. Enforce: gather information, take it seriously, don't argue publicly; respond with a public warning, private reach-out, suspension, or permanent ban as appropriate. Maintainers enforce fairly and even-handedly; a report that doesn't technically violate the CoC may still signal a community problem to investigate.

### Agent checklist
- [ ] Add CODE_OF_CONDUCT (Contributor Covenant default) to repo root
- [ ] Define reporting path (private email + alternate recipient) and enforcement scope
- [ ] Draft enforcement response templates (warning, private reach-out, escalation)
- [ ] Advise maintainers to take all reports seriously and act consistently

---

## 6. Leadership and Governance

### What the guide says
Formalise roles as the project grows: maintainer, contributor, committer. Define how someone becomes a maintainer and write it into GOVERNANCE.md. Move to a GitHub Organisation with at least one backup admin. Three common governance structures: BDFL (one person final say, e.g. Python), meritocracy (Apache), liberal contribution (Node.js, Rust — consensus-seeking, not pure voting). Give commit access based on demonstrated commitment, or openly to encourage ownership (with protected branches). Corporate contributors are normal — evaluate on technical merits, not payment. You don't need a legal entity unless handling money; fiscal sponsors (Software Freedom Conservancy, Apache, Linux Foundation, Open Collective) exist for donations.

### Agent checklist
- [ ] Draft GOVERNANCE.md: roles, how to become a maintainer, decision-making model
- [ ] Recommend BDFL / meritocracy / liberal contribution based on project size and goals
- [ ] Advise on commit-access policy and protected branches
- [ ] Suggest moving to a GitHub Organisation with a backup admin
- [ ] Note fiscal-sponsor options if the project will handle money

---

## 7. Open Source Metrics

### What the guide says
Measure to make better decisions: discovery (traffic, referrers, stars), usage (downloads, clones), retention (contributor count, first-time/casual/repeat contributors, open issues/PRs, types of contributions), and maintainer activity (response time — replies within 48 hours predict repeat contribution; time to issue close, PR merge, stale-issue closure). Use GitHub Insights/Traffic, Libraries.io, clone graphs. Popularity isn't everything — align metrics with your goals. CHAOSS is a community for open source metrics.

### Agent checklist
- [ ] Set up a metrics dashboard or simple tracking sheet (discovery, usage, retention, maintainer activity)
- [ ] Track response time to issues/PRs and flag slow-reply areas
- [ ] Monitor first-time vs. repeat contributor rates
- [ ] Recommend CHAOSS resources for deeper metric practice

---

## 8. Security Best Practices for Your Project

### What the guide says
Enable MFA for all privileged contributors. Run SAST in the dev workflow (CodeQL, Semgrep) to catch vulnerabilities early. Prevent secrets with secret scanning (GitHub Secret Scanning, Trufflehog) — never commit API keys/tokens/passwords. Check and update dependencies with SCA (Dependabot, Renovate) against NVD/GitHub Advisory Database. Manage licence risk and generate an SBOM. Use protected branches so changes to main require review and status checks. Make security reporting easy and safe: publish SECURITY.md, use private vulnerability reporting (GitHub PVR / GitLab private issues), define a lightweight threat model (scope, what's trusted, how it could be misused — OWASP threat modeling). Prepare a lightweight incident response process (who triages, severity evaluation, fix/disclosure coordination, user notification). Treat security as a team effort: least privilege, education, diverse team, engage upstream/downstream.

### Agent checklist
- [ ] Confirm MFA is required for all privileged contributors/admins
- [ ] Add SAST (CodeQL or Semgrep) to CI/code review
- [ ] Enable secret scanning; audit history for committed secrets
- [ ] Enable Dependabot/Renovate for dependency updates
- [ ] Generate/review an SBOM and check dependency licences
- [ ] Set up protected branches with required reviews/status checks
- [ ] Draft SECURITY.md with reporting path and expected response time
- [ ] Draft a lightweight threat model
- [ ] Sketch an incident response checklist (triage, severity, disclosure, notification)

---

## 9. Accessibility Best Practices for Your Project

### What the guide says
Accessibility (a11y) means people can use your project regardless of disability, assistive tech, environment, or device. Center people with disabilities — "nothing about us without us". Start with an accessibility statement (ACCESSIBILITY.md linked from README; WCAG AA goals; known limitations; how to report). Make docs accessible: logical heading hierarchy, unique descriptive link text, plain language, real lists, alt text for images, captions/transcripts for video, tables for data with headers, short code blocks. Design accessible interfaces: full keyboard support, visible focus, logical tab order, native HTML over ARIA, labels on every form control, colour never the only meaning, adequate contrast, respect reduced motion, touch targets ≥24×24 CSS px, single-pointer alternatives. Make tools accessible: CLI `--help`, machine-readable `--json`, text labels + exit codes not colour alone, clear error messages. Build a11y into contribution workflows: a11y label + issue template, PR checklist, definition of done, Copilot agents for a11y auditing. Test continuously: automated linting/CI scanning plus manual keyboard-only, screen reader (VoiceOver/NVDA/JAWS), 200% zoom, high-contrast checks. Start small: ACCESSIBILITY.md, keyboard reachability, form labels, lang attribute, alt text, PR checklist item.

### Agent checklist
- [ ] Draft ACCESSIBILITY.md statement (goals, priorities, limitations, reporting path)
- [ ] Add an accessibility issue label and issue template (severity taxonomy)
- [ ] Add an a11y checklist to PR templates
- [ ] Audit docs: headings, link text, alt text, captions, tables, code blocks
- [ ] Audit UI: keyboard navigation, focus indicators, labels, contrast, reduced motion, touch targets
- [ ] Audit CLI: --help, --json output, exit codes, text-based errors
- [ ] Set up automated a11y linting in CI (axe-core / GitHub Accessibility Scanner)
- [ ] Recommend manual smoke tests (keyboard-only, screen reader, zoom)

---

## 10. Getting Paid for Open Source Work

### What the guide says
Funding is legitimate and broadens who can contribute. Two paths: fund your own time (ask your employer; GitHub Sponsors; Patreon; Kickstarter; issue bounties) or find project funding (crowdfunding/sponsorships — OpenCollective, Ruby Together; revenue streams — paid support/hosted/features; grants — Mozilla, Sloan, FLOSS/fund, GitHub Secure Open Source Fund, PSF). Build a case: impact, traction, value to funder, use of funds (milestones, not just salary), how funds are received (nonprofit/fiscal sponsor may be required). Experiment and don't give up.

### Agent checklist
- [ ] Help draft a funding case: impact, traction, funder value, use of funds
- [ ] Identify funding route (employer, Sponsors, Patreon, grants, sponsorship)
- [ ] Advise on fiscal sponsor/nonprofit needs if receiving grants/donations

---

## 11. Maintaining Balance for Open Source Maintainers

### What the guide says
Burnout is real; personal ecology = balance, pacing, efficiency to sustain energy long-term. Identify your motivations. Reflect on stressors: lack of positive feedback, not saying no, working alone, not enough time/resources, conflicting demands. Watch for signs of burnout. Sustain yourself: lean on community/delegate, explore funding, use automation tools, rest and recharge (weekends off, GitHub status), set boundaries (say no, publish what you do/don't do, review issues only at set times), shut down toxicity. If stepping away, hand over to an enthusiastic maintainer or link to an active fork.

### Agent checklist
- [ ] Help the maintainer articulate boundaries (hours, response times, what's in/out of scope)
- [ ] Draft a "taking a break" / handoff communication
- [ ] Suggest delegation and automation to reduce maintainer load
- [ ] Flag signs of burnout and encourage breaks/funding

---

## 12. The Legal Side of Open Source

### What the guide says
Copyright is exclusive by default; you must explicitly licence to give permissions. Public on GitHub ≠ open source (GitHub ToS lets people view/fork but grants no use rights). TL;DR: add MIT, Apache 2.0, or GPLv3 from choosealicense.com; avoid custom licence text. Permissive deps (MIT/Apache/ISC/BSD) let you licence however you want; strong copyleft (GPLv2/v3, AGPLv3) requires same/compatible licence; weak copyleft (MPL 2.0, LGPL) has extra rules; source-available (BSL, SSPL) is not OSI open source. Non-code assets (images, fonts) have their own licences (Creative Commons range). Changing licence is a governance event — check compatibility and copyright holders; consider CLA/DCO for pre-approval. You generally don't need a CLA (inbound=outbound is GitHub's default); use DCO or a CLA only for patent grants, copyright assignment, or future licence changes. Company legal: IP/employee agreements, trade secrets, patents, trademarks, privacy, AI terms, SBOM requirements. Maintain an SBOM for licence compliance.

### Agent checklist
- [ ] Confirm a standard licence file exists; advise against custom licence text
- [ ] Check dependency licence compatibility (permissive vs copyleft vs source-available)
- [ ] Flag non-code asset licences (images, fonts)
- [ ] Draft CLA/DCO guidance only where justified (patents, copyright assignment, licence changes)
- [ ] Advise company contributors to clear IP with legal first
- [ ] Recommend maintaining an SBOM

---

## Master agent checklist (apply to any open source project)

Before declaring a project "healthy," verify:

- [ ] LICENSE present and standard (MIT / Apache 2.0 / GPLv3)
- [ ] README answers: what, why, how to start, where to get help
- [ ] CONTRIBUTING + CODE_OF_CONDUCT present and linked
- [ ] SECURITY.md with private reporting path
- [ ] ACCESSIBILITY.md statement and a11y label
- [ ] GOVERNANCE.md with roles and tiebreaker (if growing)
- [ ] MFA on all privileged accounts
- [ ] Protected branches with required reviews/status checks
- [ ] SAST + secret scanning + Dependabot enabled
- [ ] Tests required on all contributions
- [ ] SBOM maintained
- [ ] Public communication channels; private path for security/CoC reports
- [ ] Maintainer boundaries documented; breaks encouraged

## Repo hygiene: LICENCE, CONTRIBUTING, CODE_OF_CONDUCT across all repos

Every repo in this monorepo should have these three files at its root:

- `LICENSE` — MIT (standard, short, nobody needs a lawyer)
- `CONTRIBUTING.md` — how to participate, what's welcome, what's not
- `CODE_OF_CONDUCT.md` — Contributor Covenant, linked from README

### Repos to check

| Repo | Path | LICENSE | CONTRIBUTING | CODE_OF_CONDUCT |
|------|------|---------|--------------|-----------------|
| Root (design system) | `.` | | | |
| Tokens | `packages/tokens` | | | |
| UI | `packages/ui` | | | |
| Graphics | `packages/graphics` | | | |
| Fonts | `packages/fonts` | | | |
| LaTeX | `packages/latex` | | | |
| Rust | `packages/rust` | | | |
| ESPHome | `packages/esphome` | | | |
| GitHub kit | `packages/github` | | | |
| Admin app | `apps/admin` | | | |

### Agent checklist

- [ ] For each repo, check whether `LICENSE`, `CONTRIBUTING.md`, and `CODE_OF_CONDUCT.md` exist at the root
- [ ] Copy the template from `skills/opensource-best-practices/templates/` into any repo missing a file
- [ ] Link CODE_OF_CONDUCT and CONTRIBUTING from each repo's README
- [ ] Update the table above when a repo is added or a file is created

### Templates

Templates live in `skills/opensource-best-practices/templates/`:

- `LICENSE` — MIT licence
- `CONTRIBUTING.md` — contributing guide (personal project, PRs welcome but slow)
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1

## Produced artefacts your agent can draft

`LICENSE`, `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `GOVERNANCE.md`, `VISION`, issue and pull request templates, enforcement response templates, incident response checklist, threat model outline, funding case, metrics tracking sheet, SBOM inventory.

## Source

All guidance above is drawn from GitHub's Open Source Guides (https://opensource.guide/): Accessibility, Security, Maintaining Balance, How to Contribute, Starting a Project, Finding Users, Building Welcoming Communities, Best Practices for Maintainers, Leadership and Governance, Getting Paid, Code of Conduct, Open Source Metrics, and The Legal Side of Open Source.
