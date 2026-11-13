%% jupiter-invoice.cls: tax invoices with computed totals. The typographic Jupiter look: a 44 mm gutter of mono labels beside a
%% 130 mm column, SGI Alt title, one big total, a hand-drawn flowing line under the title. Long invoices run onto further pages
%% (the item table repeats its header).
%%   \invoicefrom{Name \\ address \\ ABN ...}  \invoiceto{Client \\ address}
%%   \invoicenumber{INV-0001} \invoicedate{12 Nov 2026} \invoiceduedate{26 Nov 2026}
%%   \invoicestatus{Unpaid}  \currency{\$}  \taxrate{10}  \taxname{GST}
%%   \begin{invoiceitems} \invoiceitem{Description}{qty}{unit price} ... \end{invoiceitems}
%%   \invoicetotals   \paymentdetails{...}   \invoicenotes{...}   \invoicefooter
%% The computed figures are available as \jpsubtotal \jptaxamount \jptotaldue \jptaxrate for your own layout.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{jupiter-invoice}[2026/01/01 Jupiter invoice]
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,10pt]{article}
\RequirePackage{jupiter}
\RequirePackage[top=30mm,bottom=24mm,left=62mm,right=18mm,headheight=12pt,headsep=8mm]{geometry}
\RequirePackage{array}
\RequirePackage{longtable}
\RequirePackage{booktabs}
\RequirePackage{fancyhdr}
\RequirePackage{needspace}
\setlength{\parindent}{0pt}\setlength{\parskip}{0pt}
\jpbody{9.8}{13.4}
\setlength{\LTleft}{0pt}\setlength{\LTright}{0pt}

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

%% a figure: mono, small. \jp@fig keeps cells on one baseline with the description.
\newcommand{\jp@fig}[1]{{\jpmono\small #1}}

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
    #1 & \jp@fig{#2} & \jp@fig{ \__jp_money:n { #3 } } & \jp@fig{ \__jp_money:n { \g__jp_tmp_fp } } \\
  }
\NewDocumentCommand{\jpsubtotal}{}{ \__jp_money:n { \g__jp_sub_fp } }
\NewDocumentCommand{\jptaxamount}{}{ \__jp_money:n { \g__jp_sub_fp * \g__jp_taxrate_fp / 100 } }
\NewDocumentCommand{\jptotaldue}{}{ \__jp_money:n { \g__jp_sub_fp * ( 1 + \g__jp_taxrate_fp / 100 ) } }
\NewDocumentCommand{\jptaxrate}{}{ \fp_eval:n { \g__jp_taxrate_fp } }
\ExplSyntaxOff
%% ---- item table: description + three right-aligned mono columns, no vertical rules, header repeats on every page.
\newlength{\jp@wqty}\setlength{\jp@wqty}{14mm}
\newlength{\jp@wunit}\setlength{\jp@wunit}{28mm}
\newlength{\jp@wamt}\setlength{\jp@wamt}{30mm}
\newcolumntype{R}[1]{>{\raggedleft\arraybackslash}p{#1}}
\newcommand{\jp@ihead}{%
  \jpgutter{}{\color{jpTextMuted}\jplabel{Description}} & \multicolumn{1}{R{\jp@wqty}}{\color{jpTextMuted}\jplabel{Qty}} & \multicolumn{1}{R{\jp@wunit}}{\color{jpTextMuted}\jplabel{Unit}} & \multicolumn{1}{R{\jp@wamt}}{\color{jpTextMuted}\jplabel{Amount}}\\
  \noalign{\color{jpText}\hrule height 0.9pt}}
\newenvironment{invoiceitems}{%
  \par\vspace{10pt}\noindent
  \setlength{\extrarowheight}{3pt}\setlength{\tabcolsep}{0pt}%
  \begin{longtable}{@{}>{\raggedright\arraybackslash}p{\dimexpr\linewidth-\jp@wqty-\jp@wunit-\jp@wamt\relax}R{\jp@wqty}R{\jp@wunit}R{\jp@wamt}@{}}
  \jp@ihead \endfirsthead
  \jp@ihead \endhead
  \noalign{\color{jpBorder}\hrule height 0.4pt}\endfoot
  \noalign{\color{jpBorder}\hrule height 0.4pt}\endlastfoot
  \ignorespaces}{%
  \end{longtable}\vspace{-\baselineskip}}

%% ---- header rows: a hairline, a mono label in the gutter, the value in the column
\newcommand{\jp@irow}[2]{\par\noindent{\color{jpBorder}\rule{\linewidth}{0.4pt}}\par\vspace{4pt}%
  \noindent\jpgutter{#1}{#2}\par\vspace{5pt}}

\newcommand{\invoicetotals}{%
  \par\Needspace*{40mm}\vspace{8pt}\nopagebreak\noindent
  \begin{tabular*}{\linewidth}{@{\extracolsep{\fill}}@{}l r@{}}
    \jpmuted{Subtotal} & \jp@fig{\jpsubtotal} \\
    \jpmuted{\jp@taxname\ (\jptaxrate\%)} & \jp@fig{\jptaxamount} \\
  \end{tabular*}\par\vspace{6pt}\nopagebreak
  \noindent{\color{jpText}\rule{\linewidth}{0.9pt}}\par\vspace{5pt}\nopagebreak
  \noindent\jpgutter[jpAccent]{Total due}%
  \hfill{\jpdisplay\bfseries\fontsize{50}{54}\selectfont\jptotaldue}\par}

\renewcommand{\maketitle}{%
  \thispagestyle{empty}%
  \jpat[north east]{192mm}{16mm}{\jpart[width=31mm]{logo-light}}%
  \jpat{0mm}{51mm}{\jpart[width=210mm]{swash-accent}}%
  \noindent\jpgutter[jpAccent]{Invoice}%
  {\jpdisplay\bfseries\fontsize{48}{50}\selectfont Invoice}\par
  \vspace{4pt}\noindent{\jpmono\small\color{jpAccent}\jp@num}%
  \ifdefempty{\jp@stat}{}{\hspace{10pt}\jpbadge[warn]{\jp@stat}}\par
  \vspace{15mm}
  \jp@irow{Issued}{\jpmono\small\jp@idate}%
  \ifdefempty{\jp@due}{}{\jp@irow{Due}{\jpmono\small\jp@due}}%
  \jp@irow{From}{\jp@from}%
  \jp@irow{Bill to}{\jp@to}%
  {\color{jpBorder}\rule{\linewidth}{0.4pt}}\par}

\newcommand{\invoicefooter}{%
  \Needspace*{50mm}%
  \ifdefempty{\jp@pay}{}{\vspace{14pt}\jp@irow{Payment}{\jp@pay}}%
  \ifdefempty{\jp@notes}{}{\vspace{4pt}\jp@irow{Notes}{\small\jp@notes}}}

%% pages after the first: a running line with the invoice number and page
\pagestyle{fancy}\fancyhf{}\fancyhfoffset[L]{\jpgutterw}
\renewcommand{\headrulewidth}{0.4pt}\renewcommand{\headrule}{{\color{jpBorder}\hrule width\headwidth height 0.4pt}}
\fancyhead[L]{\jpmono\fontsize{7}{9}\selectfont\color{jpTextMuted}INVOICE \jp@num}
\fancyfoot[L]{\jpmono\fontsize{7}{9}\selectfont\color{jpAccent}\thepage}
\endinput
