// Kraje (bez zależności serwerowych) – faktury, Stripe Connect
export const COUNTRIES: [string, string][] = [
  ["GB", "United Kingdom"], ["IE", "Ireland"], ["US", "United States"], ["CA", "Canada"], ["AU", "Australia"], ["NZ", "New Zealand"],
  ["DE", "Germany"], ["AT", "Austria"], ["CH", "Switzerland"], ["NL", "Netherlands"], ["BE", "Belgium"], ["LU", "Luxembourg"],
  ["FR", "France"], ["ES", "Spain"], ["PT", "Portugal"], ["IT", "Italy"], ["DK", "Denmark"], ["SE", "Sweden"], ["NO", "Norway"],
  ["FI", "Finland"], ["PL", "Poland"], ["CZ", "Czechia"], ["SK", "Slovakia"], ["LT", "Lithuania"], ["LV", "Latvia"], ["EE", "Estonia"],
  ["HU", "Hungary"], ["RO", "Romania"], ["BG", "Bulgaria"], ["HR", "Croatia"], ["SI", "Slovenia"], ["GR", "Greece"], ["CY", "Cyprus"], ["MT", "Malta"],
];
export const isCountry = (c: unknown): c is string => typeof c === "string" && COUNTRIES.some(([k]) => k === c);
