%% jupiter-docs.cls: generated documentation (jupiter-docs build --pdf). First usable version; a designer pass restyles it later.
%% ALL visual decisions live here. The writer (packages/docs/src/write-tex.mjs) emits only the macros listed below:
%%   \title \subtitle \author \jpversion \jpdate \jprepo  \maketitle \tableofcontents
%%   \jpdocsection{title}{summary}  \jpintro{title}  \jppage{label}{title}{summary}  \subsection ... \paragraph
%%   jpcallout[info|ok|warn|danger]{Title}  jpdocscode (+ \jpcodetitle)  jptable{aligns} (\jphead \jpth \jptablebody \jpfoot)
%%   jpquote  \jpc{inline code}  \jpdel  \jpterm  \jpanchor{label}  \jpseealso  \jpgraphic{tier}{name}{alt}  \jpimage{path}{alt}
%%   jpglossary + \jpgloss{term}{definition}  \jpdivider
%% Optional files found on TEXINPUTS (the build writes them): jp-logo-light.pdf, jpg-<tier>-<name>.pdf, jpg-cover.pdf. Without them the class still compiles.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-docs}[2026/11/13 Jupiter generated documentation]
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,10.5pt]{article}
\RequirePackage{jupiter}
\RequirePackage[top=30mm,bottom=28mm,left=30mm,right=30mm,headheight=17pt]{geometry}
\RequirePackage{titlesec}
\RequirePackage{titletoc}
\RequirePackage{fancyhdr}
\RequirePackage{booktabs}
\RequirePackage{colortbl}
\RequirePackage{graphicx}
\RequirePackage{longtable}
\RequirePackage{fvextra}
\RequirePackage{newunicodechar}
\RequirePackage{caption}

\setlength{\parindent}{0pt}\setlength{\parskip}{0.75em}\emergencystretch=3em
\AtBeginDocument{\jpsans\fontsize{10.5}{15.5}\selectfont\color{jpText}\RaggedRight}
\setcounter{tocdepth}{2}\setcounter{secnumdepth}{3}

%% ---------- code font: no TeX ligatures, so -- and --jp-* stay as typed ----------
\defaultfontfeatures{}
\IfFileExists{\jpfontdir jetbrains-mono-400.ttf}{%
  \renewfontfamily\jpmono{jetbrains-mono-400.ttf}[Path=\jpfontdir,Scale=0.9,%
    ItalicFont=jetbrains-mono-italic-400.ttf,BoldFont=jetbrains-mono-700.ttf,BoldItalicFont=jetbrains-mono-italic-700.ttf]%
}{\renewfontfamily\jpmono{DejaVu Sans Mono}[Scale=0.82]}
\defaultfontfeatures{Ligatures=TeX}
\let\ttfamily\jpmono
%% glyphs the SGI and mono fonts lack come from a fallback face
\IfFontExistsTF{DejaVu Sans}{\newfontfamily\jpsym{DejaVu Sans}[Scale=0.92]}{\let\jpsym\jpsans}
\newunicodechar{→}{{\jpsym\char"2192}}
\newunicodechar{←}{{\jpsym\char"2190}}
\newunicodechar{↔}{{\jpsym\char"2194}}
\newunicodechar{≥}{{\jpsym\char"2265}}
\newunicodechar{≤}{{\jpsym\char"2264}}
\newunicodechar{≠}{{\jpsym\char"2260}}
\newunicodechar{✓}{{\jpsym\char"2713}}
\newunicodechar{✗}{{\jpsym\char"2717}}

%% ---------- metadata ----------
\newcommand{\subtitle}[1]{\gdef\jp@subtitle{#1}}
\newcommand{\jpversion}[1]{\gdef\jp@version{#1}}
\newcommand{\jpdate}[1]{\gdef\jp@date{#1}}
\newcommand{\jprepo}[1]{\gdef\jp@repo{#1}}
\gdef\jp@subtitle{}\gdef\jp@version{}\gdef\jp@date{\today}\gdef\jp@repo{}

%% ---------- logo and art (optional files) ----------
\newcommand{\jplogo}[1][height=8mm]{\IfFileExists{jp-logo-light.pdf}{\includegraphics[#1]{jp-logo-light.pdf}}{{\jpdisplay\bfseries jupiter.au}}}
\newcommand{\jpcoverart}{\IfFileExists{jpg-cover.pdf}{\includegraphics[width=62mm]{jpg-cover.pdf}}{}}
\newlength{\jp@gw}
\newcommand{\jpgraphic}[3]{\par\vspace{4pt}%
  \IfFileExists{jpg-#1-#2.pdf}{%
    \ifstrequal{#1}{rule}{\setlength{\jp@gw}{\linewidth}}{\ifstrequal{#1}{icon}{\setlength{\jp@gw}{9mm}}{\ifstrequal{#1}{scene}{\setlength{\jp@gw}{\linewidth}}{\setlength{\jp@gw}{44mm}}}}%
    \noindent\includegraphics[width=\jp@gw]{jpg-#1-#2.pdf}%
  }{\ifstrequal{#1}{rule}{{\color{jpBorder}\hrule height 0.6pt}}{}}%
  \par\vspace{4pt}}
\newcommand{\jpimage}[2]{\par\noindent\IfFileExists{#1}{\includegraphics[width=\linewidth,keepaspectratio]{#1}}{\jpmuted{[image: #2]}}\par}

%% ---------- cover ----------
\renewcommand{\maketitle}{%
  \begin{titlepage}
    \thispagestyle{empty}\raggedright
    {\hfill\jplogo[height=10mm]\par}\vspace{34mm}
    {\jpmono\small\color{jpAccent}\MakeUppercase{documentation}\par}\vspace{6pt}
    {\jpdisplay\bfseries\fontsize{48}{50}\selectfont\color{jpText}\@title\par}
    \ifdefempty{\jp@subtitle}{}{\vspace{12pt}{\fontsize{14}{20}\selectfont\color{jpTextMuted}\jp@subtitle\par}}
    \vspace{12mm}\jpgraphic{rule}{end}{}
    \vspace{6mm}
    {\jpmono\small
     \begin{tabular}{@{}ll@{}}
       \ifdefempty{\jp@version}{}{\color{jpTextMuted}\MakeUppercase{version} & \jp@version\\}
       \ifdefempty{\@author}{}{\color{jpTextMuted}\MakeUppercase{author} & \@author\\}
       \color{jpTextMuted}\MakeUppercase{date} & \jp@date\\
       \ifdefempty{\jp@repo}{}{\color{jpTextMuted}\MakeUppercase{source} & \jp@repo\\}
     \end{tabular}\par}
    \vfill{\hfill\jpcoverart\par}
  \end{titlepage}}

%% ---------- headings ----------
\newcommand{\jp@twodigits}[1]{\ifnum\value{#1}<10 0\fi\arabic{#1}}
\renewcommand{\thesection}{\jp@twodigits{section}}
\titleformat{\section}{\jpdisplay\bfseries\fontsize{24}{27}\selectfont}{\color{jpAccent}\jpmono\normalsize\thesection}{0.9em}{}
\titleformat{\subsection}{\jpdisplay\bfseries\Large}{}{0pt}{}
\titleformat{\subsubsection}{\jpdisplay\bfseries\large}{}{0pt}{}
\titleformat{\paragraph}[runin]{\bfseries}{}{0pt}{}
\titlespacing*{\section}{0pt}{2.4em}{0.6em}
\titlespacing*{\subsection}{0pt}{1.8em}{0.3em}
\titlespacing*{\subsubsection}{0pt}{1.2em}{0.2em}
\titlespacing*{\paragraph}{0pt}{0.8em}{0.6em}
\newcommand{\jpanchor}[1]{\hypertarget{#1}{}}
\newcommand{\jppage}[3]{\section{#2}\hypertarget{#1}{}\par\vspace{-0.2em}{\fontsize{12.5}{18}\selectfont\color{jpTextMuted}#3\par}\vspace{0.4em}}
\newcommand{\jpintro}[1]{\clearpage\section*{#1}}
\newcommand{\jpdocsection}[2]{\clearpage\phantomsection\addcontentsline{toc}{part}{#1}%
  \vspace*{28mm}{\jpmono\small\color{jpAccent}\MakeUppercase{section}\par}\vspace{6pt}%
  {\jpdisplay\bfseries\fontsize{40}{42}\selectfont #1\par}%
  \ifstrempty{#2}{}{\vspace{10pt}{\fontsize{13}{19}\selectfont\color{jpTextMuted}#2\par}}\vspace{10mm}\jpgraphic{rule}{end}{}\vspace{6mm}}

\titlecontents{part}[0pt]{\addvspace{12pt}\jpmono\small\color{jpAccent}}{}{}{\hfill\color{jpTextMuted}\contentspage}
\titlecontents{section}[0pt]{\addvspace{4pt}\bfseries}{\color{jpAccent}\jpmono\small\contentslabel{2.2em}}{}{\hfill\jpmono\small\contentspage}
\titlecontents{subsection}[2.2em]{}{}{}{\titlerule*[0.6em]{.}\contentspage}
\renewcommand{\contentsname}{\jplabel{Contents}}

%% ---------- running header and footer ----------
\pagestyle{fancy}\fancyhf{}
\renewcommand{\headrulewidth}{0.4pt}\renewcommand{\headrule}{{\color{jpBorder}\hrule width\headwidth height 0.4pt}}
\fancyhead[L]{\jpmono\scriptsize\color{jpTextMuted}\@title}
\fancyhead[R]{\jplogo[height=4.2mm]}
\fancyfoot[L]{\jpmono\scriptsize\color{jpTextMuted}\jp@version}
\fancyfoot[R]{\jpmono\scriptsize\color{jpTextMuted}\thepage}
\fancypagestyle{plain}{\fancyhf{}\renewcommand{\headrulewidth}{0pt}\fancyfoot[R]{\jpmono\scriptsize\color{jpTextMuted}\thepage}}

%% ---------- inline ----------
\newcommand{\jpc}[1]{{\jpmono\small #1}}
\newcommand{\jpdel}[1]{\textcolor{jpTextMuted}{#1}}
\newcommand{\jpterm}[1]{\emph{#1}}
\newcommand{\jpseealso}{\par\vspace{0.6em}{\jplabel{See also}}\par\vspace{-0.4em}}
\newcommand{\jpdivider}{\par\vspace{4pt}{\color{jpBorder}\hrule height 0.5pt}\vspace{4pt}}
\newenvironment{jpquote}{\par\begingroup\color{jpTextMuted}\leftskip=1.1em\relax}{\par\endgroup}

%% ---------- code ----------
\newcommand{\jpcodetitle}[1]{\par\vspace{0.4em}{\noindent\jpmono\scriptsize\color{jpTextMuted}\MakeUppercase{#1}\par}\vspace{-0.3em}}
\DefineVerbatimEnvironment{jpdocscode}{Verbatim}{fontsize=\footnotesize,formatcom=\jpmono\color{jpText},breaklines=true,breaksymbolleft={},%
  frame=leftline,framerule=1.6pt,rulecolor=\color{jpBorder},framesep=9pt,xleftmargin=3pt}

%% ---------- tables: no vertical rules ----------
\newlength{\jp@colw}\newcount\jp@ncols
\newcolumntype{L}{>{\raggedright\arraybackslash}p{\jp@colw}}
\newcolumntype{R}{>{\raggedleft\arraybackslash}p{\jp@colw}}
\newcolumntype{C}{>{\centering\arraybackslash}p{\jp@colw}}
\newcommand{\jp@mkspec}[1]{\gdef\jp@spec{}\jp@ncols=0 \@tfor\jp@c:=#1\do{\advance\jp@ncols by 1 %
  \if\jp@c r\xdef\jp@spec{\jp@spec R}\else\if\jp@c c\xdef\jp@spec{\jp@spec C}\else\xdef\jp@spec{\jp@spec L}\fi\fi}}
\newenvironment{jptable}[1]{\jp@mkspec{#1}\par\vspace{2pt}\begingroup\small\renewcommand{\arraystretch}{1.3}\setlength{\tabcolsep}{6pt}%
  \arrayrulecolor{jpBorder}\setlength{\heavyrulewidth}{0.8pt}\setlength{\lightrulewidth}{0.4pt}%
  \setlength{\jp@colw}{\dimexpr(\linewidth-\jp@ncols\tabcolsep*2)/\jp@ncols\relax}%
  \edef\jp@begin{\noexpand\longtable{@{}\jp@spec @{}}}\jp@begin}{\endlongtable\endgroup\par\vspace{2pt}}
\newcommand{\jphead}{\toprule}
\newcommand{\jpth}[1]{{\jpmono\scriptsize\color{jpTextMuted}\MakeUppercase{#1}}}
\newcommand{\jptablebody}{\midrule\endhead}
\newcommand{\jpfoot}{\bottomrule}

%% ---------- glossary ----------
\newenvironment{jpglossary}{\par}{\par}
\newcommand{\jpgloss}[2]{\par\noindent\textbf{#1}\\#2\par}
\endinput
