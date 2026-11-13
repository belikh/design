%% jupiter-report.cls: reports and long documents. The typographic Jupiter look: a 44 mm gutter of mono labels and section
%% numbers beside a 130 mm text column, a large SGI Alt title, three flowing lines on the cover.
%%   \title{..} \subtitle{..} \author{..} \reportdate{..} \reportversion{..} \reportstatus{Draft}
%%   \reportkind{Proposal}   the mono label top left of the cover (default Report)
%%   \maketitle \tableofcontents
%% Tables: no vertical rules (use booktabs); the `r` column type is right-aligned mono for figures. A table wider than the
%% 130 mm column goes in \begin{jpwide} ... \end{jpwide}, which extends it left over the gutter (192 mm). Long tables: longtable.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-report}[2026/01/01 Jupiter report]
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,10pt]{article}
\RequirePackage{jupiter}
\RequirePackage{jupiter-doc}
\RequirePackage[top=30mm,bottom=26mm,left=62mm,right=18mm,headheight=14pt,headsep=10mm,footskip=12mm]{geometry}
\RequirePackage{titlesec}
\RequirePackage{fancyhdr}
\RequirePackage{booktabs}
\RequirePackage{array}
\RequirePackage{longtable}
\RequirePackage{caption}
\RequirePackage{titletoc}
\setlength{\parindent}{0pt}\setlength{\parskip}{0.65em}
\jpbody{10}{14.4}
\AtBeginDocument{\renewcommand{\arraystretch}{1.35}}
\captionsetup{font={footnotesize,color=jpTextMuted},labelfont={color=jpAccent},labelsep=space,justification=raggedright,singlelinecheck=false}
\setlength{\heavyrulewidth}{0.9pt}\setlength{\lightrulewidth}{0.4pt}\setlength{\aboverulesep}{3pt}\setlength{\belowrulesep}{4pt}
\setlength{\LTleft}{0pt}\setlength{\LTright}{0pt}
%% figures in tables: right-aligned mono
\AtBeginEnvironment{table}{\let\centering\raggedright}
\newcolumntype{r}{>{\hfill\jpmono\small}c}
%% \begin{jpwide}: full-width material (tables) that overhangs the gutter on the left.
\newenvironment{jpwide}{\par\nobreak\vskip0.4em\noindent\hspace*{-\jpgutterw}\begin{minipage}[t]{\dimexpr\textwidth+\jpgutterw\relax}\raggedright}{\end{minipage}\par\vspace{0.4em}}

%% \jpfit{material}: scale material down to the line width when it is wider (diagrams); smaller material is left alone.
\newsavebox{\jp@fitbox}
\newcommand{\jpfit}[1]{\sbox{\jp@fitbox}{#1}\ifdim\wd\jp@fitbox>\linewidth\resizebox{\linewidth}{!}{\usebox{\jp@fitbox}}\else\usebox{\jp@fitbox}\fi}

\newcommand{\subtitle}[1]{\gdef\jp@subtitle{#1}}
\newcommand{\reportdate}[1]{\gdef\jp@rdate{#1}}
\newcommand{\reportversion}[1]{\gdef\jp@rver{#1}}
\newcommand{\reportstatus}[1]{\gdef\jp@rstat{#1}}
\newcommand{\reportkind}[1]{\gdef\jp@rkind{#1}}
\gdef\jp@rkind{Report}\gdef\jp@subtitle{}\gdef\jp@rdate{\today}\gdef\jp@rver{}\gdef\jp@rstat{}

\newcommand{\jp@coverrow}[2]{{\jpmono\fontsize{6.8}{9}\selectfont\color{jpTextMuted}\MakeUppercase{#1}}\par{\jpmono\fontsize{8}{11}\selectfont\color{jpText}#2}\par\vspace{7pt}}
\renewcommand{\maketitle}{%
  \begin{titlepage}
    \thispagestyle{empty}\newgeometry{margin=0pt}%
    \jpcoverlines{170mm}%
    \jpat[north east]{192mm}{15mm}{\jpart[width=31mm]{logo-light}}%
    \jpat{18mm}{18.5mm}{{\jpmono\fontsize{7.5}{10}\selectfont\color{jpAccent}\MakeUppercase{\jp@rkind}}}%
    \jpat{62mm}{50mm}{\begin{minipage}[t]{136mm}\raggedright\jpdisplay\bfseries\fontsize{48}{50}\selectfont\color{jpText}\@title\par
      \ifdefempty{\jp@subtitle}{}{\vspace{9mm}{\fontsize{14}{19}\selectfont\color{jpTextMuted}\jp@subtitle\par}}%
    \end{minipage}}%
    \jpat{18mm}{236mm}{\begin{minipage}[t]{36mm}\raggedright
      \ifdefempty{\jp@rstat}{}{\jp@coverrow{Status}{\jp@rstat}}%
      \ifdefempty{\jp@rver}{}{\jp@coverrow{Version}{\jp@rver}}%
      \jp@coverrow{Date}{\jp@rdate}%
      \jp@coverrow{Author}{\@author}%
    \end{minipage}}%
    \vfill
  \end{titlepage}\restoregeometry}

\titleformat{\section}{\jpdisplay\bfseries\fontsize{24}{26}\selectfont}{\jpgutter[jpAccent]{\jptwodigits{section}}}{0pt}{}
\titleformat{name=\section,numberless}{\jpdisplay\bfseries\fontsize{24}{26}\selectfont}{}{0pt}{}
\titleformat{\subsection}{\jpdisplay\bfseries\fontsize{13}{16}\selectfont}{\jpgutter{\jptwodigits{section}.\arabic{subsection}}}{0pt}{}
\titleformat{\subsubsection}{\jpdisplay\bfseries\normalsize}{}{0pt}{}
\titlespacing*{\section}{0pt}{2.2em}{0.9em}
\titlespacing*{\subsection}{0pt}{1.3em}{0.4em}
\renewcommand{\thesection}{\jptwodigits{section}}

\titlecontents{section}[0pt]{\addvspace{7pt}\jpdisplay\bfseries\large}{\llap{\makebox[\jpgutterw][l]{\color{jpAccent}\jpmono\small\thecontentslabel}}}{}{\hfill\jpmono\small\contentspage}
\titlecontents{subsection}[0pt]{\small}{\llap{\makebox[\jpgutterw][l]{\color{jpTextMuted}\jpmono\footnotesize\thecontentslabel}}}{}{\titlerule*[0.6em]{\color{jpBorder}.}\jpmono\footnotesize\contentspage}
\renewcommand{\contentsname}{Contents}
\newcommand{\jpcontents}{\tableofcontents}

\pagestyle{fancy}\fancyhf{}\fancyhfoffset[L]{\jpgutterw}
\renewcommand{\headrulewidth}{0.4pt}\renewcommand{\headrule}{{\color{jpBorder}\hrule width\headwidth height 0.4pt}}
\fancyhead[L]{\jpmono\fontsize{7}{9}\selectfont\color{jpTextMuted}\MakeUppercase{\@title}}
\fancyhead[R]{\jpmono\fontsize{7}{9}\selectfont\color{jpTextMuted}\MakeUppercase{\leftmark}}
\fancyfoot[L]{\jpmono\fontsize{7}{9}\selectfont\color{jpAccent}\thepage}
\fancyfoot[R]{\jpmono\fontsize{7}{9}\selectfont\color{jpTextMuted}\jp@rver}
\renewcommand{\sectionmark}[1]{\markboth{#1}{#1}}
\endinput
