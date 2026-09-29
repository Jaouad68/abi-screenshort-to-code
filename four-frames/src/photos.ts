/**
 * Every photograph on the site is listed here.
 *
 * Until real photography is supplied each entry is null, and the site draws a
 * stand in scene for it (see components/Scene.tsx). To use a real photograph,
 * drop the file in /public/photos and set the path, for example:
 *   heroInline: "photos/hero-inline.jpg",
 * or, to choose which part of the picture a crop keeps:
 *   heroInline: { src: "photos/hero-inline.jpg", position: "30% 50%" },
 */
type Source = string | { src: string; position: string } | null;

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
  venueHepworth: "photos/rabat-alley-1.webp",
  /** Warehouse party. */
  venueBarn: { src: "photos/rabat-walls.webp", position: "62% 50%" },
  /** Museum late. */
  venueBelgrave: { src: "photos/rabat-hotel.webp", position: "55% 50%" },
  /** Garden marquee. */
  venueIlkley: "photos/rabat-kasbah.webp",
  /** Office Christmas do. */
  venueCornExchange: { src: "photos/rabat-kasbah.webp", position: "40% 100%" },
  /** Birthday in a pub. */
  venueAdelphi: "photos/rabat-alley-2.webp",
} satisfies Record<string, Source>;

/**
 * Real photo strips, one array of four frames per strip. Leave empty to use
 * the drawn frames. Strip 0 is the one that develops in the hero.
 */
export const strips: string[][] = [];

export type PhotoKey = keyof typeof photos;
