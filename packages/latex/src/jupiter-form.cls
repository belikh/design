%% jupiter-form.cls: one- and few-page business documents that are mostly rows, lists and tables (minutes, status reports, checklists,
%% review forms, briefs, job descriptions, one-pagers, press releases, fax covers, expense reports, budgets). The typographic
%% Jupiter look of the invoice: a 44 mm gutter of mono labels beside a 130 mm column, an SGI Alt title with the hand-drawn swash
%% under it, then hairline rows.
%%   \formkind{Minutes}  \title{..}  \subtitle{mono line, e.g. a reference and date}  \formbadge[ok|warn|danger|info]{Final}
%%   \maketitle  then \jprow{Label}{value} ... \jprowend
%%   \section{..} numbered 01 in the gutter;  \jpentry{gutter label}{heading} for a labelled block (a time, a phase, a workstream)
%%   \begin{jpwide} wide table \end{jpwide} (192 mm, over the gutter);  \begin{jpitems} with \expenseitem / \budgetline (jupiter-money)
%% Components from jupiter-doc: \jpfield \jpcheckitem \jprating \jpstat \jpsign.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-form}[2026/11/13 Jupiter form]
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,10pt]{article}
\RequirePackage{jupiter}
\RequirePackage[top=30mm,bottom=24mm,left=62mm,right=18mm,headheight=12pt,headsep=8mm]{geometry}
\RequirePackage{jupiter-doc}
\RequirePackage{jupiter-money}
\RequirePackage{titlesec}
\RequirePackage{booktabs}
\setlength{\parindent}{0pt}\setlength{\parskip}{0.5em}
\jpbody{9.8}{13.6}
\AtBeginDocument{\renewcommand{\arraystretch}{1.3}}
\setlength{\heavyrulewidth}{0.9pt}\setlength{\lightrulewidth}{0.4pt}\setlength{\aboverulesep}{3pt}\setlength{\belowrulesep}{4pt}
\newcolumntype{r}{>{\hfill\jpmono\small}c}
\newenvironment{jpwide}{\par\nobreak\vskip0.4em\noindent\hspace*{-\jpgutterw}\begin{minipage}[t]{\dimexpr\textwidth+\jpgutterw\relax}\raggedright}{\end{minipage}\par\vspace{0.4em}}

\newcommand{\formkind}[1]{\gdef\jp@fkind{#1}}
\newcommand{\subtitle}[1]{\gdef\jp@fsub{#1}}
\newcommand{\formbadge}[2][warn]{\gdef\jp@fbadge{\jpbadge[#1]{#2}}}
\gdef\jp@fkind{Form}\gdef\jp@fsub{}\gdef\jp@fbadge{}

\renewcommand{\maketitle}{%
  \thispagestyle{empty}%
  \jpat[north east]{192mm}{16mm}{\jpart[width=31mm]{logo-light}}%
  \jpat{0mm}{51mm}{\jpart[width=210mm]{swash-accent}}%
  \noindent\jpgutter[jpAccent]{\jp@fkind}%
  {\jpdisplay\bfseries\fontsize{40}{42}\selectfont\color{jpText}\@title}\par
  \vspace{4pt}\noindent{\jpmono\small\color{jpAccent}\jp@fsub}%
  \ifdefempty{\jp@fbadge}{}{\hspace{10pt}\jp@fbadge}\par
  \vspace{14mm}}

\titleformat{\section}{\jpdisplay\bfseries\fontsize{20}{22}\selectfont}{\jpgutter[jpAccent]{\jptwodigits{section}}}{0pt}{}
\titleformat{name=\section,numberless}{\jpdisplay\bfseries\fontsize{20}{22}\selectfont}{}{0pt}{}
\titleformat{\subsection}{\jpdisplay\bfseries\fontsize{12}{15}\selectfont}{}{0pt}{}
\titlespacing*{\section}{0pt}{1.8em}{0.7em}
\titlespacing*{\subsection}{0pt}{1.1em}{0.3em}
\renewcommand{\thesection}{\jptwodigits{section}}

\newcommand{\jpentry}[2]{\par\vspace{7pt}\noindent\jpgutter{#1}{\jpdisplay\bfseries\fontsize{12}{15}\selectfont #2}\par\nopagebreak}

%% expense report and budget lines (jpitems columns: description + three figures)
\newcommand{\expenseitem}[4]{#1\jpaccum{#4} & \jp@fig{#2} & \jp@fig{#3} & \jp@fig{\jpmoney{#4}} \\}
\newcommand{\budgetline}[3]{#1\jpaccum{#2}\jpaccumb{#3} & \jp@fig{\jpmoney{#2}} & \jp@fig{\jpmoney{#3}} & \jp@fig{\jpvar{#2-#3}} \\}

\renewcommand{\sectionmark}[1]{\markboth{#1}{#1}}
\jpsetrunning{\MakeUppercase{\jp@fkind}\ \textbar\ \MakeUppercase{\@title}}{\MakeUppercase{\leftmark}}
\endinput
