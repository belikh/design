%% jupiter-letter.cls: formal letters and cover letters.
%%   \documentclass{jupiter-letter}         formal: serif, monochrome, conventional layout
%%   \documentclass[cover]{jupiter-letter}  cover letter: matches the `dense` resume (sans, accent rule)
%% Usage:
%%   \sender{Name}{Address line 1 \\ Address line 2}{contact line}
%%   \recipient{Name \\ Organisation \\ Address}
%%   \letterdate{12 November 2026}   % optional, defaults to \today
%%   \subject{Re: Application for ...}
%%   \begin{jpletter}{Dear Ms Smith,} ... \end{jpletter}
%%   \signoff{Yours sincerely,}{Name}[Enclosures: Resume]
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-letter}[2026/01/01 Jupiter letter]
\newif\ifjp@cover
\DeclareOption{cover}{\jp@covertrue}
\DeclareOption{formal}{\jp@coverfalse}
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,11pt]{article}
\RequirePackage{jupiter}
\RequirePackage{geometry}
\geometry{top=22mm,bottom=22mm,left=25mm,right=25mm}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.8em}
\ifjp@cover
  \AtBeginDocument{\jpsans\fontsize{10.4}{14.6}\selectfont}
\else
  \hypersetup{colorlinks=false,pdfborder={0 0 0}}
  \AtBeginDocument{\jpserif\fontsize{11}{14.8}\selectfont\color{jpText}}
\fi

\newcommand{\sender}[3]{\gdef\jp@sname{#1}\gdef\jp@saddr{#2}\gdef\jp@scontact{#3}}
\newcommand{\recipient}[1]{\gdef\jp@rcpt{#1}}
\newcommand{\letterdate}[1]{\gdef\jp@date{#1}}
\newcommand{\subject}[1]{\gdef\jp@subject{#1}}
\gdef\jp@sname{}\gdef\jp@saddr{}\gdef\jp@scontact{}\gdef\jp@rcpt{}\gdef\jp@date{\today}\gdef\jp@subject{}

\newcommand{\jp@letterhead}{%
  \ifjp@cover
    {\noindent{\jpdisplay\bfseries\fontsize{22}{25}\selectfont\color{jpText}\jp@sname}\par}
    \vspace{3pt}{\noindent\jpmono\footnotesize\color{jpTextMuted}\jp@saddr\ifx\\\jp@scontact\\\else\ \textperiodcentered\ \jp@scontact\fi\par}
    \vspace{4pt}{\jpaccentrule[1.4pt]}\vspace{14pt}
    {\raggedleft\jp@date\par}
  \else
    {\raggedleft{\scshape\bfseries\large\jp@sname}\par\vspace{2pt}
     {\small\jp@saddr\par\ifx\\\jp@scontact\\\else\jp@scontact\par\fi}\par}
    \vspace{16pt}
    {\raggedleft\jp@date\par}
  \fi
  \vspace{10pt}
  \ifx\\\jp@rcpt\\\else{\noindent\jp@rcpt\par}\vspace{10pt}\fi
  \ifx\\\jp@subject\\\else{\noindent\bfseries\jp@subject\par}\vspace{4pt}\fi}

\newenvironment{jpletter}[1]{\jp@letterhead\noindent #1\par}{}

\newcommand{\signoff}[3][]{%
  \par\vspace{1em}\noindent #2\par\vspace{2.6em}\noindent{\bfseries #3}\par
  \ifx\\#1\\\else\vspace{1.2em}{\small\jpmuted{#1}}\par\fi}
\endinput
