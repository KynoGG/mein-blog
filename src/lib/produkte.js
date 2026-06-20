// Gemeinsame Produktdatenbank (Nährwerte pro Einheit)
export const PRODUKTE = [
  { id:'p01', emoji:'🍎', name:'Apfel',              kat:'Obst & Gemüse',           kcal:52,  pro:0.3, kh:14,  fett:0.2, einheit:'Stück',   g:150 },
  { id:'p02', emoji:'🍌', name:'Banane',              kat:'Obst & Gemüse',           kcal:89,  pro:1.1, kh:23,  fett:0.3, einheit:'Stück',   g:120 },
  { id:'p03', emoji:'🍓', name:'Erdbeeren',           kat:'Obst & Gemüse',           kcal:32,  pro:0.7, kh:7.7, fett:0.3, einheit:'g',       g:100 },
  { id:'p04', emoji:'🫐', name:'Blaubeeren',          kat:'Obst & Gemüse',           kcal:57,  pro:0.7, kh:14,  fett:0.3, einheit:'g',       g:100 },
  { id:'p05', emoji:'🥦', name:'Brokkoli',            kat:'Obst & Gemüse',           kcal:34,  pro:2.8, kh:7,   fett:0.4, einheit:'Stück',   g:300 },
  { id:'p06', emoji:'🥕', name:'Karotten',            kat:'Obst & Gemüse',           kcal:41,  pro:0.9, kh:10,  fett:0.2, einheit:'Stück',   g:80  },
  { id:'p07', emoji:'🥒', name:'Gurke',               kat:'Obst & Gemüse',           kcal:15,  pro:0.6, kh:3.6, fett:0.1, einheit:'Stück',   g:300 },
  { id:'p08', emoji:'🍅', name:'Tomate',              kat:'Obst & Gemüse',           kcal:18,  pro:0.9, kh:3.9, fett:0.2, einheit:'Stück',   g:120 },
  { id:'p09', emoji:'🧅', name:'Zwiebel',             kat:'Obst & Gemüse',           kcal:40,  pro:1.1, kh:9.3, fett:0.1, einheit:'Stück',   g:100 },
  { id:'p10', emoji:'🥑', name:'Avocado',             kat:'Obst & Gemüse',           kcal:160, pro:2,   kh:9,   fett:15,  einheit:'Stück',   g:150 },
  { id:'p11', emoji:'🍋', name:'Zitrone',             kat:'Obst & Gemüse',           kcal:29,  pro:1.1, kh:9,   fett:0.3, einheit:'Stück',   g:80  },
  { id:'p12', emoji:'🥬', name:'Spinat',              kat:'Obst & Gemüse',           kcal:23,  pro:2.9, kh:3.6, fett:0.4, einheit:'g',       g:100 },
  { id:'p13', emoji:'🫑', name:'Paprika (rot)',       kat:'Obst & Gemüse',           kcal:31,  pro:1,   kh:6,   fett:0.3, einheit:'Stück',   g:150 },
  { id:'p14', emoji:'🧄', name:'Knoblauch',           kat:'Obst & Gemüse',           kcal:149, pro:6.4, kh:33,  fett:0.5, einheit:'Zehe',    g:5   },
  { id:'p15', emoji:'🥝', name:'Kiwi',                kat:'Obst & Gemüse',           kcal:61,  pro:1.1, kh:15,  fett:0.5, einheit:'Stück',   g:80  },
  { id:'p20', emoji:'🍗', name:'Hähnchenbrustfilet', kat:'Fleisch & Fisch',          kcal:110, pro:23,  kh:0,   fett:1.8, einheit:'g',       g:100 },
  { id:'p21', emoji:'🥩', name:'Rinderhackfleisch',  kat:'Fleisch & Fisch',          kcal:221, pro:19,  kh:0,   fett:16,  einheit:'g',       g:100 },
  { id:'p22', emoji:'🐟', name:'Lachs',               kat:'Fleisch & Fisch',          kcal:208, pro:20,  kh:0,   fett:13,  einheit:'g',       g:100 },
  { id:'p23', emoji:'🐠', name:'Thunfisch (Dose)',   kat:'Fleisch & Fisch',          kcal:116, pro:26,  kh:0,   fett:1,   einheit:'Dose',    g:150 },
  { id:'p24', emoji:'🥩', name:'Schweinefilet',      kat:'Fleisch & Fisch',          kcal:143, pro:22,  kh:0,   fett:5,   einheit:'g',       g:100 },
  { id:'p25', emoji:'🍗', name:'Putengeschnetzeltes',kat:'Fleisch & Fisch',          kcal:104, pro:22,  kh:0,   fett:1.4, einheit:'g',       g:100 },
  { id:'p26', emoji:'🦐', name:'Garnelen',            kat:'Fleisch & Fisch',          kcal:99,  pro:21,  kh:0.9, fett:0.9, einheit:'g',       g:100 },
  { id:'p30', emoji:'🥚', name:'Eier',                kat:'Milchprodukte & Eier',    kcal:155, pro:13,  kh:1.1, fett:11,  einheit:'Stück',   g:60  },
  { id:'p31', emoji:'🥛', name:'Vollmilch',           kat:'Milchprodukte & Eier',    kcal:64,  pro:3.3, kh:4.7, fett:3.7, einheit:'ml',      g:100 },
  { id:'p32', emoji:'🧀', name:'Mozzarella',          kat:'Milchprodukte & Eier',    kcal:253, pro:18,  kh:2.2, fett:19,  einheit:'Packung', g:125 },
  { id:'p33', emoji:'🧀', name:'Parmesan',            kat:'Milchprodukte & Eier',    kcal:392, pro:36,  kh:3.2, fett:26,  einheit:'g',       g:100 },
  { id:'p34', emoji:'🫙', name:'Griechischer Joghurt',kat:'Milchprodukte & Eier',   kcal:97,  pro:9,   kh:4,   fett:5,   einheit:'g',       g:100 },
  { id:'p35', emoji:'🧈', name:'Butter',              kat:'Milchprodukte & Eier',    kcal:717, pro:0.9, kh:0.6, fett:81,  einheit:'g',       g:100 },
  { id:'p36', emoji:'🥛', name:'Quark (Magerquark)', kat:'Milchprodukte & Eier',    kcal:67,  pro:12,  kh:4,   fett:0.2, einheit:'g',       g:100 },
  { id:'p40', emoji:'🍚', name:'Reis (Basmati)',      kat:'Getreide & Brot',         kcal:358, pro:7,   kh:79,  fett:0.7, einheit:'g',       g:100 },
  { id:'p41', emoji:'🍝', name:'Nudeln (Vollkorn)',  kat:'Getreide & Brot',          kcal:352, pro:13,  kh:63,  fett:2.5, einheit:'g',       g:100 },
  { id:'p42', emoji:'🌾', name:'Haferflocken',        kat:'Getreide & Brot',         kcal:366, pro:13,  kh:58,  fett:7,   einheit:'g',       g:100 },
  { id:'p43', emoji:'🍞', name:'Vollkornbrot',        kat:'Getreide & Brot',         kcal:247, pro:9,   kh:40,  fett:3.4, einheit:'Scheibe', g:50  },
  { id:'p44', emoji:'🥖', name:'Baguette',            kat:'Getreide & Brot',         kcal:289, pro:9.6, kh:56,  fett:1.6, einheit:'Stück',   g:250 },
  { id:'p45', emoji:'🌽', name:'Quinoa',              kat:'Getreide & Brot',         kcal:368, pro:14,  kh:64,  fett:6,   einheit:'g',       g:100 },
  { id:'p50', emoji:'🫘', name:'Kichererbsen (Dose)',kat:'Hülsenfrüchte',            kcal:164, pro:8.9, kh:27,  fett:2.6, einheit:'Dose',    g:240 },
  { id:'p51', emoji:'🫘', name:'Rote Linsen',         kat:'Hülsenfrüchte',           kcal:338, pro:25,  kh:52,  fett:1.4, einheit:'g',       g:100 },
  { id:'p52', emoji:'🫘', name:'Schwarze Bohnen',    kat:'Hülsenfrüchte',            kcal:132, pro:8.9, kh:24,  fett:0.5, einheit:'Dose',    g:240 },
  { id:'p53', emoji:'🍅', name:'Tomaten (Dose)',      kat:'Hülsenfrüchte',           kcal:25,  pro:1.2, kh:5,   fett:0.3, einheit:'Dose',    g:400 },
  { id:'p60', emoji:'🫒', name:'Olivenöl',            kat:'Öle & Würzen',            kcal:884, pro:0,   kh:0,   fett:100, einheit:'EL',      g:14  },
  { id:'p61', emoji:'🧂', name:'Meersalz',            kat:'Öle & Würzen',            kcal:0,   pro:0,   kh:0,   fett:0,   einheit:'Packung', g:500 },
  { id:'p62', emoji:'🫙', name:'Erdnussbutter',       kat:'Öle & Würzen',            kcal:588, pro:25,  kh:20,  fett:50,  einheit:'g',       g:100 },
  { id:'p70', emoji:'🍫', name:'Dunkle Schokolade',  kat:'Snacks & Süßes',          kcal:546, pro:5,   kh:60,  fett:31,  einheit:'g',       g:100 },
  { id:'p71', emoji:'🥜', name:'Mandeln',             kat:'Snacks & Süßes',          kcal:579, pro:21,  kh:22,  fett:50,  einheit:'g',       g:100 },
  { id:'p72', emoji:'🥜', name:'Walnüsse',            kat:'Snacks & Süßes',          kcal:654, pro:15,  kh:14,  fett:65,  einheit:'g',       g:100 },
  { id:'p73', emoji:'🍯', name:'Honig',               kat:'Snacks & Süßes',          kcal:304, pro:0.3, kh:82,  fett:0,   einheit:'EL',      g:21  },
  { id:'p80', emoji:'🥤', name:'Proteinpulver',       kat:'Getränke & Supplements',  kcal:380, pro:75,  kh:12,  fett:4,   einheit:'Dose',    g:1000},
  { id:'p81', emoji:'🍵', name:'Grüner Tee',          kat:'Getränke & Supplements',  kcal:1,   pro:0,   kh:0,   fett:0,   einheit:'Beutel',  g:2   },
  { id:'p82', emoji:'☕', name:'Kaffee (gemahlen)',   kat:'Getränke & Supplements',  kcal:0,   pro:0,   kh:0,   fett:0,   einheit:'Packung', g:500 },
];

function rnd(n) { return Math.round(n * 10) / 10; }

export function produktToZutat(p, menge = 1) {
  const factor = p.g / 100;
  return {
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    produktId: p.id,
    emoji:     p.emoji,
    name:      p.name,
    kat:       p.kat,
    menge,
    einheit:   p.einheit,
    kcalPro:   rnd(p.kcal * factor),
    proPro:    rnd(p.pro  * factor),
    khPro:     rnd(p.kh   * factor),
    fettPro:   rnd(p.fett * factor),
  };
}

export function calcMealMacros(zutaten = []) {
  return {
    kalorien:      rnd(zutaten.reduce((s, z) => s + (z.kcalPro || 0) * z.menge, 0)),
    protein:       rnd(zutaten.reduce((s, z) => s + (z.proPro  || 0) * z.menge, 0)),
    kohlenhydrate: rnd(zutaten.reduce((s, z) => s + (z.khPro   || 0) * z.menge, 0)),
    fett:          rnd(zutaten.reduce((s, z) => s + (z.fettPro || 0) * z.menge, 0)),
  };
}

// Shopping-list format (compatible with livora-einkaufsliste)
export function zutatToListItem(z) {
  return {
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    produktId: z.produktId ?? null,
    emoji:     z.emoji ?? '🍽️',
    name:      z.name,
    kat:       z.kat ?? 'Aus Ernährungsplan',
    menge:     z.menge,
    einheit:   z.einheit,
    kcalPro:   z.kcalPro ?? 0,
    proPro:    z.proPro  ?? 0,
    khPro:     z.khPro   ?? 0,
    fettPro:   z.fettPro ?? 0,
    erledigt:  false,
    vonPlan:   'Ernährungsplan',
  };
}
