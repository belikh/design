%% jupiter-invoice.cls: tax invoices with computed totals.
%%   \invoicefrom{Name \\ address \\ ABN ...}  \invoiceto{Client \\ address}
%%   \invoicenumber{INV-0001} \invoicedate{12 Nov 2026} \invoiceduedate{26 Nov 2026}
%%   \invoicestatus{Unpaid}  \currency{\$}  \taxrate{10}  \taxname{GST}
%%   \begin{invoiceitems} \invoiceitem{Description}{qty}{unit price} ... \end{invoiceitems}
%%   \invoicetotals   \paymentdetails{...}   \invoicenotes{...}
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-invoice}[2026/01/01 Jupiter invoice]
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,10pt]{article}
\RequirePackage{jupiter}
\RequirePackage[top=18mm,bottom=18mm,left=20mm,right=20mm]{geometry}
\RequirePackage{tabularx}
\RequirePackage{booktabs}
\pagestyle{empty}\setlength{\parindent}{0pt}\setlength{\parskip}{0pt}
\AtBeginDocument{\jpsans\fontsize{9.8}{13.4}\selectfont\color{jpText}}

\newcommand{\invoicefrom}[1]{\gdef\jp@from{#1}}
\newcommand{\invoiceto}[1]{\gdef\jp@to{#1}}
\newcommand{\invoicenumber}[1]{\gdef\jp@num{#1}}
\newcommand{\invoicedate}[1]{\gdef\jp@idate{#1}}
\newcommand{\invoiceduedate}[1]{\gdef\jp@due{#1}}
\newcommand{\invoicestatus}[1]{\gdef\jp@stat{#1}}
\newcommand{\currency}[1]{\gdef\jp@cur{#1}}
\newcommand{\taxname}[1]{\gdef\jp@taxname{#1}}
\newcommand{\paymentdetails}[1]{\gdef\jp@pay{#1}}
\newcommand{\invoicenotes}[1]{\gdef\jp@notes{#1}}
\gdef\jp@from{}\gdef\jp@to{}\gdef\jp@num{}\gdef\jp@idate{\today}\gdef\jp@due{}\gdef\jp@stat{}
\gdef\jp@cur{\$}\gdef\jp@taxname{GST}\gdef\jp@pay{}\gdef\jp@notes{}

\ExplSyntaxOn
\fp_new:N \g__jp_sub_fp
\fp_new:N \g__jp_tmp_fp
\fp_new:N \g__jp_taxrate_fp
\fp_gset:Nn \g__jp_taxrate_fp { 10 }
\NewDocumentCommand{\taxrate}{m}{ \fp_gset:Nn \g__jp_taxrate_fp { #1 } }
% money: format a number with thousands separators and two decimals
\cs_new:Npn \__jp_money:n #1
  {
    \int_set:Nn \l__jp_cents_int { \fp_eval:n { round( #1 * 100 , 0 ) } }
    \int_compare:nNnT { \l__jp_cents_int } < { 0 } { - }
    \int_set:Nn \l__jp_abs_int { \int_abs:n { \l__jp_cents_int } }
    \jp@cur
    \__jp_grp:n { \int_div_truncate:nn { \l__jp_abs_int } { 100 } }
    .
    \int_compare:nNnT { \int_mod:nn { \l__jp_abs_int } { 100 } } < { 10 } { 0 }
    \int_mod:nn { \l__jp_abs_int } { 100 }
  }
\int_new:N \l__jp_cents_int
\int_new:N \l__jp_abs_int
\cs_new:Npn \__jp_grp:n #1
  {
    \int_compare:nNnTF { #1 } < { 1000 }
      { #1 }
      { \exp_args:Nf \__jp_grp:n { \int_div_truncate:nn { #1 } { 1000 } } , \int_compare:nNnT { \int_mod:nn { #1 } { 1000 } } < { 100 } { 0 } \int_compare:nNnT { \int_mod:nn { #1 } { 1000 } } < { 10 } { 0 } \int_mod:nn { #1 } { 1000 } }
  }
\NewDocumentCommand{\jpmoney}{m}{ \__jp_money:n { #1 } }
\NewDocumentCommand{\invoiceitem}{m m m}
  {
    \fp_gset:Nn \g__jp_tmp_fp { #2 * #3 }
    \fp_gadd:Nn \g__jp_sub_fp { \g__jp_tmp_fp }
    #1 & \jpmono\small #2 & \jpmono\small \__jp_money:n { #3 } & \jpmono\small \__jp_money:n { \g__jp_tmp_fp } \\
  }
\NewDocumentCommand{\invoicetotals}{}
  {
    \par\vspace{6pt}\hfill
    \begin{tabular}{@{}l r@{}}
      \jpmuted{Subtotal} & \jpmono\small \__jp_money:n { \g__jp_sub_fp } \\
      \jpmuted{\jp@taxname\ (\fp_eval:n{\g__jp_taxrate_fp}\%)} & \jpmono\small \__jp_money:n { \g__jp_sub_fp * \g__jp_taxrate_fp / 100 } \\
      \noalign{\vspace{2pt}\color{jpAccent}\hrule height 1.2pt\vspace{3pt}}
      \bfseries Total\space due & \jpmono\bfseries\color{jpAccent} \__jp_money:n { \g__jp_sub_fp * ( 1 + \g__jp_taxrate_fp / 100 ) } \\
    \end{tabular}\par
  }
\ExplSyntaxOff

\newenvironment{invoiceitems}{%
  \renewcommand{\arraystretch}{1.5}%
  \noindent\begin{tabular}{@{}>{\raggedright\arraybackslash}p{0.5\linewidth} r r r@{}}
  \color{jpAccent}\jplabel{Description} & \color{jpAccent}\jplabel{Qty} & \color{jpAccent}\jplabel{Unit} & \color{jpAccent}\jplabel{Amount}\\
  \noalign{\color{jpBorder}\hrule height 0.5pt}}{%
  \noalign{\color{jpBorder}\hrule height 0.5pt}\end{tabular}}

\renewcommand{\maketitle}{%
  \noindent\begin{minipage}[t]{0.58\linewidth}
    {\jpdisplay\bfseries\fontsize{26}{29}\selectfont INVOICE}\par
    \vspace{3pt}{\jpmono\small\color{jpAccent}\jp@num}\par
    \ifdefempty{\jp@stat}{}{\vspace{4pt}\jpbadge[warn]{\jp@stat}\par}
  \end{minipage}\hfill
  \begin{minipage}[t]{0.38\linewidth}\raggedleft
    {\jpmono\footnotesize\color{jpTextMuted}ISSUED}\ \ {\jpmono\small\jp@idate}\par
    \ifdefempty{\jp@due}{}{{\jpmono\footnotesize\color{jpTextMuted}DUE}\ \ {\jpmono\small\jp@due}\par}
  \end{minipage}
  \par\vspace{6pt}{\jpaccentrule[1.4pt]}\vspace{10pt}
  \noindent\begin{minipage}[t]{0.48\linewidth}
    {\color{jpAccent}\jplabel{From}}\par\vspace{2pt}\jp@from\par
  \end{minipage}\hfill
  \begin{minipage}[t]{0.48\linewidth}
    {\color{jpAccent}\jplabel{Bill to}}\par\vspace{2pt}\jp@to\par
  \end{minipage}
  \par\vspace{14pt}}

\newcommand{\invoicefooter}{%
  \ifdefempty{\jp@pay}{}{\vspace{16pt}\noindent{\color{jpAccent}\jplabel{Payment details}}\par\vspace{2pt}{\jp@pay}\par}
  \ifdefempty{\jp@notes}{}{\vspace{10pt}\noindent{\color{jpAccent}\jplabel{Notes}}\par\vspace{2pt}{\small\jp@notes}\par}}
\endinput
