import type { ReactNode } from "react";
import { AppProvider } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import Toast from "@/components/Toast";
import AppHeader from "@/components/AppHeader";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <div className="app-shell no-scrollbar">
        <AppHeader />
        <main>{children}</main>
        <BottomNav />
        <Toast />
      </div>
    </AppProvider>
  );
}
