%% jupiter-deck.cls: a short presentation or pitch deck on 16:9 landscape pages, same gutter grid as the portrait documents.
%% One idea per slide. The slide number is the accent label in the gutter; the three flowing lines appear on the cover only.
%%   \title{..} \subtitle{..} \author{..} \deckkind{Pitch} \deckdate{12 November 2026}
%%   \maketitle
%%   \begin{slide}{Heading} body ... \end{slide}     \jpstat{figure}{label} three across; itemize for lists
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-deck}[2026/11/13 Jupiter deck]
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[10pt]{article}
\RequirePackage{jupiter}
\RequirePackage[paperwidth=254mm,paperheight=142.9mm,top=24mm,bottom=18mm,left=62mm,right=18mm,headheight=0pt,headsep=0pt,footskip=8mm]{geometry}
\RequirePackage{jupiter-doc}
\RequirePackage{booktabs}
\setlength{\parindent}{0pt}\setlength{\parskip}{0.6em}
\jpbody{18}{25}
\AtBeginDocument{\renewcommand{\arraystretch}{1.35}}

\newcommand{\subtitle}[1]{\gdef\jp@dsub{#1}}
\newcommand{\deckkind}[1]{\gdef\jp@dkind{#1}}
\newcommand{\deckdate}[1]{\gdef\jp@ddate{#1}}
\gdef\jp@dsub{}\gdef\jp@dkind{Presentation}\gdef\jp@ddate{\today}

\renewcommand{\maketitle}{%
  \begin{titlepage}
    \thispagestyle{empty}\newgeometry{margin=0pt}%
    \jpcoverlines{82mm}%
    \jpat[north east]{236mm}{14mm}{\jpart[width=31mm]{logo-light}}%
    \jpat{18mm}{17mm}{{\jpmono\fontsize{7.5}{10}\selectfont\color{jpAccent}\MakeUppercase{\jp@dkind}}}%
    \jpat{62mm}{26mm}{\begin{minipage}[t]{170mm}\raggedright\jpdisplay\bfseries\fontsize{40}{42}\selectfont\color{jpText}\@title\par
      \ifdefempty{\jp@dsub}{}{\vspace{4mm}{\fontsize{14}{19}\selectfont\color{jpTextMuted}\jp@dsub\par}}%
    \end{minipage}}%
    \jpat{18mm}{118mm}{{\jpmono\fontsize{8}{11}\selectfont\color{jpTextMuted}\@author\ \textbar\ \jp@ddate}}%
    \vfill
  \end{titlepage}\restoregeometry}

\newcounter{jpslide}
\newenvironment{slide}[1]{\clearpage\stepcounter{jpslide}%
  \noindent\jpgutter[jpAccent]{\jptwodigits{jpslide}}{\jpdisplay\bfseries\fontsize{32}{34}\selectfont #1}\par\vspace{7mm}}{}

\pagestyle{fancy}\fancyhf{}\renewcommand{\headrulewidth}{0pt}
\fancyfoot[L]{\hspace*{-\jpgutterw}\jpmono\fontsize{7}{9}\selectfont\color{jpTextMuted}\MakeUppercase{\@title}}
\fancyfoot[R]{\jpmono\fontsize{7}{9}\selectfont\color{jpAccent}\thepage}
\endinput
