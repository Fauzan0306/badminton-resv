// 'use client';
// import { useRouter } from 'next/navigation';
// import { useCart } from './(lib)/cart-store';
// import React, { useMemo, useState, useEffect } from "react";

// // ----- Mock Data Types -----
// type Timeslot = {
//   id: string;
//   label: string; // e.g. "07:00 – 08:00"
//   price: number; // per slot
// };

// type Court = {
//   id: string;
//   name: string;
//   sport: "Badminton" | "Padel";
//   indoor: boolean;
//   surface: string;
//   images: string[]; // URLs
//   timeslotsByDate: Record<string, Timeslot[]>; // key: YYYY-MM-DD
// };

// // ----- Helper Utils -----
// function formatIDR(n: number) {
//   return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
// }

// function fmtDateISO(d: Date) {
//   return d.toISOString().slice(0, 10);
// }

// function shortDayLabel(d: Date) {
//   return d.toLocaleDateString("id-ID", { weekday: "short" });
// }

// function shortDateLabel(d: Date) {
//   return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
// }

// // ----- Mock Seed (replace later with API) -----
// const seedCourts: Court[] = [
//   {
//     id: "lor",
//     name: "Court 1",
//     sport: "Badminton",
//     indoor: true,
//     surface: "Beton",
//     images: [
//       "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1600&auto=format&fit=crop",
//     ],
//     timeslotsByDate: {},
//   },
//   {
//     id: "kidul",
//     name: "Court 2",
//     sport: "Badminton",
//     indoor: true,
//     surface: "Karpet",
//     images: [
//       "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1600&auto=format&fit=crop",
//     ],
//     timeslotsByDate: {},
//   },
// ];

// function makeSlots(startHour = 7, endHour = 22, price = 90000): Timeslot[] {
//   const slots: Timeslot[] = [];
//   for (let h = startHour; h < endHour; h++) {
//     const label = `${String(h).padStart(2, "0")}:00 – ${String(h + 1).padStart(2, "0")}:00`;
//     slots.push({ id: `t-${h}`, label, price });
//   }
//   return slots;
// }

// function seedWithDates(daysAhead = 7) {
//   const today = new Date();
//   const slots = makeSlots();
//   return seedCourts.map((c) => {
//     const ts: Record<string, Timeslot[]> = {};
//     for (let i = 0; i < daysAhead; i++) {
//       const d = new Date(today);
//       d.setDate(today.getDate() + i);
//       const k = fmtDateISO(d);
//       // Randomly remove a couple of slots to simulate availability
//       const shuffled = [...slots].sort(() => Math.random() - 0.5);
//       ts[k] = shuffled.slice(0, Math.floor(8 + Math.random() * 6));
//     }
//     return { ...c, timeslotsByDate: ts };
//   });
// }

// // ----- Cart -----
// export type CartItem = {
//   id: string; // unique per court+date+slot
//   courtId: string;
//   courtName: string;
//   date: string; // YYYY-MM-DD
//   slotLabel: string;
//   price: number;
// };

// function startMinutes(label: string) {
//   const [hm] = label.split("–");            // "07:00 "
//   const [h, m] = hm.trim().split(":").map(Number);
//   return h * 60 + m;
// }

// // ----- Main Page Component -----
// export default function Page() {
//   const [data, setData] = useState<Court[]>([]);
//   const [selectedDate, setSelectedDate] = useState<string>(() => fmtDateISO(new Date()));
//   const router = useRouter();
//   const { items: cart, add, remove, total, count } = useCart();
//   const [cartOpen, setCartOpen] = useState(false);
//   const [hydrated, setHydrated] = useState(false);

//   useEffect(() => {
//     setHydrated(true);
//     setData(seedWithDates(10)); // generate mock hanya di client
//   }, []);

//   const dateRange = useMemo(() => {
//     const arr: Date[] = [];
//     const start = new Date();
//     for (let i = 0; i < 10; i++) {
//       const d = new Date(start);
//       d.setDate(start.getDate() + i);
//       arr.push(d);
//     }
//     return arr;
//   }, []);

//   function addToCart(court: Court, date: string, slot: Timeslot) {
//     add({
//       id: `${court.id}-${date}-${slot.id}`,
//       courtId: court.id,
//       courtName: court.name,
//       date,
//       slotLabel: slot.label,
//       price: slot.price,
//     });
//     setCartOpen(true);
//   }

//   function removeFromCart(id: string) {
//     remove(id);
//   }
//   return (
//     <main className="min-h-screen bg-neutral-50 text-neutral-900">
//       {/* Header */}
//       <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-neutral-200">
//         <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
//           <a href="#top" className="font-semibold text-lg text-white rounded-full shadow-xl px-4 py-2 bg-[#920E1C] text-white hover:opacity-90">BadmintonOne</a>
//           <nav className="hidden md:flex gap-6 text-sm">
//             <a href="#gallery" className="hover:opacity-70">Galeri</a>
//             <a href="#about" className="hover:opacity-70">Tentang</a>
//             <a href="#booking" className="hover:opacity-70">Pilih Lapangan</a>
//           </nav>
//           <button onClick={() => setCartOpen(true)} className="relative rounded-full px-4 py-2 hover:bg-neutral-100 text-sm text-red-600">
//             Keranjang ({count()})
//           </button>
//         </div>
//       </header>

//       {/* Hero / Gallery */}
//       <section id="gallery" className="mx-auto max-w-6xl px-4 pt-8">
//         {data.length > 0 && (
//           <div className="grid grid-cols-12 gap-4">
//             {/* Foto kiri */}
//             <div className="col-span-12 md:col-span-7">
//               <div className="h-full overflow-hidden rounded-2xl shadow">
//                 <img
//                   src={data[0].images[0]}
//                   alt="Lapangan"
//                   className="h-full w-full object-cover rounded-2xl"
//                 />
//               </div>
//             </div>

//             {/* Foto kanan */}
//             <div className="col-span-12 md:col-span-5 grid grid-rows-2 gap-4 h-full">
//               <div className="overflow-hidden rounded-2xl shadow">
//                 {data[1] && (
//                   <img
//                     src={data[1].images[0]}
//                     alt="Lapangan 2"
//                     className="h-full w-full object-cover rounded-2xl"
//                   />
//                 )}
//               </div>
//               <div className="overflow-hidden rounded-2xl shadow">
//                 <img
//                   src="https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1600&auto=format&fit=crop"
//                   alt="Fasilitas"
//                   className="h-full w-full object-cover rounded-2xl"
//                 />
//               </div>
//             </div>
//           </div>
//         )}
//       </section>


//       {/* About / Description */}
//       <section id="about" className="mx-auto max-w-6xl px-4 py-12">
//         <div className="max-w-3xl">
//           <h2 className="text-2xl font-semibold mb-3">Tentang Venue</h2>
//           <p className="text-neutral-700 leading-relaxed">
//             Nikmati pengalaman bermain terbaik di venue kami. Tersedia beberapa lapangan indoor dengan pencahayaan optimal
//             dan permukaan <em>premium turf</em>. Pesan slot per jam, fleksibel, dan tanpa ribet. Kamu bisa memilih tanggal,
//             melihat ketersediaan jam, serta menambahkan beberapa slot ke keranjang sekaligus untuk checkout.
//           </p>
//         </div>
//       </section>

//       {/* Booking */}
//       <section id="booking" className="mx-auto max-w-6xl px-4 pb-24">
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="text-2xl font-semibold">Pilih Lapangan</h2>
//           <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100 text-red-600" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Lihat Foto</button>
//         </div>

//         {/* Date scroller */}
//         <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
//           {dateRange.map((d) => {
//             const iso = fmtDateISO(d);
//             const active = iso === selectedDate;
//             return (
//               <button
//                 key={iso}
//                 onClick={() => setSelectedDate(iso)}
//                 className={`shrink-0 rounded-xl px-4 py-2 text-sm ${active ? 'bg-[#920E1C] text-white' : 'bg-white hover:bg-neutral-100'}`}
//                 aria-pressed={active}
//               >
//                 <div className="font-medium">{shortDayLabel(d)}</div>
//                 <div className="text-neutral-620">{shortDateLabel(d)}</div>
//               </button>
//             );
//           })}
//         </div>

//         {/* Court list */}
//         <div className="space-y-10">
//           {(data.length ? data : []).map((court) => (
//             <article key={court.id} className="grid grid-cols-12 gap-6">
//               <div className="col-span-12 md:col-span-5">
//                 <div className="aspect-[16/9] overflow-hidden rounded-2xl shadow">
//                   <img src={court.images[0]} alt={court.name} className="h-full w-full object-cover" />
//                 </div>
//               </div>
//               <div className="col-span-12 md:col-span-7">
//                 <div className="flex items-start justify-between">
//                   <div>
//                     <h3 className="text-xl font-semibold text-red-600">{court.name}</h3>
//                     <p className="text-sm text-neutral-600">{court.sport} • {court.indoor ? 'Indoor' : 'Outdoor'} • {court.surface}</p>
//                   </div>
//                 </div>

//                 <div className="mt-5">
//                   <div className="flex items-center justify-between mb-3">
//                     <h4 className="text-base font-semibold text-neutral-800 ">
//                       Jadwal Tersedia <span className="font-normal text-neutral-500"></span>
//                     </h4>
//                     <span className="text-xs text-neutral-500">
//                       Klik jam untuk menambah ke keranjang
//                     </span>
//                   </div>

//                   <div className="flex flex-wrap gap-2">
//                     {(court.timeslotsByDate[selectedDate] ?? [])
//                       .slice()
//                       .sort((a, b) => startMinutes(a.label) - startMinutes(b.label))
//                       .map((slot) => (
//                         <button
//                           key={slot.id}
//                           onClick={() => addToCart(court, selectedDate, slot)}
//                           className="group relative rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700
//                                     hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm transition-all duration-200"
//                         >
//                           <span className="block text-[13px] font-medium group-hover:text-neutral-900">
//                             {slot.label}
//                           </span>
//                           <span className="block text-[12px] text-neutral-500 group-hover:text-neutral-700">
//                             {formatIDR(slot.price)}
//                           </span>

//                           {/* efek highlight halus */}
//                           <span className="absolute inset-0 rounded-xl ring-0 ring-neutral-300 opacity-0 group-hover:opacity-100 transition duration-200"></span>
//                         </button>
//                       ))}

//                     {!(court.timeslotsByDate[selectedDate] ?? []).length && (
//                       <div className="text-sm text-neutral-500">
//                         Tidak ada jadwal di tanggal ini.
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </article>
//           ))}
//         </div>
//       </section>

//       {/* Floating Cart Button (mobile emphasis) */}
//       <button
//         onClick={() => setCartOpen(true)}
//         className="fixed bottom-5 right-5 z-50 rounded-full shadow-xl px-5 py-3 bg-[#920E1C] text-white hover:opacity-90"
//       >
//         Keranjang • {count()}
//       </button>

//       {/* Cart Drawer */}
//       {cartOpen && (
//         <div className="fixed inset-0 z-50">
//           <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
//           <aside className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-xl p-5 flex flex-col">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-lg font-semibold ">Keranjang</h3>
//               <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setCartOpen(false)}>Tutup</button>
//             </div>
//             <div className="flex-1 overflow-y-auto divide-y">
//               {cart.length === 0 && <p className="text-sm text-neutral-500">Belum ada item. Pilih tanggal & jam dahulu.</p>}
//               {cart.map((item) => (
//                 <div key={item.id} className="py-3 flex items-start gap-3">
//                   <div className="h-12 w-12 rounded-lg bg-neutral-100 flex items-center justify-center text-xs">{item.courtName.split(" ")[1] || "CT"}</div>
//                   <div className="flex-1">
//                     <div className="font-medium">{item.courtName}</div>
//                     <div className="text-sm text-neutral-600">{item.date} • {item.slotLabel}</div>
//                     <div className="text-sm mt-1">{formatIDR(item.price)}</div>
//                   </div>
//                   <button onClick={() => removeFromCart(item.id)} className="text-sm text-red-600 hover:underline">Hapus</button>
//                 </div>
//               ))}
//             </div>
//             <div className="border-t pt-3 mt-3">
//               <div className="flex items-center justify-between font-medium">
//                 <span>Total</span>
//                 <span>{formatIDR(total())}</span>
//               </div>
//               <button
//                 className="mt-3 w-full rounded-xl bg-[#920E1C] text-white py-3 hover:opacity-90"
//                 onClick={() => { setCartOpen(false); router.push('/checkout'); }}
//               >
//                 Lanjut ke Checkout
//               </button>
//               <p className="text-[12px] text-neutral-500 mt-2">*Demo frontend. Nanti akan dihubungkan ke backend Go & payment gateway.</p>
//             </div>
//           </aside>
//         </div>
//       )}

//       {/* Footer */}
//       <footer className="border-t border-neutral-200 py-8 mt-10">
//         <div className="mx-auto max-w-6xl px-4 text-sm text-neutral-600 flex items-center justify-between">
//           <span className='text-red-600'>© {new Date().getFullYear()} BadmintonOne</span>
//           <a href="#top" className="hover:underline">Kembali ke atas</a>
//         </div>
//       </footer>
//     </main>
//   );
// }
// useRouter, , useEffect, useMemo, useStateimport { useCart } from '@/app/(lib)/cart-store';
// import React from 'react';
