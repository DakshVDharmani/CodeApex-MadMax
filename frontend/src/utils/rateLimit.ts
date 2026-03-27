const MAX_REQUESTS = 3;
const WINDOW_MS = 5 * 60 * 1000;

export function checkRateLimit(): boolean {
  const now = Date.now();
  const history = JSON.parse(
    localStorage.getItem('misinfo_usage') || '[]'
  ) as number[];

  const recent = history.filter(t => now - t < WINDOW_MS);
  recent.push(now);

  localStorage.setItem('misinfo_usage', JSON.stringify(recent));

  return recent.length <= MAX_REQUESTS;
}
