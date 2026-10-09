import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export type Session = {
  authenticated: boolean;
  email: string | null;
  role: "user" | "admin" | null;
  name: string | null;
};

const SESSION_KEY = ["auth", "session"] as const;

async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail?.error ?? "Não foi possível concluir a operação.");
  }

  return response.json() as Promise<T>;
}

export function useSession() {
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: async (): Promise<Session> => {
      const response = await fetch("/api/auth/session", { credentials: "include" });
      if (!response.ok) throw new Error("Falha ao carregar a sessão.");
      return response.json();
    },
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) => post<{ success: true }>("/api/auth/login", { password }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSION_KEY }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  const logout = useCallback(
    async () => {
      try {
        await post<{ success: true }>("/api/auth/logout");
      } finally {
        queryClient.clear();
      }
    },
    [queryClient],
  );

  return { logout, isPending: false };
}