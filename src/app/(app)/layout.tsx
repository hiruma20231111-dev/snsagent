import type { ReactNode } from "react";
import { AppProvider } from "@/lib/store";
import TopNav from "@/components/TopNav";
import Toast from "@/components/Toast";
import AppHeader from "@/components/AppHeader";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <div className="mx-auto w-full max-w-[1100px]">
        {/* header + genre tabs, pinned to the top on every viewport */}
        <div className="sticky top-0 z-30">
          <AppHeader />
          <TopNav />
        </div>
        <main>{children}</main>
        <Toast />
      </div>
    </AppProvider>
  );
}
