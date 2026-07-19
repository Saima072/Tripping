// Outbound booking links are constructed server-side against a fixed domain
// allowlist — user input only ever lands in query-string values, never in the
// host or path, preventing open-redirect abuse.
const ALLOWED_HOSTS = new Set(["www.airbnb.com", "www.booking.com"]);

function assertAllowed(url: URL): string {
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error("Outbound link host not allowlisted");
  }
  return url.toString();
}

export function airbnbSearchLink(
  city: string,
  country: string,
  checkin?: string,
  checkout?: string
): string {
  const query = encodeURIComponent(`${city}, ${country}`);
  const url = new URL(`https://www.airbnb.com/s/${query}/homes`);
  if (checkin && checkout) {
    url.searchParams.set("checkin", checkin);
    url.searchParams.set("checkout", checkout);
  }
  return assertAllowed(url);
}

export function bookingSearchLink(
  city: string,
  country: string,
  checkin?: string,
  checkout?: string
): string {
  const url = new URL("https://www.booking.com/searchresults.html");
  url.searchParams.set("ss", `${city}, ${country}`);
  if (checkin && checkout) {
    url.searchParams.set("checkin", checkin);
    url.searchParams.set("checkout", checkout);
  }
  return assertAllowed(url);
}
