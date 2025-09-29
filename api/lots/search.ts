// api/lots/search.ts
export const runtime = 'edge';

type LotStatus = 'open' | 'closed' | 'awarded' | 'cancelled' | 'unknown';
type Lot = {
  id: string; source: 'etender' | 'xarid'; url: string; title: string;
  description: string; category: string; buyer: string; region: string;
  budget_amount: number; currency: 'UZS'|'USD'|'EUR';
  bid_deadline_at: string; published_at: string; status: LotStatus;
};

const MOCK_LOTS: Lot[] = [
  /* ваши 2–3 мок-лота как сейчас */
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function parseBool(v: string | null) { return v === '1' || v === 'true'; }
function parseNum(v: string | null) { const n = Number(v ?? ''); return Number.isFinite(n) ? n : null; }

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const source = url.searchParams.get('source') || 'all';
    const region = url.searchParams.get('region') || 'all';
    const category = url.searchParams.get('category') || 'all';
    const minBudget = parseNum(url.searchParams.get('minBudget'));
    const onlyOpen = parseBool(url.searchParams.get('onlyOpen') || '0');
    const sort = url.searchParams.get('sort') || 'published_desc';

    let items = [...MOCK_LOTS];

    if (q) items = items.filter(l =>
      ((l.title||'')+' '+(l.description||'')+' '+(l.buyer||'')).toLowerCase().includes(q)
    );
    if (source !== 'all') items = items.filter(l => l.source === source);
    if (region !== 'all') items = items.filter(l => l.region === region);
    if (category !== 'all') items = items.filter(l => l.category === category);
    if (minBudget !== null) items = items.filter(l => (l.budget_amount || 0) >= minBudget);
    if (onlyOpen) items = items.filter(l => l.status === 'open');

    const toTime = (s?: string) => s ? Date.parse(s) : NaN;
    switch (sort) {
      case 'deadline_asc':  items.sort((a,b)=> toTime(a.bid_deadline_at)-toTime(b.bid_deadline_at)); break;
      case 'deadline_desc': items.sort((a,b)=> toTime(b.bid_deadline_at)-toTime(a.bid_deadline_at)); break;
      case 'budget_asc':   items.sort((a,b)=> (a.budget_amount||0)-(b.budget_amount||0)); break;
      case 'budget_desc':  items.sort((a,b)=> (b.budget_amount||0)-(a.budget_amount||0)); break;
      default: // published_desc
        items.sort((a,b)=> toTime(b.published_at)-toTime(a.published_at));
    }

    return json({ ok: true, items });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}
