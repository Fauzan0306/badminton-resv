'use client';
import { useRouter } from 'next/navigation';
import { useCart } from './(lib)/cart-store';
import Image from 'next/image';
import Link from "next/link";
import React, { useMemo, useState, useEffect } from "react";

const API_BASE = "https://api.arkasala.my.id/"; // ganti ke IP server jika perlu

type ApiCourt = {
  id: number;
  name: string;
  sport: string;
  indoor: boolean;
  surface: string;
  images: { url: string }[];
};

type ApiSlot = {
  id: number;
  courtId: number;
  date: string;      // "YYYY-MM-DD"
  startMin: number;  // menit dari 00:00
  endMin: number;
  price: number;
  available: boolean;
};


// ----- Mock Data Types -----
type Timeslot = {
  id: string;
  label: string; // e.g. "07:00 – 08:00"
  price: number; // per slot
};

type Court = {
  id: number;
  name: string;
  sport: "Badminton" | "Padel";
  indoor: boolean;
  surface: string;
  images: string[]; // URLs
  timeslotsByDate: Record<string, Timeslot[]>; // key: YYYY-MM-DD
};

type Sport = "Badminton" | "Padel";

// ----- Helper Utils -----
function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function fmtDateISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortDayLabel(d: Date) {
  return d.toLocaleDateString("id-ID", { weekday: "short" });
}

function shortDateLabel(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function minutesToLabel(m: number) {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function slotLabel(a: number, b: number) {
  return `${minutesToLabel(a)} – ${minutesToLabel(b)}`;
}


// ----- Cart -----
export type CartItem = {
  id: string; // unique per court+date+slot
  courtId: number;
  courtName: string;
  date: string; // YYYY-MM-DD
  slotLabel: string;
  price: number;
};

function startMinutes(label: string) {
  const [hm] = label.split("–");            // "07:00 "
  const [h, m] = hm.trim().split(":").map(Number);
  return h * 60 + m;
}


// ----- Main Page Component -----
export default function Page() {
  const [data, setData] = useState<Court[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => fmtDateISO(new Date()));
  const [, setLoadingCourts] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState<{ [date: string]: boolean }>({});
  const router = useRouter();
  const { items: cart, add, remove, total, count } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isSport = (x: unknown): x is Sport =>
  x === "Badminton" || x === "Padel";

    useEffect(() => setMounted(true), []);

    useEffect(() => {
      const ac = new AbortController();

      (async () => {
        try {
          setLoadingCourts(true);
          const res = await fetch(`${API_BASE}/courts`, {
            cache: "no-store",
            signal: ac.signal, // biar bisa di-cancel pas komponen di-unmount
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const rows: ApiCourt[] = await res.json();
          const mapped: Court[] = rows.map(r => ({
            id: r.id,
            name: r.name,
            sport: isSport(r.sport) ? r.sport : "Badminton",
            indoor: !!r.indoor,
            surface: r.surface || "",
            images: r.images?.map(i => i.url) ?? [],
            timeslotsByDate: {},
          }));
          setData(mapped);
        } catch (e: unknown) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          console.error('fetch courts failed:', e);
        } finally {
          setLoadingCourts(false);
        }
      })();
      return () => ac.abort();
    }, []);

  useEffect(() => {
    if (!data.length) return;
    const date = selectedDate;

    setLoadingSlots(prev => ({ ...prev, [date]: true }));

    (async () => {
      const next = [...data];
      await Promise.all(next.map(async (c, idx) => {
        const res = await fetch(`${API_BASE}/courts/${c.id}/slots?date=${date}`, { cache: "no-store" });
        const slots: ApiSlot[] = await res.json();
        const ui: Timeslot[] = slots
          .filter(s => s.available)
          .sort((a, b) => a.startMin - b.startMin)
          .map(s => ({
            id: String(s.id),
            label: slotLabel(s.startMin, s.endMin),
            price: s.price,
          }));
        next[idx] = { ...c, timeslotsByDate: { ...c.timeslotsByDate, [date]: ui } };
      }));
      setData(next);
      setLoadingSlots(prev => ({ ...prev, [date]: false }));
    })();
  }, [selectedDate, data.length]);

  const dateRange = useMemo(() => {
    const arr: Date[] = [];
    const start = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  function addToCart(court: Court, date: string, slot: Timeslot) {
    add({
      id: `${court.id}-${date}-${slot.id}`,
      courtId: String(court.id),
      courtName: court.name,
      date,
      slotLabel: slot.label,
      price: slot.price,
    });
    setCartOpen(true);
  }

  function removeFromCart(id: string) {
    remove(id);
  }
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="font-semibold text-lg text-white rounded-full shadow-xl px-4 py-2 bg-[#920E1C] hover:opacity-90"
          >
            BadmintonGo
          </Link>

          <nav className="hidden md:flex gap-6 text-sm">
            <Link href="#gallery" className="hover:opacity-70">Galeri</Link>
            <Link href="#about" className="hover:opacity-70">Tentang</Link>
            <Link href="#booking" className="hover:opacity-70">Pilih Lapangan</Link>
            <Link href="/bookings" className="hover:opacity-70">Jadwal Saya</Link>
          </nav>
          <button onClick={() => setCartOpen(true)} className="relative rounded-full px-4 py-2 hover:bg-neutral-100 text-sm text-red-600">
            Keranjang ({mounted ? count() : 0})
          </button>
        </div>
      </header>

      {/* Hero / Gallery */}
      <section id="gallery" className="mx-auto max-w-6xl px-4 pt-8">
        {data.length > 0 && (
          <div className="grid grid-cols-12 gap-4">
            {/* Foto kiri */}
            <div className="col-span-12 md:col-span-7">
              <div className="h-full overflow-hidden rounded-2xl shadow">
                <Image
                  src="https://plus.unsplash.com/premium_photo-1663036882455-adbf89485e51?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fGJhZG1pbnRvbnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=600"
                  alt="Lapangan"
                  className="h-full w-full object-cover rounded-2xl"
                />
              </div>
            </div>

            {/* Foto kanan */}
            <div className="col-span-12 md:col-span-5 grid grid-rows-2 gap-4 h-full">
              <div className="overflow-hidden rounded-2xl shadow">
                {data[1] && (
                  <Image
                    src={data[1].images[0]}
                    alt="Lapangan 2"
                    className="h-full w-full object-cover rounded-2xl"
                  />
                )}
              </div>
              <div className="overflow-hidden rounded-2xl shadow">
                <Image
                  src={data[0].images[0]}
                  alt="Fasilitas"
                  className="h-full w-full object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>
        )}
      </section>


      {/* About / Description */}
      <section id="about" className="mx-auto max-w-6xl px-4 py-12">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold mb-3">Tentang Venue</h2>
          <p className="text-neutral-700 leading-relaxed">
            Nikmati pengalaman bermain terbaik di venue kami. Tersedia beberapa lapangan indoor dengan pencahayaan optimal
            dan permukaan <em>premium turf</em>. Pesan slot per jam, fleksibel, dan tanpa ribet. Kamu bisa memilih tanggal,
            melihat ketersediaan jam, serta menambahkan beberapa slot ke keranjang sekaligus untuk checkout.
          </p>
        </div>
      </section>

      {/* Booking */}
      <section id="booking" className="mx-auto max-w-6xl px-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Pilih Lapangan</h2>
          <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100 text-red-600" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Lihat Foto</button>
        </div>

        {/* Date scroller */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {dateRange.map((d) => {
            const iso = fmtDateISO(d);
            const active = iso === selectedDate;
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm ${active ? 'bg-[#920E1C] text-white' : 'bg-white hover:bg-neutral-100'}`}
                aria-pressed={active}
              >
                <div className="font-medium">{shortDayLabel(d)}</div>
                <div className="text-neutral-620">{shortDateLabel(d)}</div>
              </button>
            );
          })}
        </div>

        {/* Court list */}
        <div className="space-y-10">
          {(data.length ? data : []).map((court) => (
            <article key={court.id} className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-5">
                <div className="aspect-[16/9] overflow-hidden rounded-2xl shadow">
                  <Image
                  src={court.images[0]} 
                  alt={court.name} 
                  className="h-full w-full object-cover" 
                  />
                </div>
              </div>
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-red-600">{court.name}</h3>
                    <p className="text-sm text-neutral-600">{court.sport} • {court.indoor ? 'Indoor' : 'Outdoor'} • {court.surface}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-neutral-800 ">
                      Jadwal Tersedia 
                       {loadingSlots[selectedDate] && <span className="ml-2 text-xs text-neutral-500"></span>}
                    </h4>
                    <span className="text-xs text-neutral-500">
                      Klik jam untuk menambah ke keranjang
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(court.timeslotsByDate[selectedDate] ?? [])
                      .slice()
                      .sort((a, b) => startMinutes(a.label) - startMinutes(b.label))
                      .map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => addToCart(court, selectedDate, slot)}
                          className="group relative rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700
                                    hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm transition-all duration-200"
                        >
                          <span className="block text-[13px] font-medium group-hover:text-neutral-900">
                            {slot.label}
                          </span>
                          <span className="block text-[12px] text-neutral-500 group-hover:text-neutral-700">
                            {formatIDR(slot.price)}
                          </span>

                          {/* efek highlight halus */}
                          <span className="absolute inset-0 rounded-xl ring-0 ring-neutral-300 opacity-0 group-hover:opacity-100 transition duration-200"></span>
                        </button>
                      ))}

                    {!(court.timeslotsByDate[selectedDate] ?? []).length && (
                      <div className="text-sm text-neutral-500">
                        Tidak ada jadwal di tanggal ini.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Floating Cart Button (mobile emphasis) */}
      <button
        onClick={() => setCartOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full shadow-xl px-5 py-3 bg-[#920E1C] text-white hover:opacity-90"
      >
        Keranjang • {mounted ? count() : 0}
      </button>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold ">Keranjang</h3>
              <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setCartOpen(false)}>Tutup</button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {cart.length === 0 && <p className="text-sm text-neutral-500">Belum ada item. Pilih tanggal & jam dahulu.</p>}
              {cart.map((item) => (
                <div key={item.id} className="py-3 flex items-start gap-3">
                  <div className="h-12 w-12 rounded-lg bg-neutral-100 flex items-center justify-center text-xs">{item.courtName.split(" ")[1] || "CT"}</div>
                  <div className="flex-1">
                    <div className="font-medium">{item.courtName}</div>
                    <div className="text-sm text-neutral-600">{item.date} • {item.slotLabel}</div>
                    <div className="text-sm mt-1">{formatIDR(item.price)}</div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-sm text-red-600 hover:underline">Hapus</button>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between font-medium">
                <span>Total</span>
                <span>{formatIDR(total())}</span>
              </div>
              <button
                className="mt-3 w-full rounded-xl bg-[#920E1C] text-white py-3 hover:opacity-90"
                onClick={() => { setCartOpen(false); router.push('/checkout'); }}
              >
                Lanjut ke Checkout
              </button>
              <p className="text-[12px] text-neutral-500 mt-2">*Demo frontend. Nanti akan dihubungkan ke backend Go & payment gateway.</p>
            </div>
          </aside>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8 mt-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-neutral-600 flex items-center justify-between">
          <span className='text-red-600'>© {new Date().getFullYear()} BadmintonOne</span>
          <Link href="#top" className="hover:underline">Kembali ke atas</Link>
        </div>
      </footer>
    </main>
  );
}
