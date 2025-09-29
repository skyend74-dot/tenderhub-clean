// api/lots/search.ts
// ВАЖНО: для Edge-функции в проектах без Next.js нужен именно export const config = { runtime: 'edge' }.
export const config = { runtime: 'edge' };

// ---- Типы (для удобства разработки, на рантайм не влияют) ----
type LotStatus = 'open' | 'closed' | 'awarded' | 'cancelled' | 'unknown';
type Lot = {
  id: string;
  source: 'etender' | 'xarid';
  url: string;
  title: string;
  description: string;
  category: string;
  buyer: string;
  region: string;
  budget_amount: number;
  currency: 'UZS' | 'USD' | 'EUR';
  bid_deadline_at: string;  // ISO
  published_at: string;     // ISO
  status: LotStatus;
};

// ---- Лёгкие мок-данные (никаких внешних запросов) ----
const MOCK_LOTS: Lot[] = [
  {
    id: 'L-1001',
    source: 'etender',
    url: 'https://etender.uzex.uz/lots/2/1001',
    title: 'Поставка автошин 195/65R15 (Tunga Zodiak)',
    description:
      'Поставка автошин для служебного автопарка; сертификат соответствия обязателен.',
    category: 'Авто и шины',
    buyer: 'МВД РУз',
    region: 'Ташкент',
    budget_amount: 950_000_000,
    currency: 'UZS',
    bid_deadline_at: new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString(),
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    status: 'open',
  },
  {
    id: 'L-1002',
    source: 'xarid',
    url: 'https://xarid.uzex.uz/lots/2/1002',
    title: 'Рукава всасывающие D125 мм, 4 м',
    description:
      'Рукав всасывающий для забора воды, 2025 г.в., новый, без повреждений.',
    category: 'Пожарная безопасность',
    buyer: 'Министерство по ЧС',
    region: 'Самарканд',
    budget_amount: 320_000_000,
    currency: 'UZS',
    bid_deadline_at: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    status: 'open',
  },
];

// ---- Вспомогательный ответ JSON ----
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // чтобы браузер не кэшировал ответ во время отладки
      'cache-control': 'no-store',
    },
  });
}

// ---- Основной обработчик Edge-функции ----
export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json({ ok: false, error: 'Method Not Allowed' }, 405);
    }

    // Безопасно читаем q (ограничим длину, чтобы не тратить время на чрезмерные строки)
    const { searchParams } = new URL(req.url);
    const qRaw = (searchParams.get('q') || '').trim();
    const q = qRaw.length > 120 ? '' : qRaw.toLowerCase();

    // Фильтруем только по уже загруженным мок-данным (никаких сетевых запросов)
    let items = MOCK_LOTS;
    if (q) {
      items = items.filter((l) =>
        ((l.title || '') + ' ' + (l.description || '') + ' ' + (l.buyer || ''))
          .toLowerCase()
          .includes(q)
      );
    }

    return json({ ok: true, items });
  } catch (e: any) {
    return json(
      { ok: false, error: e?.message || String(e || 'Unknown error') },
      500
    );
  }
}
