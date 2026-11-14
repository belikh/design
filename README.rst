.. raw:: html

   <p align="right">
     <picture>
       <source media="(prefers-color-scheme: dark)" srcset="packages/graphics/logo/jupiter-logo-dark.svg">
       <img alt="jupiter.au" src="packages/graphics/logo/jupiter-logo-light.svg" width="260">
     </picture>
   </p>

   <h1>Jupiter design system</h1>

.. meta::
   :description: Colour, type and shape for every jupiter.au surface, generated from one token file.

Colour, type and shape for websites, apps, email, terminals, kiosks, mobile, documents and READMEs, generated from one token file.

`Use it in a project <docs/consuming.md>`_ · `Change a token`_ · `Targets`_ · `Releases`_ · `Develop`_

|

.. raw:: html

   <p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="packages/github/graphics/rule/end-dark.svg"><img alt="" src="packages/github/graphics/rule/end-light.svg" width="50%"></picture></p>

Is this for you?
----------------

Probably not, and that's okay.

This is my personal design system — the colours, type and shapes I use across jupiter.au and my own projects. I'm putting it online because working in public helps me learn and keep track of things, not because I'm trying to build something other teams should adopt.

Please don't depend on this for your own project:

- There is no support. I work a full-time job and do this in the hours I have left.
- Breaking changes happen without notice.
- If something breaks, you get to keep both pieces.

But if you want to **fork it, copy ideas, borrow a token or two, or even send a pull request**, go right ahead. Yes, you can edit my website. I won't be offended — that's partly why it's public. Take what you find useful and leave the rest.

If you're looking for a design system to use in production, use one that has a team behind it. This one's just mine.

What is in here
---------------

.. list-table::
   :header-rows: 1
   :widths: 14 24 62

   * - Part
     - Where
     - What
   * - |tokens-l| |tokens-d| **Tokens**
     - ``packages/tokens``
     - ``jupiter.tokens.json``, the generators, and every built output
   * - |ui-l| |ui-d| **UI**
     - ``packages/ui``
     - React components, shared styles and the agent skills
   * - |graphics-l| |graphics-d| **Graphics**
     - ``packages/graphics``
     - One-line SVG icons, illustrations, dividers and the logo
   * - |fonts-l| |fonts-d| **Fonts**
     - ``packages/fonts``
     - The font files, as their own package
   * - |app-l| |app-d| **App**
     - ``apps/admin``
     - The design-system site and the admin template, one app
   * - |rust-l| |rust-d| **Rust**
     - ``packages/rust``
     - ``jupiter-theme`` crate with ratatui, egui and iced adapters
   * - |latex-l| |latex-d| **LaTeX**
     - ``packages/latex``
     - Classes and templates: resume, letter, notes, report, invoice
   * - |esphome-l| |esphome-d| **ESPHome**
     - ``packages/esphome``
     - Instrument widgets that emit ESPHome / LVGL snippets
   * - |github-l| |github-d| **GitHub**
     - ``packages/github``
     - README, profile and social-preview kit

Change a token
--------------

1. Edit ``packages/tokens/jupiter.tokens.json``. The ``/editor`` page of the app can build the JSON.
2. Run ``npm run build``. Every output is regenerated.
3. Bump the version with ``node scripts/bump-version.mjs X.Y.Z`` and push.

Projects depend on the published ``@belikh/jupiter-*`` packages and pick up the change with ``npm run update:design``.

Targets
-------

.. raw:: html

   <details>
   <summary><b>Every generated target</b></summary>

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Surface
     - Use
   * - Plain HTML / static sites
     - ``<link rel="stylesheet" href="https://<pages-host>/current/jupiter.css">``
   * - Any bundler (Vite, Astro, Next)
     - ``import "@belikh/jupiter-tokens/css"``
   * - Tailwind v4
     - ``@import "@belikh/jupiter-tokens/tokens.css"; @import "@belikh/jupiter-tokens/tailwind.css";``
   * - Variables or components only
     - ``tokens.css``, ``components.css`` (components sit in ``@layer jupiter``)
   * - Fonts
     - ``@belikh/jupiter-fonts/fonts.css``
   * - Kiosk touchscreens
     - ``@belikh/jupiter-tokens/kiosk.css``
   * - Email
     - ``@belikh/jupiter-tokens/email.html``
   * - Terminals / SSH
     - ``terminal.sh``, ``Xresources``
   * - Go TUIs
     - ``jupiter_theme.go``
   * - Rust (ratatui, egui, iced)
     - the ``jupiter-theme`` crate
   * - Slint, GTK4, Qt, KDE
     - ``jupiter.slint``, ``jupiter-gtk-*.css``, ``jupiter-qt.tgz``, ``Jupiter*.colors``
   * - iOS / Android
     - ``mobile.json``
   * - LaTeX
     - ``jupiter-latex.tgz``
   * - ESPHome
     - ``@belikh/jupiter-esphome``
   * - READMEs and profiles
     - ``jupiter-github.tgz``
   * - JS / TS
     - ``import { DEFAULT_TOKENS, generateCSS } from "@belikh/jupiter-tokens"``

.. raw:: html

   </details>

Documents
---------

The LaTeX templates, rendered with SGI Text and SGI Alt on every release. Click a page for the PDF.

.. raw:: html

   <table>
     <tr>
        <td align="center"><a href="https://github.com/belikh/design/releases/latest/download/latex-report.pdf"><img alt="Report" src="https://github.com/belikh/design/releases/latest/download/latex-report.png" width="170"></a><br><sub>Report</sub></td>
        <td align="center"><a href="https://github.com/belikh/design/releases/latest/download/latex-invoice.pdf"><img alt="Invoice" src="https://github.com/belikh/design/releases/latest/download/latex-invoice.png" width="170"></a><br><sub>Invoice</sub></td>
        <td align="center"><a href="https://github.com/belikh/design/releases/latest/download/latex-resume-classic.pdf"><img alt="Resume, classic" src="https://github.com/belikh/design/releases/latest/download/latex-resume-classic.png" width="170"></a><br><sub>Resume, classic</sub></td>
     </tr>
     <tr>
        <td align="center"><a href="https://github.com/belikh/design/releases/latest/download/latex-resume-sidebar.pdf"><img alt="Resume, sidebar" src="https://github.com/belikh/design/releases/latest/download/latex-resume-sidebar.png" width="170"></a><br><sub>Resume, sidebar</sub></td>
        <td align="center"><a href="https://github.com/belikh/design/releases/latest/download/latex-letter-formal.pdf"><img alt="Letter" src="https://github.com/belikh/design/releases/latest/download/latex-letter-formal.png" width="170"></a><br><sub>Letter</sub></td>
        <td align="center"><a href="https://github.com/belikh/design/releases/latest/download/latex-notes.pdf"><img alt="Notes" src="https://github.com/belikh/design/releases/latest/download/latex-notes.png" width="170"></a><br><sub>Notes</sub></td>
     </tr>
   </table>

Releases
--------

Every push to ``main`` runs the release workflow. If the token version is new, it:

1. checks the schema, WCAG AA contrast in light and dark, and that no variable or class was removed without a major bump;
2. publishes an immutable ``vX.Y.Z`` release with the generated files;
3. publishes the npm packages to GitHub Packages;
4. deploys the Pages site, when ``CLOUDFLARE_PAGES_PROJECT`` is set.

Develop
-------

.. code-block:: sh

   npm install
   npm run dev        # tokens, then the app on :3000
   npm run build
   npm run lint       # divergence guard rails and house style
   npm run typecheck

.. raw:: html

   <p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="packages/github/graphics/rule/end-dark.svg"><img alt="" src="packages/github/graphics/rule/end-light.svg" width="50%"></picture></p>

.. raw:: html

   <p align="right"><sub>jupiter.au</sub></p>

.. |tokens-l| image:: packages/github/graphics/icon/tokens-light.svg#gh-light-mode-only
   :width: 20
.. |tokens-d| image:: packages/github/graphics/icon/tokens-dark.svg#gh-dark-mode-only
   :width: 20
.. |ui-l| image:: packages/github/graphics/icon/ui-light.svg#gh-light-mode-only
   :width: 20
.. |ui-d| image:: packages/github/graphics/icon/ui-dark.svg#gh-dark-mode-only
   :width: 20
.. |graphics-l| image:: packages/github/graphics/icon/graphics-light.svg#gh-light-mode-only
   :width: 20
.. |graphics-d| image:: packages/github/graphics/icon/graphics-dark.svg#gh-dark-mode-only
   :width: 20
.. |fonts-l| image:: packages/github/graphics/icon/fonts-light.svg#gh-light-mode-only
   :width: 20
.. |fonts-d| image:: packages/github/graphics/icon/fonts-dark.svg#gh-dark-mode-only
   :width: 20
.. |app-l| image:: packages/github/graphics/icon/app-light.svg#gh-light-mode-only
   :width: 20
.. |app-d| image:: packages/github/graphics/icon/app-dark.svg#gh-dark-mode-only
   :width: 20
.. |rust-l| image:: packages/github/graphics/icon/rust-light.svg#gh-light-mode-only
   :width: 20
.. |rust-d| image:: packages/github/graphics/icon/rust-dark.svg#gh-dark-mode-only
   :width: 20
.. |latex-l| image:: packages/github/graphics/icon/latex-light.svg#gh-light-mode-only
   :width: 20
.. |latex-d| image:: packages/github/graphics/icon/latex-dark.svg#gh-dark-mode-only
   :width: 20
.. |esphome-l| image:: packages/github/graphics/icon/esphome-light.svg#gh-light-mode-only
   :width: 20
.. |esphome-d| image:: packages/github/graphics/icon/esphome-dark.svg#gh-dark-mode-only
   :width: 20
.. |github-l| image:: packages/github/graphics/icon/github-light.svg#gh-light-mode-only
   :width: 20
.. |github-d| image:: packages/github/graphics/icon/github-dark.svg#gh-dark-mode-only
   :width: 20
