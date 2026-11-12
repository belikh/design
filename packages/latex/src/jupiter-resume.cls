%% jupiter-resume.cls: one content API, three layouts.
%%   \documentclass[dense]{jupiter-resume}    one-page, mono-labelled, matches the web design language
%%   \documentclass[sidebar]{jupiter-resume}  tinted sidebar (contact, skills, education) + main column
%%   \documentclass[classic]{jupiter-resume}  serif, monochrome, ATS-friendly, multi-page
%% Content macros (identical in every style):
%%   \resumename \resumeheadline \resumecontact  then \makeresumeheader
%%   \resumesection{Title}   \resumeentry{role}{org}{dates}{location}{body}
%%   \resumeskill{label}{items}   \resumeproject{name}{description}   \resumesimple{title}{where}{when}
%%   \resumeside{Title}{content}  (sidebar column in `sidebar`, an ordinary section elsewhere;
%%                                 put these right after \makeresumeheader)
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-resume}[2026/01/01 Jupiter resume]

\newif\ifjp@dense \newif\ifjp@sidebar \newif\ifjp@classic
\jp@densetrue
\DeclareOption{dense}{\jp@densetrue\jp@sidebarfalse\jp@classicfalse}
\DeclareOption{sidebar}{\jp@densefalse\jp@sidebartrue\jp@classicfalse}
\DeclareOption{classic}{\jp@densefalse\jp@sidebarfalse\jp@classictrue}
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,10pt]{article}

\RequirePackage{jupiter}
\RequirePackage{geometry}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\setlength{\emergencystretch}{2em}

%% ---- content storage -------------------------------------------------
%% In dense/classic, \resumeside blocks are deferred to the end of the document.
\gdef\jp@deferred{}
\AtEndDocument{\jp@deferred}
\newcommand{\resumename}[1]{\gdef\jp@name{#1}}
\newcommand{\resumeheadline}[1]{\gdef\jp@headline{#1}}
\newcommand{\resumecontact}[1]{\gdef\jp@contact{#1}}
\gdef\jp@name{}\gdef\jp@headline{}\gdef\jp@contact{}
%% \resumesep: separator between contact items
\newcommand{\resumesep}{\hspace{0.5em}{\color{jpAccent}\textperiodcentered}\hspace{0.5em}}

%% =====================================================================
%% DENSE
%% =====================================================================
\ifjp@dense
  \geometry{top=12mm,bottom=12mm,left=14mm,right=14mm}
  \AtBeginDocument{\jpsans\fontsize{9.3}{12}\selectfont}
  \setlist{leftmargin=1.0em,itemsep=0.6pt,topsep=1.5pt}
  \newcommand{\makeresumeheader}{%
    {\noindent{\jpdisplay\bfseries\fontsize{25}{28}\selectfont\color{jpText}\jp@name}\par}
    \vspace{1pt}
    {\noindent\color{jpAccent}\jplabel{\jp@headline}\par}
    \vspace{3pt}
    {\noindent\jpmono\footnotesize\color{jpTextMuted}\jp@contact\par}
    \vspace{3pt}{\jpaccentrule[1.4pt]}\vspace{2pt}}
  \newcounter{jp@secno}
  \newcommand{\resumesection}[1]{\stepcounter{jp@secno}%
    \par\vspace{7pt}\noindent{\color{jpAccent}\jplabel{\jp@twodigits{jp@secno} \,\textendash\, #1}}%
    \hspace{6pt}{\color{jpBorder}\leaders\hrule height 0.5pt\hfill}\par\vspace{3pt}\nopagebreak}
  \newcommand{\jp@twodigits}[1]{\ifnum\value{#1}<10 0\fi\arabic{#1}}
  \newcommand{\resumeentry}[5]{%
    \par\vspace{3.5pt}\noindent{\bfseries\color{jpText}#1}%
    \ifx\\#2\\\else\jpmuted{\ \textbar\ #2}\fi%
    \ifx\\#4\\\else\jpmuted{, #4}\fi%
    \hfill{\jpmono\footnotesize\color{jpTextMuted}#3}\par
    \ifx\\#5\\\else\vspace{1.5pt}#5\fi}
  \newcommand{\resumeskill}[2]{%
    \par\vspace{1.5pt}\noindent\hangindent=29mm\hangafter=1
    \makebox[29mm][l]{\color{jpAccent}\jplabel{#1}}#2\par}
  \newcommand{\resumeproject}[2]{%
    \par\vspace{1.5pt}\noindent\hangindent=1em\hangafter=1{\bfseries\color{jpText}#1}\jpmuted{\ --\ }#2\par}
  \newcommand{\resumeside}[2]{\g@addto@macro\jp@deferred{\resumesection{#1}#2}}
\fi

%% =====================================================================
%% SIDEBAR
%% =====================================================================
\ifjp@sidebar
  \newlength{\jp@sidew}\setlength{\jp@sidew}{64mm}
  \newlength{\jp@sidepad}\setlength{\jp@sidepad}{7mm}
  \newlength{\jp@bandh}\setlength{\jp@bandh}{40mm}
  \geometry{top=14mm,bottom=14mm,left=77mm,right=13mm}
  \AtBeginDocument{\jpsans\fontsize{9.6}{12.4}\selectfont}
  \newsavebox{\jp@sidebox}
  \savebox{\jp@sidebox}{\parbox[t]{\dimexpr\jp@sidew-2\jp@sidepad\relax}{\strut}}
  \newcommand{\jp@sidehead}[1]{\par\vspace{9pt}{\color{jpAccent}\jplabel{#1}}\par\vspace{2pt}{\color{jpBorder}\hrule height 0.5pt}\vspace{4pt}}
  \newcommand{\resumeside}[2]{%
    \global\savebox{\jp@sidebox}{\parbox[t]{\dimexpr\jp@sidew-2\jp@sidepad\relax}{%
      \usebox{\jp@sidebox}\jp@sidehead{#1}\raggedright\small\setlist{leftmargin=0.9em}#2\par}}}
  \newcommand{\jp@sidecontact}{%
    \expandafter\jp@splitcontact\jp@contact\resumesep\@nil}
  % contact items are separated by \resumesep in the source; show one per line in the sidebar
  \def\jp@splitcontact#1\resumesep#2\@nil{%
    \ifx\\#1\\\else\noindent\jpmono\footnotesize#1\par\vspace{3pt}\fi
    \ifx\\#2\\\else\jp@splitcontact#2\@nil\fi}
  \newcommand{\makeresumeheader}{%
    \resumeside{Contact}{\jp@sidecontact}}
  \newcommand{\resumesection}[1]{%
    \par\vspace{8pt}\noindent{\jpdisplay\bfseries\color{jpText}\MakeUppercase{#1}}\par\vspace{1.5pt}%
    {\color{jpAccent}\hrule height 1.1pt width 1.6em}\vspace{4pt}\nopagebreak}
  \newcommand{\resumeentry}[5]{%
    \par\vspace{4pt}\noindent{\bfseries\color{jpText}#1}\hfill{\jpmono\footnotesize\color{jpTextMuted}#3}\par
    \noindent\jpmuted{#2\ifx\\#4\\\else, #4\fi}\par
    \ifx\\#5\\\else\vspace{1.5pt}#5\fi}
  \newcommand{\resumeskill}[2]{\par\noindent{\color{jpText}\bfseries #1}\par\jpmuted{#2}\par\vspace{3pt}}
  \newcommand{\resumeproject}[2]{%
    \par\vspace{1.5pt}\noindent\hangindent=1em\hangafter=1{\bfseries\color{jpText}#1}\jpmuted{\ --\ }#2\par}
  \AddToHook{shipout/background}{%
    \put(0,-\paperheight){\color{jpSurface}\rule{\jp@sidew}{\paperheight}}%
    \ifnum\value{page}=1
      \put(0,-\jp@bandh){\color{jpAccent}\rule{\jp@sidew}{\jp@bandh}}%
      \put(\jp@sidepad,-8mm){\makebox(0,0)[tl]{\parbox[t]{\dimexpr\jp@sidew-2\jp@sidepad\relax}{%
        {\raggedright\jpdisplay\bfseries\fontsize{22}{25}\selectfont\color{jpOnAccent}\jp@name\par}%
        \vspace{6pt}{\raggedright\jpmono\scriptsize\color{jpOnAccent}\MakeUppercase{\jp@headline}\par}}}}%
      \put(\jp@sidepad,-\dimexpr\jp@bandh+2mm\relax){\makebox(0,0)[tl]{\usebox{\jp@sidebox}}}%
    \fi}
\fi

%% =====================================================================
%% CLASSIC
%% =====================================================================
\ifjp@classic
  \geometry{top=18mm,bottom=18mm,left=22mm,right=22mm}
  \AtBeginDocument{\jpserif\fontsize{10.5}{13.6}\selectfont\color{jpText}}
  \hypersetup{colorlinks=false,pdfborder={0 0 0}}
  \setlist[itemize]{label=\textbullet,leftmargin=1.2em,itemsep=1.2pt,topsep=2pt}
  \newcommand{\makeresumeheader}{%
    \begin{center}
      {\scshape\fontsize{23}{26}\selectfont\jp@name\par}
      \vspace{3pt}{\itshape\jp@headline\par}
      \vspace{3pt}{\small\jp@contact\par}
    \end{center}\vspace{-2pt}}
  \renewcommand{\resumesep}{\hspace{0.45em}\textbar\hspace{0.45em}}
  \newcommand{\resumesection}[1]{%
    \par\vspace{8pt}\noindent{\scshape\bfseries\large #1}\par\vspace{2.5pt}{\hrule height 0.5pt}\vspace{4pt}\nopagebreak}
  \newcommand{\resumeentry}[5]{%
    \par\vspace{3pt}\noindent{\bfseries #1}\hfill{\small #3}\par
    \noindent{\itshape #2}\hfill{\small\itshape #4}\par
    \ifx\\#5\\\else\vspace{1.5pt}#5\fi}
  \newcommand{\resumeskill}[2]{\par\noindent{\bfseries #1:} #2\par\vspace{1.5pt}}
  \newcommand{\resumeproject}[2]{\par\vspace{1.5pt}\noindent\hangindent=1.2em\hangafter=1{\bfseries #1}\ --\ #2\par}
  \newcommand{\resumeside}[2]{\g@addto@macro\jp@deferred{\resumesection{#1}#2}}
\fi

\newcommand{\resumesimple}[3]{\resumeentry{#1}{#2}{#3}{}{}}
\endinput
