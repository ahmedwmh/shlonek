/** Cache tags for public, cacheable data. Admin mutations call `updateTag` with these. */
export const tags = {
  settings: "settings",
  publicPosts: "public-posts",
  exercises: "exercises",
  exercise: (slug: string) => `exercise:${slug}`,
  consultationServices: "consultation-services",
  premiumPlans: "premium-plans",
  team: "team",
  policies: "policies",
} as const;
