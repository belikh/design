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
\RequirePackage{jupiter-money}
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
\newcommand{\taxname}[1]{\gdef\jp@taxname{#1}}
\newcommand{\paymentdetails}[1]{\gdef\jp@pay{#1}}
\newcommand{\invoicenotes}[1]{\gdef\jp@notes{#1}}
\newcommand{\invoicekind}[1]{\gdef\jp@kind{#1}}
\newcommand{\invoicedatelabel}[1]{\gdef\jp@ldate{#1}}
\newcommand{\invoiceduelabel}[1]{\gdef\jp@ldue{#1}}
\newcommand{\invoicefromlabel}[1]{\gdef\jp@lfrom{#1}}
\newcommand{\invoicetolabel}[1]{\gdef\jp@lto{#1}}
\newcommand{\invoicetotallabel}[1]{\gdef\jp@ltotal{#1}}
\newcommand{\invoiceextra}[2]{\g@addto@macro\jp@extra{\jp@irow{#1}{#2}}}
\newcommand{\invoicesign}[2]{\gdef\jp@signa{#1}\gdef\jp@signb{#2}}
\gdef\jp@kind{Invoice}\gdef\jp@ldate{Issued}\gdef\jp@ldue{Due}\gdef\jp@lfrom{From}\gdef\jp@lto{Bill to}\gdef\jp@ltotal{Total due}
\gdef\jp@extra{}\gdef\jp@signa{}\gdef\jp@signb{}
\gdef\jp@from{}\gdef\jp@to{}\gdef\jp@num{}\gdef\jp@idate{\today}\gdef\jp@due{}\gdef\jp@stat{}
\gdef\jp@taxname{GST}\gdef\jp@pay{}\gdef\jp@notes{}

\newcommand{\invoiceitem}[3]{#1 & \jpcells{#2}{#3} \\}
\let\invoiceitems\jpitems\let\endinvoiceitems\endjpitems

\let\jp@irow\jprow

\newcommand{\invoicetotals}{%
  \par\Needspace*{40mm}\vspace{8pt}\nopagebreak\noindent
  \begin{tabular*}{\linewidth}{@{\extracolsep{\fill}}@{}l r@{}}
    \jpmuted{Subtotal} & \jp@fig{\jpsubtotal} \\
    \jpmuted{\jp@taxname\ (\jptaxrate\%)} & \jp@fig{\jptaxamount} \\
  \end{tabular*}\par\vspace{6pt}\nopagebreak
  \noindent{\color{jpText}\rule{\linewidth}{0.9pt}}\par\vspace{5pt}\nopagebreak
  \noindent\jpgutter[jpAccent]{\jp@ltotal}%
  \hfill{\jpdisplay\bfseries\fontsize{50}{54}\selectfont\jptotaldue}\par}

\renewcommand{\maketitle}{%
  \thispagestyle{empty}%
  \jpat[north east]{192mm}{16mm}{\jpart[width=31mm]{logo-light}}%
  \jpat{0mm}{51mm}{\jpart[width=210mm]{swash-accent}}%
  \noindent\jpgutter[jpAccent]{\jp@kind}%
  {\jpdisplay\bfseries\fontsize{48}{50}\selectfont\jp@kind}\par
  \vspace{4pt}\noindent{\jpmono\small\color{jpAccent}\jp@num}%
  \ifdefempty{\jp@stat}{}{\hspace{10pt}\jpbadge[warn]{\jp@stat}}\par
  \vspace{15mm}
  \jp@irow{\jp@ldate}{\jpmono\small\jp@idate}%
  \ifdefempty{\jp@due}{}{\jp@irow{\jp@ldue}{\jpmono\small\jp@due}}%
  \jp@irow{\jp@lfrom}{\jp@from}%
  \jp@irow{\jp@lto}{\jp@to}%
  \jp@extra
  {\color{jpBorder}\rule{\linewidth}{0.4pt}}\par}

\newcommand{\invoicefooter}{%
  \Needspace*{50mm}%
  \ifdefempty{\jp@pay}{}{\vspace{14pt}\jp@irow{Payment}{\jp@pay}}%
  \ifdefempty{\jp@notes}{}{\vspace{4pt}\jp@irow{Notes}{\small\jp@notes}}%
  \ifdefempty{\jp@signa}{}{\jpsign{\jp@signa}{\jp@signb}}}

%% pages after the first: a running line with the invoice number and page
\pagestyle{fancy}\fancyhf{}\fancyhfoffset[L]{\jpgutterw}
\renewcommand{\headrulewidth}{0.4pt}\renewcommand{\headrule}{{\color{jpBorder}\hrule width\headwidth height 0.4pt}}
\fancyhead[L]{\jpmono\fontsize{7}{9}\selectfont\color{jpTextMuted}\MakeUppercase{\jp@kind} \jp@num}
\fancyfoot[L]{\jpmono\fontsize{7}{9}\selectfont\color{jpAccent}\thepage}
\endinput
