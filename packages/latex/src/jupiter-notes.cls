%% jupiter-notes.cls: working notes in the typographic Jupiter look. Section numbers and \jpmargin{} remarks hang in the
%% 44 mm gutter on the left, beside a 130 mm text column; checklists, callouts and code sit in the column.
%%   \notemeta{2026-11-12}{tag-one, tag-two}   then \maketitle
%%   \begin{jptodo} \todo{open task} \done{finished task} \end{jptodo}
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-notes}[2026/01/01 Jupiter notes]
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,10pt]{article}
\RequirePackage{jupiter}
\RequirePackage[top=24mm,bottom=22mm,left=62mm,right=18mm,marginparwidth=40mm,marginparsep=4mm,headheight=12pt]{geometry}
\RequirePackage{titlesec}
\RequirePackage{fancyhdr}
\RequirePackage{array}
\RequirePackage{booktabs}
\reversemarginpar
\setlength{\parindent}{0pt}\setlength{\parskip}{0.55em}
\jpbody{9.8}{13.8}

\newcommand{\notemeta}[2]{\gdef\jp@notedate{#1}\gdef\jp@notetags{#2}}
\gdef\jp@notedate{\today}\gdef\jp@notetags{}
\renewcommand{\maketitle}{%
  \par\noindent\jpgutter[jpAccent]{Notes}{\jpmono\fontsize{7.5}{10}\selectfont\color{jpTextMuted}\MakeUppercase{\jp@notedate}%
    \ifx\\\jp@notetags\\\else\hspace{1em}{\color{jpAccent}\MakeUppercase{\jp@notetags}}\fi}\par
  \vspace{7pt}{\jpdisplay\bfseries\fontsize{34}{36}\selectfont\@title\par}
  \vspace{1mm}\jpunderline[accent]{70mm}\vspace{3mm}}

\titleformat{\section}{\jpdisplay\bfseries\fontsize{16}{18}\selectfont}{\jpgutter[jpAccent]{\jptwodigits{section}}}{0pt}{}
\titleformat{\subsection}{\jpdisplay\bfseries\normalsize}{\jpgutter{\jptwodigits{section}.\arabic{subsection}}}{0pt}{}
\titlespacing*{\section}{0pt}{1.6em}{0.6em}
\titlespacing*{\subsection}{0pt}{1.1em}{0.35em}
\renewcommand{\thesection}{\jptwodigits{section}}

\newcommand{\jpmargin}[1]{\marginpar{\raggedright\jpmono\fontsize{7}{9.6}\selectfont\color{jpTextMuted}\setlength{\parskip}{2pt}#1}}

\newcommand{\jp@box}{\fboxsep=0pt\fboxrule=0.6pt\color{jpAccent}\fbox{\rule{0pt}{0.62em}\rule{0.62em}{0pt}}}
\newcommand{\jp@boxdone}{\color{jpAccent}\rule{0.62em}{0.62em}}
\newenvironment{jptodo}{\begin{list}{}{\setlength{\leftmargin}{1.7em}\setlength{\labelwidth}{1.4em}\setlength{\itemsep}{1.5pt}\setlength{\topsep}{2pt}\setlength{\parsep}{0pt}}}{\end{list}}
\newcommand{\todo}[1]{\item[{\jp@box}] #1}
\newcommand{\done}[1]{\item[{\jp@boxdone}] {\color{jpTextMuted}#1}}

\pagestyle{fancy}\fancyhf{}\fancyhfoffset[L]{\jpgutterw}
\renewcommand{\headrulewidth}{0pt}
\fancyfoot[L]{\jpmono\fontsize{7}{9}\selectfont\color{jpAccent}\thepage}
\fancyfoot[R]{\jpmono\fontsize{7}{9}\selectfont\color{jpTextMuted}\MakeUppercase{\@title}}
\endinput
