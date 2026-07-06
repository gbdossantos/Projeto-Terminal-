"use client";

import { useEffect, useState } from "react";
import { getProfile, DEFAULT_PROFILE, type FarmProfile } from "@/lib/profile";

const CHANGE_EVENT = "terminal:profile-changed";

/**
 * Hook reativo que retorna o FarmProfile atual (Supabase, `perfil_fazenda`).
 *
 * Atualiza quando:
 *  - saveProfile() é chamado (evento custom 'terminal:profile-changed')
 *
 * SSR-safe: retorna DEFAULT_PROFILE no primeiro render, hidrata com valor
 * real depois de buscar no Supabase. Componentes que precisam de "loaded"
 * exato podem usar isHydrated.
 */
export function useProfile(): { profile: FarmProfile; isHydrated: boolean } {
  const [profile, setProfile] = useState<FarmProfile>(DEFAULT_PROFILE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      getProfile().then((p) => {
        if (!cancelled) {
          setProfile(p);
          setIsHydrated(true);
        }
      });
    };

    refresh();

    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, []);

  return { profile, isHydrated };
}
