"use client";

import { usePathname } from "next/navigation";
import { getPageTitle } from "../utils/getPageTitle";
import { usePedidoHeaderTitle } from "../features/orders/hooks/usePedidoHeaderTitle";


export const HeaderTitle = () => {

  const pathname = usePathname();
  const pedidoTitle = usePedidoHeaderTitle(pathname);
  const title = pedidoTitle ?? getPageTitle(pathname);

  return (
    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white tracking-tight">
      {title}
    </h2>
  )
}
