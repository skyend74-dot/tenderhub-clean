// lib/collect-etender.ts
import * as cheerio from 'cheerio';

export type LotStatus = 'open' | 'closed' | 'awarded' | 'cancelled' | 'unknown';
export type Lot = {
  id: string;
  source: 'etender';
  url: string;
  title: string;
  description: string;
  category: string;
  buyer: string;
  region: string;
  budget_amount: number;
  currency: 'UZS' | 'USD' | 'EUR';
  bid_deadline_at: string; // ISO
  published_at: string;    // ISO
  status: LotStatus;
};

function textOf($: cheerio.CheerioAPI, el: cheerio.Element | undefined | null): string {
  if (!el) return '';
  return $(el).text().replace(/\s+/g, ' ').trim();
}

function pickNumber(s: string): number {
  const m = (s || '').replace(/\s/g, '').match(/-?\d+(?:[.,]\d+)?/g);
  if (!m) return 0;
  const num = m.join(''); // иногда «86,500,000»
  return Number(num.replace(/,/g, '').replace(/\./g, '')) || 0;
}

function toISO(dateStr: string): string {
  // формат на сайте: 30-09-2025 09:11
  const m = dateStr.trim().match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return '';
  const [_, dd, mm, yyyy, HH, MM] = m;
  const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(HH), Number(MM));
  return isNaN(dt.getTime()) ? '' : dt.toISOString();
}

export function parseEtenderDetail(html: string, url: string): Lot {
  const $ = cheerio.load(html);

  // ID лота (вверху слева «№ лота: 2512…»)
  const id = $('.lot__header__number .lot-number').first().text().trim() || url.split('/').pop() || '';

  // Название лота (в блоке «Информация о лоте» → «Наименование лота»)
  let title = '';
  $('.lot__info__info .row').each((_, row) => {
    const label = textOf($, $(row).find('p').get(0)).toLowerCase();
    if (label.includes('наименование лота')) {
      title = $(row).find('strong').first().text().trim();
    }
  });

  // Заказчик
  let buyer = '';
  $('.lot__info__info .row').each((_, row) => {
    const label = textOf($, $(row).find('p').get(0)).toLowerCase();
    if (label.includes('наименование заказчика')) {
      buyer = $(row).find('strong').first().text().trim();
    }
  });

  // Регион / адрес доставки
  let region = '';
  $('.lot__info__info .row').each((_, row) => {
    const label = textOf($, $(row).find('p').get(0)).toLowerCase();
    if (label.includes('адрес доставки') || label.includes('место предоставления оферты')) {
      region = $(row).find('strong').first().text().trim();
    }
  });

  // Даты (карточки сверху: Дата начала / Дата окончания)
  // Безопаснее искать по тексту подписи
  let published_at = '';
  let bid_deadline_at = '';
  $('.lot__top-info').each((_, card) => {
    const label = $(card).find('p').first().text().toLowerCase();
    if (label.includes('дата начала')) {
      const v = $(card).find('strong').first().text().trim();
      published_at = toISO(v);
    }
    if (label.includes('дата окончания')) {
      const v = $(card).find('strong').first().text().trim();
      bid_deadline_at = toISO(v);
    }
  });

  // Итого стартовая стоимость
  let budget_amount = 0;
  let currency: 'UZS' | 'USD' | 'EUR' = 'UZS';
  $('.lot__top-info').each((_, card) => {
    const label = $(card).find('p').first().text().toLowerCase();
    if (label.includes('итого стартовая стоимость')) {
      const s = $(card).find('strong').text().trim();
      budget_amount = pickNumber(s);
      if (/usd/i.test(s)) currency = 'USD';
      else if (/eur/i.test(s)) currency = 'EUR';
      else currency = 'UZS';
    }
  });

  // Статус
  let status: LotStatus = 'open';
  $('.lot__info__info .row').each((_, row) => {
    const label = textOf($, $(row).find('p').get(0)).toLowerCase();
    if (label.includes('статус')) {
      const v = $(row).find('strong').first().text().trim().toLowerCase();
      if (v.includes('опубликован')) status = 'open';
      else if (v.includes('отмен')) status = 'cancelled';
      else status = 'unknown';
    }
  });

  // Краткое описание (если нужно — можно тянуть любой из текстов)
  const description = ''; // при желании возьмём из блока «Описание»

  // Категория — берём первую категорию из таблиц товаров
  let category = '';
  const firstCategoryCell = $('table.custom-table-dark--2 tbody tr td').eq(2);
  if (firstCategoryCell.length) {
    category = firstCategoryCell.text().trim();
  }

  return {
    id,
    source: 'etender',
    url,
    title,
    description,
    category,
    buyer,
    region,
    budget_amount,
    currency,
    bid_deadline_at,
    published_at,
    status,
  };
}
