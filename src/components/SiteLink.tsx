"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useLang } from "@/components/LangProvider";
import { localHref } from "@/lib/en-paths";

// next/link, który w wersji angielskiej prowadzi pod adresy /en/… (dla odwiedzających i dla Google)
export default function SiteLink({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const lang = useLang();
  return <NextLink href={typeof href === "string" ? localHref(href, lang) : href} {...rest} />;
}
