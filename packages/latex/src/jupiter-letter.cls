%% jupiter-letter.cls: formal letters and cover letters, in the typographic Jupiter look: a 44 mm gutter of mono labels
%% (date, to, subject) beside a 130 mm text column, the sender's name in SGI Alt, a hand-drawn underline, small logo top-right.
%%   \documentclass{jupiter-letter}         formal: ink underline, no accent
%%   \documentclass[cover]{jupiter-letter}  cover letter: accent underline and the red spot after the name
%% Usage:
%%   \sender{Name}{Address line 1 \\ Address line 2}{contact line}
%%   \recipient{Name \\ Organisation \\ Address}
%%   \letterdate{12 November 2026}   % optional, defaults to \today
%%   \subject{Re: Application for ...}
%%   \begin{jpletter}{Dear Ms Smith,} ... \end{jpletter}
%%   \lettertype{Memo}  \letterrow{Label}{value}  \subjectlabel{Subject}  \recipientlabel{To}   other kinds of letter: memo, offer, thank-you
%%   \signoff{Yours sincerely,}{Name}[Enclosures: Resume]
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-letter}[2026/01/01 Jupiter letter]
\newif\ifjp@cover
\DeclareOption{cover}{\jp@covertrue}
\DeclareOption{formal}{\jp@coverfalse}
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,10pt]{article}
\RequirePackage{jupiter}
\RequirePackage{jupiter-doc}
\RequirePackage[top=22mm,bottom=24mm,left=62mm,right=18mm]{geometry}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.8em}
\jpbody{10}{14.6}
\ifjp@cover\else\hypersetup{colorlinks=false,pdfborder={0 0 0}}\fi

\newcommand{\sender}[3]{\gdef\jp@sname{#1}\gdef\jp@saddr{#2}\gdef\jp@scontact{#3}}
\newcommand{\recipient}[1]{\gdef\jp@rcpt{#1}}
\newcommand{\letterdate}[1]{\gdef\jp@date{#1}}
\newcommand{\subject}[1]{\gdef\jp@subject{#1}}
\newcommand{\lettertype}[1]{\gdef\jp@ltype{#1}}
\newcommand{\letterrow}[2]{\g@addto@macro\jp@lextra{\jp@lrow{#1}{#2}}}
\newcommand{\subjectlabel}[1]{\gdef\jp@lsubj{#1}}
\newcommand{\recipientlabel}[1]{\gdef\jp@lrcpt{#1}}
\gdef\jp@ltype{}\gdef\jp@lextra{}\gdef\jp@lsubj{Re}\gdef\jp@lrcpt{To}
\gdef\jp@sname{}\gdef\jp@saddr{}\gdef\jp@scontact{}\gdef\jp@rcpt{}\gdef\jp@date{\today}\gdef\jp@subject{}

\newcommand{\jp@lrow}[2]{\par\noindent{\color{jpBorder}\rule{\linewidth}{0.4pt}}\par\vspace{5pt}\nointerlineskip
  \noindent\jpgutter{#1}{#2}\par\vspace{5pt}}
\newcommand{\jp@spotdot}{\hspace{0.18em}\tikz[baseline=-0.3ex]\fill[jpDanger] (0,0) circle (1.25mm);}

\newcommand{\jp@letterhead}{%
  \jpat[north east]{192mm}{14mm}{\jpart[width=28mm]{logo-light}}%
  \vspace*{5mm}%
  \noindent\jpgutter[\ifjp@cover jpAccent\else jpTextMuted\fi]{\ifdefempty{\jp@ltype}{\ifjp@cover Cover letter\else Letter\fi}{\jp@ltype}}%
  {\jpdisplay\bfseries\fontsize{30}{32}\selectfont\color{jpText}\jp@sname\ifjp@cover\jp@spotdot\fi\par}
  \vspace{3pt}\noindent{\jpmono\fontsize{7.5}{10.5}\selectfont\color{jpTextMuted}\jp@saddr\ifx\\\jp@scontact\\\else\\\jp@scontact\fi\par}
  \vspace{1mm}\ifjp@cover\jpunderline[accent]{70mm}\else\jpunderline[ink]{70mm}\fi
  \vspace{9mm}
  \jp@lrow{Date}{\jpmono\small\jp@date}%
  \ifx\\\jp@rcpt\\\else\jp@lrow{\jp@lrcpt}{\jp@rcpt}\fi
  \ifx\\\jp@subject\\\else\jp@lrow{\jp@lsubj}{\bfseries\jp@subject}\fi
  \jp@lextra
  {\color{jpBorder}\rule{\linewidth}{0.4pt}}\par\vspace{10mm}}

\newenvironment{jpletter}[1]{\jp@letterhead\noindent #1\par}{}

\newcommand{\signoff}[3][]{%
  \par\nobreak\vskip1em\noindent #2\par\nobreak\vskip2.6em\noindent{\bfseries #3}\par
  \ifx\\#1\\\else\nobreak\vskip1.2em{\small\jpmuted{#1}}\par\fi}
\endinput
