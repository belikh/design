# Outlines "jupiter.au" from the real SGI Alt woff2 files (apps/admin/public/fonts) into logo/*.svg, with the planet mark and the three flowing lines.
# Needs: pip install fonttools brotli.   Run: python3 packages/graphics/scripts/logo.py
import os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','..'))
FD=os.path.join(ROOT,'apps/admin/public/fonts')+'/'
TH={'light':dict(ink='#16171d',acc='#4b3fbf',bg='#faf9f7'),'dark':dict(ink='#e6e4df',acc='#9d8cff',bg='#0e1016')}
def text_path(font, s, size, track=0):
    t=TTFont(FD+font+'.woff2'); gs=t.getGlyphSet(); cm=t.getBestCmap(); sc=size/t['head'].unitsPerEm
    x=0; parts=[]; dots=[]
    for ch in s:
        g=cm[ord(ch)]; pen=SVGPathPen(gs); tp=TransformPen(pen,(sc,0,0,-sc,x,0)); gs[g].draw(tp)
        d=pen.getCommands()
        parts.append((ch,d)); x+=t['hmtx'][g][0]*sc+track
    return parts, x-track, t['OS/2'].sxHeight*sc
def planet(cx,cy,r,sw,T):
    return (f'<g fill="none" stroke="{T["ink"]}" stroke-width="{sw}" stroke-linecap="round"><circle cx="{cx}" cy="{cy}" r="{r}"/>'
    f'<path d="M{cx-r*.93} {cy-r*.3}Q{cx-r*.4} {cy-r*.5} {cx} {cy-r*.3}T{cx+r*.93} {cy-r*.3}"/>'
    f'<path d="M{cx-r*.98} {cy+r*.1}Q{cx-r*.5} {cy-.1*r} {cx} {cy+r*.1}T{cx+r*.98} {cy+r*.1}"/>'
    f'<path d="M{cx-r*.85} {cy+r*.5}Q{cx-r*.4} {cy+r*.35} {cx} {cy+r*.5}T{cx+r*.85} {cy+r*.5}"/>'
    f'<path stroke="{T["acc"]}" d="M{cx+r*.28} {cy+r*.3}a{r*.2} {r*.14} 0 1 1 {r*.01} {r*.01}"/></g>')
def logo(font, mode, size=150, track=2):
    T=TH[mode]; parts,w,xh=text_path(font,'jupiter.au',size,track)
    base=100; tx=160
    glyphs=''.join(f'<path d="{d}" fill="{T["acc"] if ch=="." else T["ink"]}"/>' for ch,d in parts)
    total=tx+w+20
    lines=(f'<g fill="none" stroke-linecap="round" stroke-width="3"><path stroke="{T["ink"]}" d="M10 150C150 138 260 162 420 148S650 138 {total-10} 150"/>'
           f'<path stroke="{T["acc"]}" d="M10 164C170 156 280 172 440 162S660 154 {total-10} 164"/>'
           f'<path stroke="{T["ink"]}" d="M60 178C200 172 300 186 460 177S640 170 {total-60} 178"/></g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -30 {total+20} 235" role="img" aria-label="jupiter.au">'
            f'<title>jupiter.au</title><!-- wordmark outlined from {font}.woff2 by fontlogo.py -->{planet(62,60,58,4,T)}<g transform="translate({tx},{base})">{glyphs}</g>{lines}</svg>')
if __name__=='__main__':
    out=os.path.join(os.path.dirname(__file__),'..','logo'); os.makedirs(out,exist_ok=True)
    for font,name in [('sgi-alt-700','jupiter-logo')]:
        for m in ['light','dark']:
            open(os.path.join(out,f'{name}-{m}.svg'),'w').write(logo(font,m))
    print('wrote',sorted(os.listdir(out)))
