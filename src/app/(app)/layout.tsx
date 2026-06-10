import type { ReactNode } from "react";
import { AppProvider } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import Toast from "@/components/Toast";
import AppHeader from "@/components/AppHeader";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <div className="desk-wrap">
        <SideNav />
        <div className="app-shell no-scrollbar">
          <div className="lg:hidden">
            <AppHeader />
          </div>
          <main>{children}</main>
          <BottomNav />
          <Toast />
        </div>
      </div>
    </AppProvider>
  );
}
