%% jupiter-resume.cls: one content API, three layouts, all in the typographic Jupiter look (SGI Text / SGI Alt / JetBrains Mono).
%%   \documentclass[dense]{jupiter-resume}    one-page: gutter of mono labels and dates, accent section numbers, the red spot
%%   \documentclass[sidebar]{jupiter-resume}  tinted sidebar (contact, skills, education) + main column
%%   \documentclass[classic]{jupiter-resume}  monochrome (ink and grey only), plain structure, ATS-friendly, multi-page
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
\RequirePackage{fancyhdr}
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
\newcommand{\resumesimple}[3]{\resumeentry{#1}{#2}{#3}{}{}}
\newcounter{jp@secno}
\newcommand{\jp@spotdot}{\hspace{0.15em}\tikz[baseline=-0.3ex]\fill[jpDanger] (0,0) circle (1.4mm);}

%% =====================================================================
%% DENSE and CLASSIC: gutter of labels and dates on the left, wide column on the right
%% =====================================================================
\ifjp@sidebar\else
  \ifjp@dense
    \newcommand{\jp@rcol}{jpAccent}
    \setlength{\jpgutterw}{32mm}
    \geometry{top=13mm,bottom=15mm,left=46mm,right=14mm,footskip=8mm}
    \jpbody{9.3}{12.2}
    \newcommand{\jp@namesize}{\fontsize{34}{36}\selectfont}
    \newcommand{\jp@namedot}{\jp@spotdot}
    \newcommand{\jp@uline}[1]{\jpunderline[accent]{#1}}
    \newcommand{\jp@secgap}{8pt}
    \setlist{leftmargin=1.0em,itemsep=0.6pt,topsep=1.5pt}
  \else
    \newcommand{\jp@rcol}{jpText}
    \setlength{\jpgutterw}{38mm}
    \geometry{top=20mm,bottom=20mm,left=56mm,right=18mm,footskip=9mm}
    \jpbody{10}{13.8}
    \newcommand{\jp@namesize}{\fontsize{32}{34}\selectfont}
    \newcommand{\jp@namedot}{}
    \newcommand{\jp@uline}[1]{\jpunderline[ink]{#1}}
    \newcommand{\jp@secgap}{12pt}
    \hypersetup{colorlinks=false,pdfborder={0 0 0}}
    \setlist[itemize]{label={\color{jpText}\raisebox{0.05ex}{\rule{0.38em}{0.38em}}},leftmargin=1.1em,itemsep=1.2pt,topsep=2pt}
    \renewcommand{\resumesep}{\hspace{0.45em}\textbar\hspace{0.45em}}
  \fi
  \pagestyle{fancy}\fancyhf{}\fancyhfoffset[L]{\jpgutterw}\renewcommand{\headrulewidth}{0pt}
  \fancyfoot[L]{\jpmono\fontsize{6.5}{8}\selectfont\color{jpTextMuted}\MakeUppercase{\jp@name}\ \textperiodcentered\ \thepage}
  \newcommand{\makeresumeheader}{%
    \noindent{\jpdisplay\bfseries\jp@namesize\color{jpText}\jp@name\jp@namedot\par}
    \vspace{2pt}\noindent{\color{\jp@rcol}\jplabel{\jp@headline}}\par
    \vspace{3pt}\noindent{\jpmono\fontsize{7.5}{10}\selectfont\color{jpTextMuted}\jp@contact\par}
    \vspace{1mm}\jp@uline{60mm}\vspace{1mm}}
  \newcommand{\resumesection}[1]{\stepcounter{jp@secno}%
    \par\vspace{\jp@secgap}\noindent\jpgutter[\jp@rcol]{\jptwodigits{jp@secno}\ \,#1}{\color{jpBorder}\rule[0.3em]{\linewidth}{0.4pt}}\par\vspace{3pt}\nopagebreak}
  \newcommand{\resumeentry}[5]{%
    \par\vspace{3.5pt}\noindent\jpgutter{#3}{\bfseries\color{jpText}#1}%
    \ifx\\#2\\\else\jpmuted{\ \textbar\ #2}\fi%
    \ifx\\#4\\\else\jpmuted{, #4}\fi\par
    \ifx\\#5\\\else\vspace{1.5pt}#5\fi}
  \newcommand{\resumeskill}[2]{\par\vspace{1.5pt}\noindent\jpgutter[\jp@rcol]{#1}{#2}\par}
  \newcommand{\resumeproject}[2]{\par\vspace{2pt}\noindent\jpgutter[jpText]{#1}{#2}\par}
  \newcommand{\resumeside}[2]{\g@addto@macro\jp@deferred{\resumesection{#1}#2}}
\fi

%% =====================================================================
%% SIDEBAR
%% =====================================================================
\ifjp@sidebar
  \newlength{\jp@sidew}\setlength{\jp@sidew}{64mm}
  \newlength{\jp@sidepad}\setlength{\jp@sidepad}{7mm}
  \newlength{\jp@bandh}\setlength{\jp@bandh}{44mm}
  \geometry{top=14mm,bottom=14mm,left=77mm,right=13mm}
  \jpbody{9.6}{12.6}
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
  \newcommand{\resumesection}[1]{\stepcounter{jp@secno}%
    \par\vspace{9pt}\noindent{\color{jpAccent}\jplabel{\jptwodigits{jp@secno}\ \,#1}}\par\vspace{1pt}%
    {\color{jpBorder}\hrule height 0.4pt}\vspace{4pt}\nopagebreak}
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
        {\raggedright\jpdisplay\bfseries\fontsize{26}{28}\selectfont\color{jpOnAccent}\jp@name\par}%
        \vspace{5pt}{\raggedright\jpmono\fontsize{6.8}{9}\selectfont\color{jpOnAccent}\MakeUppercase{\jp@headline}\par}}}}%
      \put(\jp@sidepad,-\dimexpr\jp@bandh+2mm\relax){\makebox(0,0)[tl]{\usebox{\jp@sidebox}}}%
    \fi}
\fi
\endinput
