/**
 * Every photograph on the site is listed here.
 *
 * Until real photography is supplied each entry is null, and the site draws a
 * stand in scene for it (see components/Scene.tsx). To use a real photograph,
 * drop the file in /public/photos and set the path, for example:
 *   heroInline: "/photos/hero-inline.jpg",
 */
export const photos = {
  /** Two people laughing inside a curtained photo booth, warm flash light. */
  heroInline: null,
  /** Chrome and enamel booth, straight on. */
  boothMarlene: null,
  /** Wood panelled booth, straight on. */
  boothSid: null,
  /** Small white booth, straight on. */
  boothDot: null,
  /** Village hall wedding. */
  venueHepworth: null,
  /** Warehouse party. */
  venueBarn: null,
  /** Museum late. */
  venueBelgrave: null,
  /** Garden marquee. */
  venueIlkley: null,
  /** Office Christmas do. */
  venueCornExchange: null,
  /** Birthday in a pub. */
  venueAdelphi: null,
} satisfies Record<string, string | null>;

/**
 * Real photo strips, one array of four frames per strip. Leave empty to use
 * the drawn frames. Strip 0 is the one that develops in the hero.
 */
export const strips: string[][] = [];

export type PhotoKey = keyof typeof photos;
