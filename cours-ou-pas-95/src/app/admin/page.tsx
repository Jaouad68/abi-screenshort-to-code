import type { Metadata } from "next";
import { todayParis } from "@/lib/dates";
import { isAdmin, isAdminEnabled } from "@/lib/server/security";
import { getStore } from "@/lib/server/store";
import { AdminView } from "./admin-view";

export const metadata: Metadata = { title: "Modération", robots: { index: false } };

export default async function Page() {
  return (
    <AdminView
      authed={await isAdmin()}
      enabled={isAdminEnabled()}
      mode={getStore().mode}
      today={todayParis()}
    />
  );
}
