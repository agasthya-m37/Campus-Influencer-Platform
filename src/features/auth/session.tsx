"use client";

import { createContext, useContext, type ReactNode } from "react";

import { api, type MeResponse } from "@/lib/api/client";
import { useQuery } from "@/lib/api/hooks";
import type { Role } from "@/lib/types";

interface SessionValue {
  me: MeResponse | undefined;
  isLoading: boolean;
  role: Role | null;
  refetch: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = useQuery((signal) => api.me.get({ signal }), []);

  return (
    <SessionContext.Provider
      value={{
        me: data,
        isLoading,
        role: data?.user.role ?? null,
        refetch,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
