"use client";

import { useEffect, useState } from "react";
import { getProfile, type FarmProfile } from "@/lib/profile";

const CHANGE_EVENT = "terminal:profile-changed";

/**
 * Hook reativo que retorna o FarmProfile atual.
 *
 * Atualiza quando:
 *  - Outra tab edita o localStorage (evento 'storage' nativo)
 *  - Mesma tab chama saveProfile() (evento custom 'terminal:profile-changed')
 *
 * SSR-safe: retorna DEFAULT_PROFILE no primeiro render, hidrata com valor
 * real depois (evita mismatch). Componentes que precisam de "loaded" exato
 * podem comparar com DEFAULT_PROFILE ou usar isHydrated.
 */
export function useProfile(): { profile: FarmProfile; isHydrated: boolean } {
  const [profile, setProfile] = useState<FarmProfile>(() => getProfile());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Pós-hidratação: re-lê do localStorage (caso o profile tenha sido
    // editado em outra tab antes deste mount, ou pra forçar updates iniciais).
    setProfile(getProfile());
    setIsHydrated(true);

    const refresh = () => setProfile(getProfile());

    // Mesma tab: saveProfile() dispara CustomEvent
    window.addEventListener(CHANGE_EVENT, refresh);
    // Outras tabs: storage event nativo
    window.addEventListener("storage", (e) => {
      if (e.key === "terminal_farm_profile") refresh();
    });

    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return { profile, isHydrated };
}
