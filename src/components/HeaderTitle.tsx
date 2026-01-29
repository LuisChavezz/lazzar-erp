"use client";

import { usePathname } from "next/navigation";
import { getPageTitle } from "../lib/getPageTitle";


export const HeaderTitle = () => {

  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white tracking-tight">
      {title}
    </h2>
  )
}
