'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useCart } from '../(lib)/cart-store';

function formatIDR(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCart(s => s.items);
  const remove = useCart(s => s.remove);
  const clear = useCart(s => s.clear);
  const total = useCart(s => s.total);
  const itemCount = useCart(s => s.items.length);

    useEffect(() => {
        if (itemCount === 0) router.replace('/');
    }, [itemCount, router]);


    if (items.length === 0) {
    return (
        <main className="min-h-screen bg-neutral-50 grid place-items-center">
        <p className="text-sm text-neutral-600">Mengalihkan ke halaman utama…</p>
        </main>
    );
    }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-red-600 hover:underline">← Tambah Jadwal</Link>
          <button onClick={clear} className="text-sm text-neutral-500 hover:text-red-600">Kosongkan Keranjang</button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Kiri: daftar item */}
          <div className="col-span-12 lg:col-span-7">
            <div className="rounded-2xl bg-white shadow p-5">
              <h2 className="text-lg font-semibold mb-4 text-neutral-900">Pesanan Kamu</h2>
              <div className="divide-y text-neutral-800">
                {items.map(it => (
                  <div key={it.id} className="py-3 flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-neutral-620 flex items-center justify-center text-xs">
                      {it.courtName.split(' ')[1] || 'CT'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{it.courtName}</div>
                      <div className="text-sm text-neutral-600">{it.date} • {it.slotLabel}</div>
                      <div className="text-sm mt-1">{formatIDR(it.price)}</div>
                    </div>
                    <button onClick={() => remove(it.id)} className="text-sm text-red-600 hover:underline">Hapus</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kanan: ringkasan & pembayaran */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-white shadow p-5">
              <h3 className="font-semibold mb-3 text-neutral-900">Rincian Biaya</h3>
              <div className="space-y-2 text-sm text-neutral-800">
                <div className="flex items-center justify-between">
                  <span>Biaya Sewa</span><span>{formatIDR(total())}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Biaya Produk Tambahan</span><span>{formatIDR(0)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex items-center justify-between font-semibold">
                  <span>Total Bayar</span><span>{formatIDR(total())}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow p-5">
              <h3 className="font-semibold mb-3 text-neutral-900">Atur Pembayaran</h3>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="pay" defaultChecked className="accent-neutral-900"/>
                <span>Bayar Lunas</span>
              </label>
            </div>

            <button
              className="w-full rounded-xl bg-[#920E1C] text-white py-3 font-medium hover:opacity-95"
              onClick={async () => {
                const payload = {
                  items: items.map(it => {
                    const [a, b] = it.slotLabel.split("–").map(s => s.trim());
                    const [h1, m1] = a.split(":").map(Number);
                    const [h2, m2] = b.split(":").map(Number);
                    return {
                      courtId: Number(it.courtId),
                      date: it.date,
                      startMin: h1 * 60 + m1,
                      endMin: h2 * 60 + m2,
                      price: it.price,
                    };
                  }),
                };

                const res = await fetch("https://api.arkasala.my.id/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });

                const json = await res.json();
                if (!res.ok) {
                  alert("Gagal checkout: " + (json.error || res.status));
                  return;
                }

                // buka halaman pembayaran Midtrans
                window.location.href = json.redirect;
              }}

            >
              Lanjutkan ke Pembayaran
            </button>

            {/* <div className="rounded-2xl bg-white shadow p-5 text-sm text-neutral-600">
              Kebijakan Reschedule & Pembatalan — placeholder.
            </div> */}
          </div>
        </div>
      </div>
    </main>
  );
}
