%% jupiter-report.cls: reports and long documents. Title page, contents, numbered sections, callouts, code.
%%   \title{..} \subtitle{..} \author{..} \reportdate{..} \reportversion{..} \reportstatus{Draft}
%%   \maketitle \tableofcontents
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-report}[2026/01/01 Jupiter report]
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,10.5pt]{article}
\RequirePackage{jupiter}
\RequirePackage[top=26mm,bottom=24mm,left=25mm,right=25mm,headheight=14pt]{geometry}
\RequirePackage{titlesec}
\RequirePackage{fancyhdr}
\RequirePackage{booktabs}
\RequirePackage{graphicx}
\RequirePackage{caption}
\RequirePackage{titletoc}
\setlength{\parindent}{0pt}\setlength{\parskip}{0.6em}
\AtBeginDocument{\jpsans\fontsize{10.3}{14.6}\selectfont\color{jpText}}
\captionsetup{font={small,color=jpTextMuted},labelfont={bf,color=jpAccent},labelsep=period}

\newcommand{\subtitle}[1]{\gdef\jp@subtitle{#1}}
\newcommand{\reportdate}[1]{\gdef\jp@rdate{#1}}
\newcommand{\reportversion}[1]{\gdef\jp@rver{#1}}
\newcommand{\reportstatus}[1]{\gdef\jp@rstat{#1}}
\gdef\jp@subtitle{}\gdef\jp@rdate{\today}\gdef\jp@rver{}\gdef\jp@rstat{}

\renewcommand{\maketitle}{%
  \begin{titlepage}
    \thispagestyle{empty}
    \noindent{\color{jpAccent}\rule{\textwidth}{6pt}}\par\vspace{22mm}
    \ifx\\\jp@rstat\\\else{\jpbadge[info]{\jp@rstat}}\par\vspace{8pt}\fi
    {\raggedright\jpdisplay\bfseries\fontsize{36}{40}\selectfont\color{jpText}\@title\par}
    \ifx\\\jp@subtitle\\\else\vspace{8pt}{\raggedright\fontsize{15}{20}\selectfont\color{jpTextMuted}\jp@subtitle\par}\fi
    \vspace{14mm}{\jpaccentrule[1.4pt]}\vspace{6pt}
    {\jpmono\small
     \begin{tabular}{@{}ll@{}}
       \color{jpTextMuted}\MakeUppercase{author} & \@author\\
       \color{jpTextMuted}\MakeUppercase{date} & \jp@rdate\\
       \ifx\\\jp@rver\\\else\color{jpTextMuted}\MakeUppercase{version} & \jp@rver\\\fi
     \end{tabular}\par}
    \vfill
  \end{titlepage}}

\titleformat{\section}{\jpdisplay\bfseries\Large}{\color{jpAccent}\jpmono\large\jp@twodigits{section}}{0.8em}{}[{\color{jpBorder}\titlerule[0.5pt]}]
\titleformat{\subsection}{\jpdisplay\bfseries\large}{\color{jpAccent}\jpmono\normalsize\jp@twodigits{section}.\arabic{subsection}}{0.7em}{}
\titleformat{\subsubsection}{\jpdisplay\bfseries\normalsize}{}{0pt}{}
\titlespacing*{\section}{0pt}{1.6em}{0.8em}
\titlespacing*{\subsection}{0pt}{1.1em}{0.4em}
\newcommand{\jp@twodigits}[1]{\ifnum\value{#1}<10 0\fi\arabic{#1}}
\renewcommand{\thesection}{\jp@twodigits{section}}

\titlecontents{section}[0pt]{\addvspace{5pt}\bfseries}{\color{jpAccent}\jpmono\small\contentslabel{2em}}{}{\hfill\jpmono\small\contentspage}
\titlecontents{subsection}[2em]{}{\contentslabel{2.6em}}{}{\titlerule*[0.6em]{.}\contentspage}
\renewcommand{\contentsname}{\jplabel{Contents}}
\newcommand{\jpcontents}{\tableofcontents}

\pagestyle{fancy}\fancyhf{}
\renewcommand{\headrulewidth}{0.4pt}\renewcommand{\headrule}{{\color{jpBorder}\hrule width\headwidth height 0.4pt}}
\fancyhead[L]{\jpmono\scriptsize\color{jpTextMuted}\@title}
\fancyhead[R]{\jpmono\scriptsize\color{jpTextMuted}\leftmark}
\fancyfoot[R]{\jpmono\scriptsize\color{jpTextMuted}\thepage}
\fancyfoot[L]{\jpmono\scriptsize\color{jpTextMuted}\jp@rver}
\renewcommand{\sectionmark}[1]{\markboth{#1}{#1}}
\endinput
