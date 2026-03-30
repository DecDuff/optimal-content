"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PROFILE_PREFS_STORAGE_KEY, AUTH_DISPLAY_NAME_KEY } from "@/lib/storage-keys";
import { SKILL_TAGS } from "@/lib/skill-tags";

const BIO_MAX = 400;

type StoredPrefs = {
  displayName: string;
  bio: string;
  tags: string[];
};

const defaultPrefs: StoredPrefs = {
  displayName: "",
  bio: "",
  tags: [],
};

function loadPrefs(): StoredPrefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(PROFILE_PREFS_STORAGE_KEY);
    if (!raw) {
      const name = window.localStorage.getItem(AUTH_DISPLAY_NAME_KEY) ?? "";
      return { ...defaultPrefs, displayName: name };
    }
    const parsed = JSON.parse(raw) as Partial<StoredPrefs>;
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
      bio: typeof parsed.bio === "string" ? parsed.bio.slice(0, BIO_MAX) : "",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t) => typeof t === "string" && (SKILL_TAGS as readonly string[]).includes(t))
        : [],
    };
  } catch {
    return defaultPrefs;
  }
}

type ProfilePrefsContextValue = {
  displayName: string;
  bio: string;
  bioMax: number;
  tags: string[];
  setDisplayName: (v: string) => void;
  setBio: (v: string) => void;
  toggleTag: (tag: string) => void;
  setSessionFromAuth: (displayName: string) => void;
};

const ProfilePrefsContext = createContext<ProfilePrefsContextValue | null>(null);

export function ProfilePrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<StoredPrefs>(defaultPrefs);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PROFILE_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* quota */
    }
  }, [prefs, ready]);

  const setDisplayName = useCallback((v: string) => {
    setPrefs((p) => ({ ...p, displayName: v.trim().slice(0, 80) }));
  }, []);

  const setBio = useCallback((v: string) => {
    setPrefs((p) => ({ ...p, bio: v.slice(0, BIO_MAX) }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    if (!(SKILL_TAGS as readonly string[]).includes(tag)) return;
    setPrefs((p) => {
      const has = p.tags.includes(tag);
      return {
        ...p,
        tags: has ? p.tags.filter((t) => t !== tag) : [...p.tags, tag],
      };
    });
  }, []);

  const setSessionFromAuth = useCallback((displayName: string) => {
    const trimmed = displayName.trim().slice(0, 80);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(AUTH_DISPLAY_NAME_KEY, trimmed);
      } catch {
        /* ignore */
      }
    }
    setPrefs((p) => ({ ...p, displayName: trimmed || p.displayName }));
  }, []);

  const value = useMemo(
    () => ({
      displayName: prefs.displayName,
      bio: prefs.bio,
      bioMax: BIO_MAX,
      tags: prefs.tags,
      setDisplayName,
      setBio,
      toggleTag,
      setSessionFromAuth,
    }),
    [prefs, setDisplayName, setBio, toggleTag, setSessionFromAuth]
  );

  return (
    <ProfilePrefsContext.Provider value={value}>{children}</ProfilePrefsContext.Provider>
  );
}

export function useProfilePrefs() {
  const ctx = useContext(ProfilePrefsContext);
  if (!ctx) throw new Error("useProfilePrefs must be used within ProfilePrefsProvider");
  return ctx;
}
