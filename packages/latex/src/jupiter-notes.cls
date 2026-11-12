%% jupiter-notes.cls: working notes. Wide right margin for \jpmargin{} remarks, checklists, callouts.
%%   \notemeta{2026-11-12}{tag-one, tag-two}   then \maketitle
%%   \begin{jptodo} \todo{open task} \done{finished task} \end{jptodo}
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-notes}[2026/01/01 Jupiter notes]
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,10pt]{article}
\RequirePackage{jupiter}
\RequirePackage[top=20mm,bottom=20mm,left=20mm,right=62mm,marginparwidth=44mm,marginparsep=6mm]{geometry}
\RequirePackage{titlesec}
\RequirePackage{fancyhdr}
\setlength{\parindent}{0pt}\setlength{\parskip}{0.55em}
\AtBeginDocument{\jpsans\fontsize{9.8}{13.6}\selectfont\color{jpText}}

\newcommand{\notemeta}[2]{\gdef\jp@notedate{#1}\gdef\jp@notetags{#2}}
\gdef\jp@notedate{\today}\gdef\jp@notetags{}
\renewcommand{\maketitle}{%
  \par{\jplabel{\jp@notedate}\ifx\\\jp@notetags\\\else\hspace{0.8em}{\color{jpAccent}\jplabel{\jp@notetags}}\fi\par}
  \vspace{2pt}{\jpdisplay\bfseries\fontsize{22}{25}\selectfont\@title\par}
  \vspace{2pt}{\jpaccentrule[1.4pt]}\vspace{8pt}}

\titleformat{\section}{\jpdisplay\bfseries\large}{\color{jpAccent}\jpmono\normalsize\thesection}{0.7em}{}[{\color{jpBorder}\titlerule[0.5pt]}]
\titleformat{\subsection}{\jpdisplay\bfseries\normalsize}{\color{jpAccent}\jpmono\small\thesubsection}{0.6em}{}
\titlespacing*{\section}{0pt}{1.1em}{0.5em}
\titlespacing*{\subsection}{0pt}{0.8em}{0.3em}
\renewcommand{\thesection}{\jp@twodigits{section}}
\newcommand{\jp@twodigits}[1]{\ifnum\value{#1}<10 0\fi\arabic{#1}}

\newcommand{\jpmargin}[1]{\marginpar{\raggedright\jpmono\scriptsize\color{jpTextMuted}\setlength{\parskip}{2pt}#1}}

\newcommand{\jp@box}{\fboxsep=0pt\fboxrule=0.6pt\color{jpAccent}\fbox{\rule{0pt}{0.62em}\rule{0.62em}{0pt}}}
\newcommand{\jp@boxdone}{\color{jpAccent}\rule{0.62em}{0.62em}}
\newenvironment{jptodo}{\begin{list}{}{\setlength{\leftmargin}{1.7em}\setlength{\labelwidth}{1.4em}\setlength{\itemsep}{1.5pt}\setlength{\topsep}{2pt}\setlength{\parsep}{0pt}}}{\end{list}}
\newcommand{\todo}[1]{\item[{\jp@box}] #1}
\newcommand{\done}[1]{\item[{\jp@boxdone}] {\color{jpTextMuted}#1}}

\pagestyle{fancy}\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\fancyfoot[L]{\jpmono\scriptsize\color{jpTextMuted}\@title}
\fancyfoot[R]{\jpmono\scriptsize\color{jpTextMuted}\thepage}
\endinput
