// One source of truth for the site's absolute origin. Launch day is one line:
// remove NEXT_PUBLIC_SITE_URL from the environment and the brand domain takes over.
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://satmarkets.sa";
