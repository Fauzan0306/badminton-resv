'use client';
import Link from 'next/link';
import { useCart } from "../(lib)/cart-store";
import { useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.arkasala.my.id';

type BookingItem = {
  id: number;
  booking_id: number;
  court_id: number;
  date: string;       // YYYY-MM-DD
  start_min: number;  // menit dari 00:00
  end_min: number;
  price: number;
};

type Booking = {
  id: number;
  code: string;
  total: number;
  status: 'pending' | 'paid' | 'failed' | string;
  created_at: string;
  items: BookingItem[];
};

function minutesToTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatIDR(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

type StatusKey = 'all' | 'pending' | 'paid' | 'failed' | 'settled' | 'done' // extra keys for future
const STATUS_CHIPS: { key: StatusKey; label: string }[] = [
  { key: 'all',     label: 'Semua Status' },
  { key: 'pending', label: 'Menunggu Pembayaran' },
  { key: 'paid',    label: 'Berhasil' },
  { key: 'failed',  label: 'Dibatalkan' },
  // tambahkan chip lain kalau nanti ada status lain
];

export default function BookingsPage() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const { count } = useCart();
  const [, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // UI states
  // const [activeTab, setActiveTab] = useState<'booking' | 'bareng'>('booking');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  // const [query, setQuery] = useState('');
  const [submittedQuery] = useState(''); // hanya cari saat enter

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`${API_BASE}/bookings?limit=100`, {
          cache: 'no-store',
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Booking[] = await res.json();
        setRows(data);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setErr(e instanceof Error ? e.message : 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []); // tetap pakai array kosong


  // filter + search
  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== 'all') {
      list = list.filter(b => (b.status || '').toLowerCase() === statusFilter);
    }
    if (submittedQuery.trim()) {
      const q = submittedQuery.trim().toLowerCase();
      list = list.filter(b => b.code.toLowerCase().includes(q));
    }
    return list;
  }, [rows, statusFilter, submittedQuery]);

  return (
    <>
    {/* NAVBAR */}
    <header className="sticky top-0 z-40 backdrop-blur bg-white/80 border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="font-semibold text-lg rounded-full shadow-md px-4 py-2 bg-[#920E1C] text-white hover:opacity-90"
          >
            BadmintonGo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 bg-neutral-51">
        {/* CARD WRAPPER */}
        <div className="rounded-3xl border bg-white/70 shadow-sm backdrop-blur-sm">
          {/* HEADER */}
          <div className="px-6 pt-6">
            <h1 className="text-[22px] font-semibold">Dafar Booking</h1>
            {/* Tabs */}
            {/* <div className="mt-4 flex gap-8 border-b dark:border-white/10">
              {[
                { key: 'booking', label: 'Booking' },
                { key: 'bareng',  label: 'Main Bareng' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as 'booking' | 'bareng')}
                  className={`-mb-px border-b-2 pb-3 text-sm transition
                  ${activeTab === t.key
                    ? 'border-red-600 text-red-700 dark:text-red-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  {t.label}
                </button>
              ))}
            </div> */}
          </div>

          {/* BODY */}
          <div className="px-6 pb-6 pt-4">
            {/* Search + Chips */}
            <div className="flex flex-col gap-3">
              {/* <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSubmittedQuery(query); }}
                placeholder="Cari booking disini [ENTER]"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
              /> */}

              <div className="flex flex-wrap gap-2">
                {STATUS_CHIPS.map(c => {
                  const active = statusFilter === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setStatusFilter(c.key)}
                      className={`rounded-xl px-4 py-2 text-sm border transition
                        ${active
                          ? 'bg-red-700 text-white border-red-700'
                          : 'bg-white hover:bg-neutral-50 dark:border-white/10 border'}`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CONTENT LIST / EMPTY */}
            <div className="mt-6">
              {loading && <div className="text-neutral-500">Memuat…</div>}
              {err && <div className="text-red-600">Error: {err}</div>}

              {!loading && !filtered.length && !err && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  {/* ilustrasi kosong sederhana */}
                  <svg width="88" height="88" viewBox="0 0 24 24" className="opacity-40">
                    <path fill="currentColor" d="M19 3H8a2 2 0 0 0-2 2v3H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3h1a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-3 14H5v-7h11m3-2H8V5h11Z"/>
                  </svg>
                  <div className="mt-3 font-medium">Belum ada booking</div>
                  <p className="mt-1 max-w-sm text-sm text-neutral-500">
                    Lapangan yang kamu booking bakal muncul disini, ya.
                  </p>
                </div>
              )}

              {/* LIST */}
              <div className="space-y-4">
                {filtered.map(b => {
                  const pill =
                    b.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : b.status === 'pending'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';

                  return (
                    <div key={b.id} className="rounded-2xl border">
                      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">#{b.code}</div>
                          <div className="mt-1 text-xs text-neutral-500">
                            Dibuat: {new Date(b.created_at).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${pill}`}>
                          {b.status === 'pending' ? 'Menunggu Pembayaran' :
                          b.status === 'paid'    ? 'Berhasil' :
                          'Dibatalkan'}
                        </span>
                      </div>

                      <div className="px-5 py-4 space-y-3">
                        {b.items.map(it => (
                          <div key={it.id} className="flex items-center justify-between px-4 py-3 text-sm">
                            <div className="min-w-0">
                              <div className="font-medium">Court {it.court_id}</div>
                              <div className="text-neutral-500">
                                {it.date} • {minutesToTime(it.start_min)} – {minutesToTime(it.end_min)}
                              </div>
                            </div>
                            <div className="shrink-0 font-semibold">{formatIDR(it.price)}</div>
                          </div>
                        ))}
                      </div>

                      <div className="px-5 py-4 border-t dark:border-white/10 flex items-center justify-between">
                        <span className="text-sm text-neutral-500">Total</span>
                        <span className="text-base font-semibold">{formatIDR(b.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
