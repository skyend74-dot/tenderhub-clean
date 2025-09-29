// pages/api/dev/parse.ts
export const config = { runtime: 'nodejs' } as const;

import type { NextApiRequest, NextApiResponse } from 'next';
import { parseEtenderDetail } from '@/lib/collect-etender';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const url = (req.query.url as string) || '';
    if (!url) {
      res.status(400).json({ ok: false, error: 'Добавьте ?url=https://etender.uzex.uz/civil-detail/XXXX' });
      return;
    }

    const html = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0' },
      cache: 'no-store',
    }).then(r => r.text());

    const lot = parseEtenderDetail(html, url);
    res.status(200).json({ ok: true, lot });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
