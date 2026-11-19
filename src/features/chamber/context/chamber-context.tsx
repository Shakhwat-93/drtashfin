"use client";

import * as React from "react";
import {
  Chamber,
  KNOWN_CHAMBERS,
  DEMO_CHAMBERS,
  DEFAULT_CHAMBER,
  DEFAULT_DEMO_CHAMBER,
} from "@/types/chamber";
import { getChamberRepository } from "@/lib/data";

interface ChamberContextValue {
  activeChamber: Chamber;
  chambers: Chamber[];
  isLoading: boolean;
  isSwitching: boolean;
  isDemo: boolean;
  switchChamber: (codeOrId: string) => Promise<void>;
}

const ChamberContext = React.createContext<ChamberContextValue | undefined>(undefined);

const COOKIE_NAME = "dr_selected_chamber";
const STORAGE_KEY = "drtashfin_active_chamber_code";
const DEMO_COOKIE = "dr_is_demo";
const DEMO_STORAGE_KEY = "dr_is_demo";

function getClientDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${DEMO_COOKIE}=([^;]*)`));
    if (cookieMatch && cookieMatch[1] === "true") return true;
    return localStorage.getItem(DEMO_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getStoredChamberCode(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Try cookie
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  // 2. Try localStorage
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistChamberCode(code: string) {
  if (typeof window === "undefined") return;

  // Persist in Cookie (1 year)
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=31536000; SameSite=Lax`;

  // Persist in localStorage
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Ignore storage quota errors
  }
}

export function ChamberProvider({ children }: { children: React.ReactNode }) {
  const isDemo = React.useMemo(() => getClientDemoMode(), []);
  const fallbackChambers = isDemo ? DEMO_CHAMBERS : KNOWN_CHAMBERS;
  const fallbackDefault = isDemo ? DEFAULT_DEMO_CHAMBER : DEFAULT_CHAMBER;

  const [chambers, setChambers] = React.useState<Chamber[]>(fallbackChambers);
  const [activeChamber, setActiveChamber] = React.useState<Chamber>(fallbackDefault);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSwitching, setIsSwitching] = React.useState(false);

  // Load active chambers from repository and reconcile stored preference
  React.useEffect(() => {
    let isMounted = true;

    async function loadChambers() {
      try {
        const repo = getChamberRepository();
        const loaded = await repo.getChambers(true);

        if (!isMounted) return;

        const available = loaded.length > 0 ? loaded : fallbackChambers;
        setChambers(available);

        // Check stored selection
        const storedCode = getStoredChamberCode();
        if (storedCode) {
          const matched = available.find(
            (c) =>
              c.code.toLowerCase() === storedCode.toLowerCase() ||
              c.id === storedCode
          );
          if (matched) {
            setActiveChamber(matched);
            setIsLoading(false);
            return;
          }
        }

        // Default to first chamber (Dhaka)
        setActiveChamber(available[0] || fallbackDefault);
        persistChamberCode(available[0]?.code || "dhaka");
      } catch {
        if (isMounted) {
          setChambers(fallbackChambers);
          setActiveChamber(fallbackDefault);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadChambers();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchChamber = React.useCallback(
    async (codeOrId: string) => {
      if (!codeOrId) return;

      const target = chambers.find(
        (c) =>
          c.code.toLowerCase() === codeOrId.toLowerCase() ||
          c.id === codeOrId
      );

      if (!target || target.id === activeChamber.id) {
        return;
      }

      setIsSwitching(true);

      try {
        // Immediate UI state update and persistence
        setActiveChamber(target);
        persistChamberCode(target.code);

        // Brief delay to allow dependent hooks and consumers to reset without stale flicker
        await new Promise((resolve) => setTimeout(resolve, 200));
      } finally {
        setIsSwitching(false);
      }
    },
    [chambers, activeChamber.id]
  );

  const value = React.useMemo(
    () => ({
      activeChamber,
      chambers,
      isLoading,
      isSwitching,
      isDemo,
      switchChamber,
    }),
    [activeChamber, chambers, isLoading, isSwitching, isDemo, switchChamber]
  );

  return (
    <ChamberContext.Provider value={value}>{children}</ChamberContext.Provider>
  );
}

export function useChamber(): ChamberContextValue {
  const context = React.useContext(ChamberContext);
  if (!context) {
    // Graceful fallback for non-wrapped tests
    return {
      activeChamber: DEFAULT_CHAMBER,
      chambers: KNOWN_CHAMBERS,
      isLoading: false,
      isSwitching: false,
      isDemo: false,
      switchChamber: async () => {},
    };
  }
  return context;
}
