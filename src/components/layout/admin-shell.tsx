"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Drawer, DrawerHeader, DrawerTitle, DrawerBody } from "@/components/ui/drawer";

export interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-[#FAF5EE] text-[#201C1A]">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-40">
        <Sidebar />
      </div>

      {/* Mobile & Tablet Navigation Drawer */}
      <Drawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        side="left"
        className="p-0 max-w-[280px]"
      >
        <DrawerHeader className="p-4">
          <DrawerTitle>Navigation</DrawerTitle>
        </DrawerHeader>
        <DrawerBody className="p-0">
          <Sidebar
            className="w-full border-r-0"
            onItemClick={() => setIsMobileNavOpen(false)}
          />
        </DrawerBody>
      </Drawer>

      {/* Main Area: Top Header + Dynamic Content */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0 max-w-full">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <main className="flex-1 pb-12 min-w-0 max-w-full">{children}</main>
      </div>
    </div>
  );
}
