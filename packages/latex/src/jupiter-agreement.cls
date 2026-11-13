%% jupiter-agreement.cls: contracts (NDA, MSA, contractor agreement, SOW). The quiet end of the Jupiter look: logo, a 32 pt SGI Alt title,
%% one accent rule, the parties as rows, clause numbers in the gutter. No other graphics.
%%   \agreementkind{Non-disclosure agreement}  \title{Mutual NDA}  \agreementref{NDA-2026-014}
%%   \maketitle  \jprow{Between}{..} \jprow{And}{..} \jprow{Effective}{..} \jprowend
%%   \section{Definitions}      clause heading, numbered 01 (accent) in the gutter
%%   \clause text ...           numbered sub-clause 1.1 (muted) in the gutter;  \term{Confidential Information} bold defined term
%%   \jpsign{Party A}{Party B}  signature blocks;  \begin{jpitems} ... \end{jpitems} + \jpcells for a fee schedule (jupiter-money)
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-agreement}[2026/11/13 Jupiter agreement]
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,10pt]{article}
\RequirePackage{jupiter}
\RequirePackage[top=30mm,bottom=24mm,left=62mm,right=18mm,headheight=12pt,headsep=8mm]{geometry}
\RequirePackage{jupiter-doc}
\RequirePackage{jupiter-money}
\RequirePackage{titlesec}
\RequirePackage{booktabs}
\setlength{\parindent}{0pt}\setlength{\parskip}{0.6em}
\jpbody{9.8}{13.6}
\AtBeginDocument{\renewcommand{\arraystretch}{1.3}}
\setlength{\heavyrulewidth}{0.9pt}\setlength{\lightrulewidth}{0.4pt}
\newenvironment{jpwide}{\par\nobreak\vskip0.4em\noindent\hspace*{-\jpgutterw}\begin{minipage}[t]{\dimexpr\textwidth+\jpgutterw\relax}\raggedright}{\end{minipage}\par\vspace{0.4em}}

\newcommand{\agreementkind}[1]{\gdef\jp@akind{#1}}
\newcommand{\agreementref}[1]{\gdef\jp@aref{#1}}
\gdef\jp@akind{Agreement}\gdef\jp@aref{}

\renewcommand{\maketitle}{%
  \thispagestyle{empty}%
  \jpat[north east]{192mm}{16mm}{\jpart[width=31mm]{logo-light}}%
  \noindent\jpgutter[jpAccent]{\jp@akind}%
  {\jpdisplay\bfseries\fontsize{32}{35}\selectfont\color{jpText}\@title}\par
  \vspace{5mm}\jpaccentrule[1.2pt]\vspace{9mm}}

\titleformat{\section}{\jpdisplay\bfseries\fontsize{13}{16}\selectfont}{\jpgutter[jpAccent]{\jptwodigits{section}}}{0pt}{}
\titleformat{name=\section,numberless}{\jpdisplay\bfseries\fontsize{13}{16}\selectfont}{}{0pt}{}
\titlespacing*{\section}{0pt}{1.6em}{0.4em}
\renewcommand{\thesection}{\jptwodigits{section}}
\newcounter{jpclause}[section]
\newcommand{\clause}{\par\stepcounter{jpclause}\noindent\jpgutter{\arabic{section}.\arabic{jpclause}}\ignorespaces}
\newcommand{\term}[1]{\textbf{#1}}

\renewcommand{\sectionmark}[1]{\markboth{#1}{#1}}
\jpsetrunning{\MakeUppercase{\@title}}{\MakeUppercase{\jp@aref}}
\endinput
