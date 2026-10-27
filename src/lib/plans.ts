// Pakiety galerii – jedno miejsce, z którego korzysta cennik (a później płatności i limity)
export type Plan = {
  id: "mala" | "srednia" | "duza";
  name: string;
  price: number; // zł za galerię
  limitGb: number;
  photos: string;
  months: number;
  forWhom: string;
  featured?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "mala",
    name: "Mała",
    price: 12,
    limitGb: 1.5,
    photos: "ok. 200 zdjęć",
    months: 12,
    forWhom: "Sesje portretowe, rodzinne i biznesowe",
  },
  {
    id: "srednia",
    name: "Średnia",
    price: 18,
    limitGb: 5,
    photos: "ok. 650 zdjęć",
    months: 12,
    forWhom: "Chrzciny, komunie, urodziny, mniejsze wydarzenia",
    featured: true,
  },
  {
    id: "duza",
    name: "Duża",
    price: 25,
    limitGb: 15,
    photos: "ok. 2000 zdjęć",
    months: 12,
    forWhom: "Reportaże ślubne i duże wydarzenia",
  },
];

// Przedłużenie publikacji o kolejne 12 miesięcy: połowa ceny pakietu
export const RENEWAL_SHARE = 0.5;
