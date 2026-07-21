"use client";

import { useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

/**
 * On first mount, the access token only lives in memory and is lost on a full
 * page reload. This silently exchanges the httpOnly refresh cookie for a new
 * access token so the session survives a refresh without re-entering credentials.
 */
export function useSessionBootstrap() {
  const { accessToken, isHydrated, setSession, setHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated) return;

    if (accessToken) {
      setHydrated(true);
      return;
    }

    axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then(({ data }) => {
        setSession(data.data.accessToken, data.data.user);
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => setHydrated(true));
    // intentional: one-time mount effect — deps would cause infinite re-runs
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isHydrated };
}
