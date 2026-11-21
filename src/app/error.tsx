"use client"; // Error boundaries must be Client Components

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

/** Zamiast białego ekranu – ZUSia i możliwość ponowienia. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 text-center">
      <Image src="/brand/zusia-lot.png" alt="" width={640} height={640} className="aspect-square size-40 object-contain" />
      <h1 className="mt-4 text-[24px] font-black text-brand">Ups, coś poszło nie tak</h1>
      <p className="mt-2 text-[16px] text-fg-2">ZUSia już wie o problemie. Twoje dane są bezpieczne – spróbuj ponownie albo wróć na start.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={() => retry()} className="h-11 rounded-xl bg-brand px-5 font-bold text-white hover:bg-brand-hover">
          Spróbuj ponownie
        </button>
        <Link href="/panel" className="grid h-11 place-items-center rounded-xl border border-line-strong px-5 font-bold hover:bg-surface-2">
          Wróć na start
        </Link>
      </div>
    </div>
  );
}
