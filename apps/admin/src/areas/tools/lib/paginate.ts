export type Block = { id: string; h: number; keepWithNext?: boolean; type?: string };
export type Page = { blocks: Block[]; used: number };
/** Greedy pagination: fill pages up to `pageH`; a keepWithNext block moves to the next page if its follower won't fit; a block taller than a page gets a page to itself. */
export function paginate(blocks: Block[], pageH: number): Page[] {
  const pages: Page[] = [{ blocks: [], used: 0 }];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]; const cur = pages[pages.length - 1]; const need = b.keepWithNext && blocks[i + 1] ? b.h + blocks[i + 1].h : b.h;
    if (cur.used + need > pageH && cur.blocks.length) pages.push({ blocks: [], used: 0 });
    const p = pages[pages.length - 1]; p.blocks.push(b); p.used += b.h;
  }
  return pages;
}
export const PAGE_SIZES = { A4: { w: 210, h: 297 }, Letter: { w: 215.9, h: 279.4 }, A5: { w: 148, h: 210 } } as const;
