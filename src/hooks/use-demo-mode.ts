"use client";

import { useEffect, useState } from "react";

/**
 * React hook to reactively detect whether the current user is in Demo Mode.
 * Reads both the `dr_is_demo` cookie and localStorage with hydration safety.
 */
export function useDemoMode(): boolean {
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return (
        document.cookie.includes("dr_is_demo=true") ||
        localStorage.getItem("dr_is_demo") === "true"
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkDemo = () => {
      try {
        const demoActive =
          document.cookie.includes("dr_is_demo=true") ||
          localStorage.getItem("dr_is_demo") === "true";
        setIsDemo(demoActive);
      } catch {
        setIsDemo(false);
      }
    };

    checkDemo();

    window.addEventListener("storage", checkDemo);
    return () => window.removeEventListener("storage", checkDemo);
  }, []);

  return isDemo;
}
