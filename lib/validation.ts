const YT_HOSTS =
  /^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com|music\.youtube\.com)$/i;

/** Require YouTube / youtu.be (https). */
export function isValidYoutubeOrVideoUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return YT_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}

export function isValidHttpsUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
