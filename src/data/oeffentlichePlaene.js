/*
 * ═══════════════════════════════════════════════════════════════════════════
 *  ADMIN-DOKUMENTATION – Öffentliche Pläne verwalten
 *  Datei: src/data/oeffentlichePlaene.js
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  KURZANLEITUNG
 *  ─────────────
 *  Trainingsplan  → neues Objekt in  oeffentlicheTrainingsplaene[]  eintragen
 *  Ernährungsplan → neues Objekt in  oeffentlicheErnaehrungsplaene[] eintragen
 *  IDs werden in localStorage gespeichert – niemals eine ID recyceln!
 *
 * ───────────────────────────────────────────────────────────────────────────
 *  ID-SCHEMA
 * ───────────────────────────────────────────────────────────────────────────
 *  Trainingspläne:   plan-1, plan-2, plan-3, plan-4 … (fortlaufend)
 *  Ernährungspläne:  erplan-1, erplan-2, erplan-3 …   (fortlaufend)
 *
 *  Nächste freie Trainingsplan-ID:   plan-7
 *  Nächste freie Ernährungsplan-ID:  erplan-5
 *
 * ───────────────────────────────────────────────────────────────────────────
 *  PFLICHTFELDER – TRAININGSPLAN
 * ───────────────────────────────────────────────────────────────────────────
 *
 *  Feld                    Typ      Erlaubte Werte / Hinweise
 *  ────────────────────────────────────────────────────────────────────────
 *  id                      String   "plan-N" – eindeutig, nie wiederverwenden
 *  titel                   String   Anzeigename, max. ~40 Zeichen
 *  beschreibung            String   1–3 Sätze für die Kartenvorschau
 *  kategorie               String   'kraft' | 'ausdauer' | 'mobilitaet'
 *                                   | 'muskelaufbau'
 *  niveau                  String   'einsteiger' | 'mittel' | 'fortgeschritten'
 *  dauer                   String   z. B. "8 Wochen"
 *  trainingsTagsProWoche   Number   z. B. 3
 *  autor                   String   z. B. "KynoGG"
 *  bild                    String   Pfad ab /public – "/bilder/training5.jpg"
 *  tage                    Array    Trainingstage (≥ 1)
 *    ├─ name               String   z. B. "Push A – Brust & Schulter"
 *    └─ uebungen           Array    Übungen des Tages (≥ 1)
 *         ├─ name          String   Übungsname
 *         ├─ saetze        Number   Anzahl Sätze
 *         ├─ wiederholungen Number  Anzahl Wdh. oder Haltezeit in Sekunden
 *         └─ notizen       String   Coaching-Tipp (leer = "" erlaubt)
 *
 * ───────────────────────────────────────────────────────────────────────────
 *  PFLICHTFELDER – ERNÄHRUNGSPLAN
 * ───────────────────────────────────────────────────────────────────────────
 *
 *  Feld                    Typ      Erlaubte Werte / Hinweise
 *  ────────────────────────────────────────────────────────────────────────
 *  id                      String   "erplan-N" – eindeutig, nie wiederverwenden
 *  titel                   String   Anzeigename
 *  beschreibung            String   1–3 Sätze
 *  kategorie               String   'abnehmen' | 'muskelaufbau' | 'vegetarisch'
 *  kalorien                Number   Ø Tageskalorien (nur für Anzeige)
 *  autor                   String   z. B. "KynoGG"
 *  tage                    Array    Empfohlen: alle 7 Wochentage (≥ 1)
 *    ├─ wochentag          String   'Montag' | 'Dienstag' | 'Mittwoch'
 *    │                              | 'Donnerstag' | 'Freitag' | 'Samstag'
 *    │                              | 'Sonntag'  ← Schreibweise exakt so!
 *    └─ mahlzeiten         Array    Mahlzeiten des Tages (≥ 1)
 *         ├─ typ           String   'Frühstück' | 'Mittagessen' | 'Abendessen'
 *         │                         | 'Snack' | 'Pre-Workout' | 'Post-Workout'
 *         ├─ name          String   Mahlzeitenname
 *         ├─ kalorien      Number   kcal dieser Mahlzeit
 *         ├─ protein       Number   Gramm Protein
 *         ├─ kohlenhydrate Number   Gramm Kohlenhydrate
 *         └─ fett          Number   Gramm Fett
 *
 * ───────────────────────────────────────────────────────────────────────────
 *  KOMPLETTES BEISPIEL – TRAININGSPLAN
 * ───────────────────────────────────────────────────────────────────────────
 *
 *  {
 *    id: 'plan-7',
 *    titel: 'Oberkörper Fokus – 4 Tage',
 *    beschreibung: 'Vier Einheiten pro Woche, aufgeteilt in Drücken und Ziehen.',
 *    kategorie: 'kraft',
 *    niveau: 'mittel',
 *    dauer: '8 Wochen',
 *    trainingsTagsProWoche: 4,
 *    autor: 'KynoGG',
 *    bild: '/bilder/training7.jpg',
 *    tage: [
 *      {
 *        name: 'Tag A – Drücken',
 *        uebungen: [
 *          { name: 'Bankdrücken',       saetze: 4, wiederholungen: 8,  notizen: 'Progressiv steigern' },
 *          { name: 'Schulterdrücken',   saetze: 3, wiederholungen: 10, notizen: 'Kein Hohlkreuz'      },
 *          { name: 'Trizeps Dips',      saetze: 3, wiederholungen: 12, notizen: ''                    },
 *        ],
 *      },
 *      {
 *        name: 'Tag B – Ziehen',
 *        uebungen: [
 *          { name: 'Klimmzüge',         saetze: 4, wiederholungen: 8,  notizen: 'Schulterblätter aktiv' },
 *          { name: 'Langhantelrudern',  saetze: 4, wiederholungen: 8,  notizen: 'Stange zum Nabel'      },
 *          { name: 'Bizeps Curl',       saetze: 3, wiederholungen: 12, notizen: ''                      },
 *        ],
 *      },
 *    ],
 *  }
 *
 * ───────────────────────────────────────────────────────────────────────────
 *  KOMPLETTES BEISPIEL – ERNÄHRUNGSPLAN
 * ───────────────────────────────────────────────────────────────────────────
 *
 *  {
 *    id: 'erplan-5',
 *    titel: 'Low Carb Wochenplan',
 *    beschreibung: 'Kalorienarmer Plan mit hohem Proteinanteil und wenig Kohlenhydraten.',
 *    kategorie: 'abnehmen',
 *    kalorien: 1600,
 *    autor: 'KynoGG',
 *    tage: [
 *      {
 *        wochentag: 'Montag',
 *        mahlzeiten: [
 *          { typ: 'Frühstück',   name: 'Rührei & Avocado',         kalorien: 380, protein: 22, kohlenhydrate: 8,  fett: 28 },
 *          { typ: 'Mittagessen', name: 'Hähnchen & Salat',          kalorien: 420, protein: 40, kohlenhydrate: 12, fett: 16 },
 *          { typ: 'Snack',       name: 'Magerquark & Beeren',       kalorien: 150, protein: 18, kohlenhydrate: 14, fett: 1  },
 *          { typ: 'Abendessen',  name: 'Lachs & Gedünstetes Gemüse', kalorien: 490, protein: 38, kohlenhydrate: 10, fett: 22 },
 *        ],
 *      },
 *      // weitere Wochentage ...
 *    ],
 *  }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */


// ─────────────────────────────────────────────
//  TRAININGSPLÄNE
// ─────────────────────────────────────────────

export const oeffentlicheTrainingsplaene = [

  // ── Plan 1 ──────────────────────────────────
  {
    id: 'plan-1',
    ort: 'home',
    titel: 'Ganzkörper Einsteiger',
    beschreibung:
      'Perfekt für Anfänger: Drei ausgewogene Einheiten pro Woche, '
      + 'die alle großen Muskelgruppen gleichmäßig trainieren. '
      + 'Kein Gerät nötig – alle Übungen lassen sich mit dem eigenen Körpergewicht ausführen.',
    kategorie: 'kraft',
    niveau: 'einsteiger',
    dauer: '8 Wochen',
    trainingsTagsProWoche: 3,
    autor: 'KynoGG',
    bild: '/bilder/training1.jpg',
    tage: [
      {
        name: 'Tag A – Unterkörper & Core',
        uebungen: [
          { name: 'Kniebeugen',      saetze: 3, wiederholungen: 12, notizen: 'Rücken gerade, Knie hinter den Zehen' },
          { name: 'Ausfallschritte', saetze: 3, wiederholungen: 10, notizen: 'Je Seite, Oberschenkel parallel zum Boden' },
          { name: 'Glute Bridge',    saetze: 3, wiederholungen: 15, notizen: 'Oben 2 Sek. halten' },
          { name: 'Planke',          saetze: 3, wiederholungen: 30, notizen: 'Haltezeit in Sekunden, Körper in einer Linie' },
          { name: 'Crunch',          saetze: 3, wiederholungen: 20, notizen: 'Lenden auf dem Boden lassen' },
        ],
      },
      {
        name: 'Tag B – Oberkörper Drücken',
        uebungen: [
          { name: 'Liegestütze',              saetze: 3, wiederholungen: 10, notizen: 'Ellbogen 45° zum Körper' },
          { name: 'Pike Push-up',             saetze: 3, wiederholungen: 8,  notizen: 'Hüfte hoch, Kopf zwischen die Arme' },
          { name: 'Trizeps Dips (Stuhl)',     saetze: 3, wiederholungen: 12, notizen: 'Rücken nah am Stuhl' },
          { name: 'Seitliches Schulterdrücken (Kurzh.)', saetze: 3, wiederholungen: 12, notizen: 'Leichtes Gewicht, volle Kontrolle' },
          { name: 'Superman',                 saetze: 3, wiederholungen: 12, notizen: 'Rückenstrecker, 2 Sek. oben halten' },
        ],
      },
      {
        name: 'Tag C – Oberkörper Ziehen & Gesamt',
        uebungen: [
          { name: 'Klimmzüge (oder Doorframe Rows)', saetze: 3, wiederholungen: 8,  notizen: 'Assistenz-Band oder Tisch-Rows als Alternative' },
          { name: 'Rudern mit Kurzhantel',           saetze: 3, wiederholungen: 10, notizen: 'Je Seite, stabilen Stand einnehmen' },
          { name: 'Bizeps Curl',                     saetze: 3, wiederholungen: 12, notizen: 'Ellbogen an der Seite fixiert' },
          { name: 'Burpees',                         saetze: 3, wiederholungen: 8,  notizen: 'Explosiv – als Konditionsfinisher' },
          { name: 'Mountain Climbers',               saetze: 3, wiederholungen: 20, notizen: 'Je Seite, zügiges Tempo' },
        ],
      },
    ],
  },

  // ── Plan 2 ──────────────────────────────────
  {
    id: 'plan-2',
    ort: 'studio',
    titel: 'Push / Pull / Legs – Muskelaufbau',
    beschreibung:
      'Bewährter 6-Tage-Split für Fortgeschrittene. '
      + 'Jede Muskelgruppe wird zweimal wöchentlich stimuliert. '
      + 'Voraussetzung: Zugang zu Kurz- und Langhantel sowie einer Klimmzugstange.',
    kategorie: 'kraft',
    niveau: 'fortgeschritten',
    dauer: '12 Wochen',
    trainingsTagsProWoche: 6,
    autor: 'KynoGG',
    bild: '/bilder/training2.jpg',
    tage: [
      {
        name: 'Push A – Brust & Schulter Fokus',
        uebungen: [
          { name: 'Flachbankdrücken',         saetze: 4, wiederholungen: 8,  notizen: 'Progressiv steigern, letzter Satz AMRAP' },
          { name: 'Schrägbankdrücken (30°)',  saetze: 3, wiederholungen: 10, notizen: 'Kurzhantel oder Langhantel' },
          { name: 'Schulterdrücken stehend',  saetze: 4, wiederholungen: 8,  notizen: 'Kern anspannen, keine Hohlkreuz' },
          { name: 'Seitheben',                saetze: 3, wiederholungen: 15, notizen: 'Leichtes Gewicht, langsame Exzentrik' },
          { name: 'Trizeps Pushdown (Kabel)', saetze: 3, wiederholungen: 12, notizen: 'Ellbogen fixiert' },
          { name: 'Overhead Trizeps Ext.',    saetze: 3, wiederholungen: 12, notizen: 'Mit Kurzhantel oder Kabel' },
        ],
      },
      {
        name: 'Pull A – Rücken & Bizeps Fokus',
        uebungen: [
          { name: 'Klimmzüge',           saetze: 4, wiederholungen: 8,  notizen: 'Schulterblätter aktiv zusammenziehen' },
          { name: 'Langhantelrudern',    saetze: 4, wiederholungen: 8,  notizen: 'Oberkörper ~45°, Stange zum Nabel' },
          { name: 'Latzug eng',          saetze: 3, wiederholungen: 10, notizen: 'Ellbogen zur Hüfte führen' },
          { name: 'Face Pull (Kabel)',   saetze: 3, wiederholungen: 15, notizen: 'Schultergesundheit, hohes Volumen' },
          { name: 'Bizeps Curl',         saetze: 3, wiederholungen: 12, notizen: 'Vollständige Streckung unten' },
          { name: 'Hammer Curl',         saetze: 3, wiederholungen: 12, notizen: 'Neutraler Griff, Brachialis' },
        ],
      },
      {
        name: 'Legs A – Quad Fokus',
        uebungen: [
          { name: 'Kniebeugen (LH)',         saetze: 4, wiederholungen: 6,  notizen: 'High Bar, tiefe Kniebeuge' },
          { name: 'Beinpresse',              saetze: 3, wiederholungen: 10, notizen: 'Füße schulterbreit, Knie nicht kollabieren' },
          { name: 'Bulgarische Split Squat', saetze: 3, wiederholungen: 10, notizen: 'Je Seite, Kurzhantel oder Körpergewicht' },
          { name: 'Beinstrecker',            saetze: 3, wiederholungen: 15, notizen: 'Isolation Finisher' },
          { name: 'Wadenheben stehend',      saetze: 4, wiederholungen: 20, notizen: 'Langsame Exzentrik (3 Sek.)' },
          { name: 'Plank',                   saetze: 3, wiederholungen: 45, notizen: 'Sekunden, Core-Stabilisierung' },
        ],
      },
      {
        name: 'Push B – Schulter & Trizeps Fokus',
        uebungen: [
          { name: 'Schulterdrücken sitzend (KH)', saetze: 4, wiederholungen: 10, notizen: 'Rücken an Lehne' },
          { name: 'Frontales Fliegende',           saetze: 3, wiederholungen: 12, notizen: 'Leicht gebeugte Arme' },
          { name: 'Schrägbank Fliegende',          saetze: 3, wiederholungen: 12, notizen: 'Dehnung am unteren Punkt' },
          { name: 'Arnold Press',                  saetze: 3, wiederholungen: 10, notizen: 'Rotation für mehr Schultervolumen' },
          { name: 'Trizeps Dips',                  saetze: 3, wiederholungen: 12, notizen: 'Körperdips oder an der Maschine' },
          { name: 'Schräges Seitheben',            saetze: 3, wiederholungen: 15, notizen: 'Kabel oder KH, hintere Schulter' },
        ],
      },
      {
        name: 'Pull B – Rückendicke & Bizeps',
        uebungen: [
          { name: 'Kreuzheben (konventionell)', saetze: 4, wiederholungen: 6,  notizen: 'Hauptübung des Tages – max. Intensität' },
          { name: 'Chest Supported Row',        saetze: 3, wiederholungen: 10, notizen: 'Auf Schrägbank, Schulterblätter zusammen' },
          { name: 'Einarmiges Rudern (KH)',     saetze: 3, wiederholungen: 10, notizen: 'Je Seite, langer Bereich' },
          { name: 'Straight-Arm Pulldown',      saetze: 3, wiederholungen: 15, notizen: 'Kabel, Latissimus Isolation' },
          { name: 'Konzentrations Curl',        saetze: 3, wiederholungen: 12, notizen: 'Langsame Exzentrik, Peak Kontraktion' },
          { name: 'Reverse Curl',               saetze: 3, wiederholungen: 12, notizen: 'Unterarme stärken' },
        ],
      },
      {
        name: 'Legs B – Posterior Chain Fokus',
        uebungen: [
          { name: 'Rumänisches Kreuzheben', saetze: 4, wiederholungen: 8,  notizen: 'Streckung der hinteren Kette' },
          { name: 'Beinbeuger liegend',     saetze: 3, wiederholungen: 12, notizen: 'Isoliertes Hamstring-Training' },
          { name: 'Hip Thrust (LH)',        saetze: 4, wiederholungen: 10, notizen: 'Schultern auf Bank, Gewicht auf Hüfte' },
          { name: 'Sumo Kniebeuge (KH)',    saetze: 3, wiederholungen: 12, notizen: 'Breiter Stand, Innenschenkel' },
          { name: 'Good Mornings',          saetze: 3, wiederholungen: 12, notizen: 'Leichtes Gewicht, Rückenstrecker' },
          { name: 'Wadenheben sitzend',     saetze: 4, wiederholungen: 20, notizen: 'Soleus Fokus' },
        ],
      },
    ],
  },

  // ── Plan 3 ──────────────────────────────────
  {
    id: 'plan-3',
    ort: 'home',
    titel: 'HIIT Fettverbrennung – 6 Wochen',
    beschreibung:
      'Intensives Intervalltraining für maximalen Kalorienverbrauch. '
      + 'Drei Einheiten pro Woche reichen für spürbare Ergebnisse. '
      + 'Kein Equipment nötig – überall durchführbar.',
    kategorie: 'ausdauer',
    niveau: 'mittel',
    dauer: '6 Wochen',
    trainingsTagsProWoche: 3,
    autor: 'KynoGG',
    bild: '/bilder/training3.jpg',
    tage: [
      {
        name: 'Einheit A – Lower Body HIIT',
        uebungen: [
          { name: 'Jump Squats',         saetze: 4, wiederholungen: 15, notizen: '20 Sek. Pause zwischen Sätzen' },
          { name: 'Alternating Lunges',  saetze: 4, wiederholungen: 20, notizen: 'Je Seite zählt als 1' },
          { name: 'Box Jumps (oder Stuhl)', saetze: 4, wiederholungen: 10, notizen: 'Sanfte Landung, Knie leicht gebeugt' },
          { name: 'Squat Pulse',         saetze: 3, wiederholungen: 30, notizen: 'Kleine pulsierende Bewegung tief in der Kniebeuge' },
          { name: 'High Knees',          saetze: 4, wiederholungen: 40, notizen: '40 Sekunden Dauerbelastung' },
        ],
      },
      {
        name: 'Einheit B – Upper Body & Core HIIT',
        uebungen: [
          { name: 'Burpees',                    saetze: 4, wiederholungen: 10, notizen: 'Explosive Streckung nach oben' },
          { name: 'Explosive Liegestütze',      saetze: 4, wiederholungen: 8,  notizen: 'Hände abheben bei jedem Wiederholung' },
          { name: 'Mountain Climbers',          saetze: 4, wiederholungen: 30, notizen: '30 Sekunden Dauerbelastung' },
          { name: 'V-Ups',                      saetze: 3, wiederholungen: 15, notizen: 'Core-Krampf vermeiden, langsam beginnen' },
          { name: 'Plank to Downward Dog',      saetze: 3, wiederholungen: 12, notizen: 'Fließende Bewegung, Schultermobilität' },
        ],
      },
      {
        name: 'Einheit C – Full Body Tabata',
        uebungen: [
          { name: 'Jumping Jacks',       saetze: 8, wiederholungen: 20, notizen: 'Tabata: 20 Sek. Belastung / 10 Sek. Pause' },
          { name: 'Kniebeugen',          saetze: 8, wiederholungen: 15, notizen: 'Tabata-Schema – 4 Minuten Gesamtzeit' },
          { name: 'Liegestütze',         saetze: 8, wiederholungen: 10, notizen: 'Tabata-Schema' },
          { name: 'Kreuzheben Bewegung', saetze: 8, wiederholungen: 15, notizen: 'Körpergewicht, Beckenscharnier üben' },
          { name: 'Sprint auf der Stelle', saetze: 8, wiederholungen: 30, notizen: '30 Sek. Maximalbelastung' },
        ],
      },
    ],
  },

  // ── Plan 4 ──────────────────────────────────
  {
    id: 'plan-4',
    ort: 'home',
    titel: 'Mobilitätstraining & Dehnen',
    beschreibung:
      'Ideal als Ergänzung zu jedem Trainingsprogramm oder für aktive Erholungstage. '
      + 'Verbessert Beweglichkeit, löst Verspannungen und beugt Verletzungen vor.',
    kategorie: 'mobilitaet',
    niveau: 'einsteiger',
    dauer: '4 Wochen',
    trainingsTagsProWoche: 4,
    autor: 'KynoGG',
    bild: '/bilder/training4.jpg',
    tage: [
      {
        name: 'Morgenroutine (20 Min.)',
        uebungen: [
          { name: 'Katzenbuckel / Kuhgang',  saetze: 3, wiederholungen: 10, notizen: 'Atemsynchron, langsam' },
          { name: 'Hip Flexor Stretch',      saetze: 2, wiederholungen: 30, notizen: '30 Sek. je Seite' },
          { name: 'Thorakale Extension',     saetze: 3, wiederholungen: 10, notizen: 'Über Schaumstoffrolle' },
          { name: "World's Greatest Stretch", saetze: 2, wiederholungen: 8, notizen: 'Je Seite' },
          { name: 'Hüftkreisen',             saetze: 2, wiederholungen: 10, notizen: 'Je Richtung' },
        ],
      },
      {
        name: 'Abend-Yoga (30 Min.)',
        uebungen: [
          { name: 'Kindshaltung',         saetze: 2, wiederholungen: 60, notizen: '60 Sek. halten, tief atmen' },
          { name: 'Taube (Pigeon Pose)',   saetze: 2, wiederholungen: 60, notizen: 'Je Seite, Hüftöffnung' },
          { name: 'Liegender Drehsitz',   saetze: 2, wiederholungen: 30, notizen: 'Je Seite, Rücken entspannen' },
          { name: 'Hängende Vorwärtsbeuge', saetze: 3, wiederholungen: 30, notizen: 'Knie leicht gebeugt erlaubt' },
          { name: 'Schulteröffnung Wand', saetze: 2, wiederholungen: 45, notizen: 'Arme auf Hüfthöhe, Hüfte von Wand wegschieben' },
        ],
      },
    ],
  },

  // ── Plan 5 ──────────────────────────────────
  {
    id: 'plan-5',
    ort: 'studio',
    titel: 'PPL Intensiv – Kraftaufbau Fortgeschritten',
    beschreibung:
      'Sechs-Tage Power-Building-Split mit Fokus auf progressiver Überlast. '
      + 'Niedrige Wiederholungszahlen bei den Hauptübungen für maximalen Kraftzuwachs, '
      + 'ergänzt durch Isolationsarbeit für vollständige Hypertrophie. '
      + 'Voraussetzung: Freihanteln, Kabelmaschine und Klimmzugstange.',
    kategorie: 'muskelaufbau',
    niveau: 'fortgeschritten',
    dauer: '16 Wochen',
    trainingsTagsProWoche: 6,
    autor: 'KynoGG',
    bild: '/bilder/training5.jpg',
    tage: [
      {
        name: 'Push A – Schrägbank & Schulter schwer',
        uebungen: [
          { name: 'Schrägbankdrücken (LH)',      saetze: 4, wiederholungen: 5,  notizen: 'Hauptbewegung – 3–4 Min. Pause, Gewicht wöchentlich steigern' },
          { name: 'Flachbankdrücken (KH)',        saetze: 3, wiederholungen: 10, notizen: 'Voller Bewegungsumfang, tiefe Dehnung am unteren Punkt' },
          { name: 'Schulterdrücken stehend (LH)', saetze: 4, wiederholungen: 6,  notizen: 'Kern hart anspannen, kein Hohlkreuz' },
          { name: 'Seitheben Kabel',              saetze: 4, wiederholungen: 15, notizen: 'Konstante Spannung durch Kabel, langsame Exzentrik' },
          { name: 'Trizeps Dips gewichtet',       saetze: 3, wiederholungen: 10, notizen: 'Gewichtsgürtel oder Kettlebell zwischen den Beinen' },
          { name: 'Close-Grip Bankdrücken',       saetze: 3, wiederholungen: 8,  notizen: 'Schulterbreiter Griff, Ellbogen nah am Körper' },
        ],
      },
      {
        name: 'Pull A – Vertikales Ziehen & Bizeps',
        uebungen: [
          { name: 'Klimmzüge gewichtet',     saetze: 4, wiederholungen: 6,  notizen: 'Mit Gürtel – wöchentlich Gewicht steigern' },
          { name: 'Pendlay Row (LH)',        saetze: 4, wiederholungen: 5,  notizen: 'Stange berührt zwischen jedem Satz den Boden, explosiver Zug' },
          { name: 'Latzug weit (Kabel)',     saetze: 3, wiederholungen: 10, notizen: 'Schulterblätter herunterdrücken, Ellbogen zur Hüfte' },
          { name: 'Kabelrudern eng',         saetze: 3, wiederholungen: 12, notizen: 'Sitzend, Schulterblätter am Ende zusammenziehen' },
          { name: 'Bizeps Curl (LH)',        saetze: 4, wiederholungen: 8,  notizen: 'Voller Bewegungsumfang, kein Schwung' },
          { name: 'Incline Curl (KH)',       saetze: 3, wiederholungen: 12, notizen: 'Auf Schrägbank, maximale Bizeps-Dehnung am unteren Punkt' },
        ],
      },
      {
        name: 'Legs A – Kniebeuge Kraft',
        uebungen: [
          { name: 'Kniebeugen High Bar (LH)',    saetze: 5, wiederholungen: 5,  notizen: '5×5 Hauptarbeit – 3–4 Min. Pause, Tiefe unterhalb der Parallele' },
          { name: 'Front Squat (LH)',            saetze: 3, wiederholungen: 8,  notizen: 'Rumpfstabilität und Quadrizeps-Fokus' },
          { name: 'Beinpresse',                  saetze: 4, wiederholungen: 10, notizen: 'Hohes Volumen nach Hauptübung, Füße schulterbreit' },
          { name: 'Walking Lunges (KH)',         saetze: 3, wiederholungen: 12, notizen: 'Je Seite, aufrechter Oberkörper' },
          { name: 'Beinstrecker',                saetze: 3, wiederholungen: 15, notizen: 'Quad-Isolation, oben kurz halten' },
          { name: 'Stehend Wadenheben',          saetze: 5, wiederholungen: 12, notizen: 'Langsame Exzentrik 4 Sek., voller Bewegungsumfang' },
        ],
      },
      {
        name: 'Push B – Flach & Schultervolumen',
        uebungen: [
          { name: 'Flachbankdrücken (LH)',        saetze: 4, wiederholungen: 8,  notizen: 'Schwerster Satz am Ende, progressiv steigern' },
          { name: 'Schrägbank Fliegende (KH)',    saetze: 3, wiederholungen: 12, notizen: 'Leicht gebeugte Arme, tiefe Dehnung' },
          { name: 'Arnold Press (KH)',            saetze: 4, wiederholungen: 10, notizen: 'Rotation für mehr Schulter-Rekrutierung' },
          { name: 'Frontales Seitheben (KH)',     saetze: 3, wiederholungen: 12, notizen: 'Vorderer Deltoid, kontrolliertes Ablassen' },
          { name: 'Overhead Trizeps Ext. (KH)',   saetze: 3, wiederholungen: 12, notizen: 'Langer Trizepskopf, Kabel oder KH' },
          { name: 'Seildrücken Trizeps (Kabel)', saetze: 3, wiederholungen: 15, notizen: 'Ellbogen fixiert, langsame Exzentrik' },
        ],
      },
      {
        name: 'Pull B – Horizontales Ziehen & Griffkraft',
        uebungen: [
          { name: 'Kreuzheben konventionell',   saetze: 4, wiederholungen: 4,  notizen: 'Schwerste Bewegung der Woche – 4–5 Min. Pause, maximale Intensität' },
          { name: 'Langhantelrudern Overhand',  saetze: 4, wiederholungen: 6,  notizen: 'Overhand-Griff, oberer Rücken im Fokus' },
          { name: 'Einarmiges Rudern (KH)',     saetze: 3, wiederholungen: 10, notizen: 'Je Seite, neutraler Griff, langer Bewegungsumfang' },
          { name: 'Straight-Arm Pulldown',      saetze: 3, wiederholungen: 15, notizen: 'Kabel, reine Lat-Isolation' },
          { name: 'Hammer Curl (KH)',           saetze: 3, wiederholungen: 12, notizen: 'Neutraler Griff, Brachialis und Brachioradialis' },
          { name: 'Reverse Curl (LH)',          saetze: 3, wiederholungen: 10, notizen: 'Unterarme und Griffkraft stärken' },
        ],
      },
      {
        name: 'Legs B – Posteriore Kette & Glutes',
        uebungen: [
          { name: 'Rumänisches Kreuzheben (LH)', saetze: 4, wiederholungen: 8,  notizen: 'Knie minimal gebeugt, Dehnung der hinteren Kette bis ans Limit' },
          { name: 'Hip Thrust (LH)',             saetze: 4, wiederholungen: 10, notizen: 'Schultern auf Bank, Gewicht auf Hüfte, oben Gesäß maximal anspannen' },
          { name: 'Bulgarischer Split Squat',   saetze: 3, wiederholungen: 8,  notizen: 'Je Seite, tiefe Kniebeugung, hinterer Fuß auf Bank' },
          { name: 'Beinbeuger liegend',          saetze: 3, wiederholungen: 12, notizen: 'Hamstring-Isolation, volle Streckung unten' },
          { name: 'Nordic Curl',                 saetze: 3, wiederholungen: 6,  notizen: 'Anspruchsvoll – Knie auf Matte, Partner hält Knöchel, langsam absenken' },
          { name: 'Wadenheben sitzend',          saetze: 4, wiederholungen: 15, notizen: 'Soleus-Fokus, langsame Exzentrik 3 Sek.' },
        ],
      },
    ],
  },

  // ── Plan 6 ──────────────────────────────────
  {
    id: 'plan-6',
    ort: 'studio',
    titel: 'Ganzkörper Athletik – 4 Tage',
    beschreibung:
      'Athletikorientierter Vier-Tage-Plan für ein ausgewogenes Verhältnis '
      + 'aus Kraft, Explosivität und Körpergefühl. '
      + 'Ideal für alle, die über reinen Masseaufbau hinausgehen wollen.',
    kategorie: 'kraft',
    niveau: 'mittel',
    dauer: '10 Wochen',
    trainingsTagsProWoche: 4,
    autor: 'KynoGG',
    bild: '/bilder/training6.jpg',
    tage: [
      {
        name: 'Tag A – Kraft Unterkörper',
        uebungen: [
          { name: 'Kniebeugen (LH)',        saetze: 4, wiederholungen: 6,  notizen: 'Schwere Arbeit, 3 Min. Pause' },
          { name: 'Rumänisches Kreuzheben', saetze: 3, wiederholungen: 8,  notizen: 'Hintere Kette, Kontrolle wichtiger als Gewicht' },
          { name: 'Ausfallschritte (KH)',   saetze: 3, wiederholungen: 10, notizen: 'Je Seite, aufrechter Oberkörper' },
          { name: 'Box Jump',               saetze: 4, wiederholungen: 6,  notizen: 'Explosiv – maximale Sprunghöhe, sanfte Landung' },
          { name: 'Wadenheben',             saetze: 4, wiederholungen: 15, notizen: 'Voller Bewegungsumfang' },
        ],
      },
      {
        name: 'Tag B – Kraft Oberkörper Drücken',
        uebungen: [
          { name: 'Schulterdrücken (LH)',    saetze: 4, wiederholungen: 6,  notizen: 'Stehend, Kern fest' },
          { name: 'Schrägbankdrücken (KH)', saetze: 3, wiederholungen: 10, notizen: 'Voller Bewegungsumfang' },
          { name: 'Push Press',             saetze: 4, wiederholungen: 5,  notizen: 'Explosiver Knieschub, Stange über Kopf drücken' },
          { name: 'Seitheben (KH)',          saetze: 3, wiederholungen: 15, notizen: 'Schulterkontur, langsames Ablassen' },
          { name: 'Trizeps Pushdown',        saetze: 3, wiederholungen: 12, notizen: 'Kabel, Ellbogen fixiert' },
        ],
      },
      {
        name: 'Tag C – Kraft Unterkörper Posterior',
        uebungen: [
          { name: 'Kreuzheben (LH)',           saetze: 4, wiederholungen: 5,  notizen: 'Maximale Intensität, 3–4 Min. Pause' },
          { name: 'Hip Thrust (LH)',           saetze: 3, wiederholungen: 10, notizen: 'Schultern auf Bank, Hüfte voll strecken' },
          { name: 'Step-Up (KH)',              saetze: 3, wiederholungen: 10, notizen: 'Je Seite, Box oder Stuhl' },
          { name: 'Beinbeuger liegend',        saetze: 3, wiederholungen: 12, notizen: 'Hamstring-Isolation' },
          { name: 'Farmer Carry',              saetze: 4, wiederholungen: 40, notizen: '40 Meter Strecke, schwere KH, aufrechte Haltung' },
        ],
      },
      {
        name: 'Tag D – Kraft Oberkörper Ziehen',
        uebungen: [
          { name: 'Klimmzüge',              saetze: 4, wiederholungen: 8,  notizen: 'Überhand-Griff, volle Streckung unten' },
          { name: 'Langhantelrudern',       saetze: 4, wiederholungen: 6,  notizen: 'Oberkörper 45°, Stange zum Nabel' },
          { name: 'TRX-Rows (oder Tisch)', saetze: 3, wiederholungen: 12, notizen: 'Körper in einer Linie, Brust zur Stange' },
          { name: 'Face Pull (Kabel)',      saetze: 3, wiederholungen: 15, notizen: 'Schultergesundheit, Außenrotation' },
          { name: 'Bizeps Curl (KH)',       saetze: 3, wiederholungen: 12, notizen: 'Abwechselnd, Supination im oberen Bereich' },
        ],
      },
    ],
  },

];


// ─────────────────────────────────────────────
//  ERNÄHRUNGSPLÄNE
// ─────────────────────────────────────────────

export const oeffentlicheErnaehrungsplaene = [

  // ── Plan 1 ──────────────────────────────────
  {
    id: 'erplan-1',
    titel: 'Clean Eating – Wochenplan Abnehmen',
    beschreibung:
      'Vollwertige, sättigende Mahlzeiten ohne Fertigprodukte. '
      + 'Rund 1.800 kcal täglich, ausreichend Protein für Muskelerhalt beim Abnehmen.',
    kategorie: 'abnehmen',
    kalorien: 1800,
    autor: 'KynoGG',
    tage: [
      {
        wochentag: 'Montag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Haferflocken mit Beeren & Mandeln',    kalorien: 380, protein: 14, kohlenhydrate: 55, fett: 10 },
          { typ: 'Mittagessen', name: 'Hähnchenbrust mit Süßkartoffel & Brokkoli', kalorien: 520, protein: 42, kohlenhydrate: 45, fett: 8  },
          { typ: 'Snack',       name: 'Griechischer Joghurt (0%) mit Honig',   kalorien: 150, protein: 15, kohlenhydrate: 18, fett: 1  },
          { typ: 'Abendessen',  name: 'Lachsfilet mit Quinoa & Spinat',        kalorien: 490, protein: 38, kohlenhydrate: 40, fett: 14 },
          { typ: 'Snack',       name: 'Handvoll Mandeln',                      kalorien: 170, protein:  6, kohlenhydrate:  5, fett: 15 },
        ],
      },
      {
        wochentag: 'Dienstag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Rührei (3 Eier) mit Avocado & Tomaten', kalorien: 420, protein: 22, kohlenhydrate:  8, fett: 30 },
          { typ: 'Mittagessen', name: 'Linsensuppe mit Vollkornbrot',            kalorien: 490, protein: 24, kohlenhydrate: 70, fett:  7 },
          { typ: 'Snack',       name: 'Apfel mit Erdnussbutter (1 EL)',         kalorien: 200, protein:  4, kohlenhydrate: 28, fett:  8 },
          { typ: 'Abendessen',  name: 'Putenstreifen-Pfanne mit Paprika & Reis', kalorien: 530, protein: 44, kohlenhydrate: 55, fett:  8 },
        ],
      },
      {
        wochentag: 'Mittwoch',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Smoothie Bowl (Banane, Spinat, Proteinpulver)', kalorien: 360, protein: 25, kohlenhydrate: 50, fett:  6 },
          { typ: 'Mittagessen', name: 'Thunfisch-Salat mit Kichererbsen & Olivenöl',   kalorien: 480, protein: 38, kohlenhydrate: 30, fett: 18 },
          { typ: 'Snack',       name: 'Hüttenkäse mit Gurke',                          kalorien: 160, protein: 20, kohlenhydrate:  6, fett:  4 },
          { typ: 'Abendessen',  name: 'Vegane Bowl: Tofu, Edamame, Braun Reis, Miso',  kalorien: 550, protein: 30, kohlenhydrate: 65, fett: 14 },
        ],
      },
      {
        wochentag: 'Donnerstag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Vollkorntoast mit Ricotta & Erdbeeren', kalorien: 310, protein: 14, kohlenhydrate: 42, fett:  8 },
          { typ: 'Mittagessen', name: 'Hähnchen-Wraps mit Salat & Joghurtdip', kalorien: 510, protein: 38, kohlenhydrate: 48, fett: 12 },
          { typ: 'Snack',       name: 'Proteinriegel (hausgemacht)',            kalorien: 200, protein: 18, kohlenhydrate: 20, fett:  6 },
          { typ: 'Abendessen',  name: 'Gemüsecurry mit Kichererbsen & Vollkornreis', kalorien: 480, protein: 22, kohlenhydrate: 68, fett:  9 },
        ],
      },
      {
        wochentag: 'Freitag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Overnight Oats mit Chia & Mango',          kalorien: 390, protein: 16, kohlenhydrate: 58, fett:  9 },
          { typ: 'Mittagessen', name: 'Lachs-Poke Bowl mit Edamame & braunem Reis', kalorien: 560, protein: 40, kohlenhydrate: 55, fett: 16 },
          { typ: 'Snack',       name: 'Rohkost (Karotten, Paprika) mit Hummus',    kalorien: 180, protein:  6, kohlenhydrate: 22, fett:  8 },
          { typ: 'Abendessen',  name: 'Gegrillte Garnelen mit Zucchini-Nudeln',    kalorien: 420, protein: 36, kohlenhydrate: 18, fett: 12 },
        ],
      },
      {
        wochentag: 'Samstag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Protein-Pancakes mit Ahornsirup & Beeren',  kalorien: 450, protein: 28, kohlenhydrate: 55, fett: 10 },
          { typ: 'Mittagessen', name: 'Rinderhackfleisch-Bowl mit Avocado & Salat', kalorien: 590, protein: 42, kohlenhydrate: 20, fett: 32 },
          { typ: 'Snack',       name: 'Handvoll gemischte Nüsse',                   kalorien: 190, protein:  5, kohlenhydrate:  6, fett: 17 },
          { typ: 'Abendessen',  name: 'Hühnchen-Gemüsesuppe mit Vollkornnudeln',    kalorien: 430, protein: 34, kohlenhydrate: 42, fett: 10 },
        ],
      },
      {
        wochentag: 'Sonntag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Avocado Toast mit Spiegelei & Tomate', kalorien: 410, protein: 18, kohlenhydrate: 36, fett: 22 },
          { typ: 'Mittagessen', name: 'Ofengemüse mit Quinoa & Feta',         kalorien: 480, protein: 20, kohlenhydrate: 56, fett: 18 },
          { typ: 'Snack',       name: 'Proteinshake (Wasser, 1 Schaufel)',    kalorien: 130, protein: 25, kohlenhydrate:  4, fett:  2 },
          { typ: 'Abendessen',  name: 'Thunfisch-Gemüse-Auflauf',            kalorien: 480, protein: 40, kohlenhydrate: 28, fett: 16 },
        ],
      },
    ],
  },

  // ── Plan 2 ──────────────────────────────────
  {
    id: 'erplan-2',
    titel: 'Muskelaufbau – High Protein Wochenplan',
    beschreibung:
      'Kalorienreicher Plan für effektiven Muskelaufbau. '
      + 'Mindestens 160 g Protein täglich, hoher Anteil an komplexen Kohlenhydraten '
      + 'als Energielieferant rund ums Training.',
    kategorie: 'muskelaufbau',
    kalorien: 2800,
    autor: 'KynoGG',
    tage: [
      {
        wochentag: 'Montag',
        mahlzeiten: [
          { typ: 'Frühstück',     name: 'Protein-Oatmeal (Haferflocken, 2 Eier, Banane)',   kalorien: 580, protein: 32, kohlenhydrate: 80, fett: 12 },
          { typ: 'Pre-Workout',   name: 'Reiswaffeln mit Erdnussbutter & Marmelade',         kalorien: 350, protein:  8, kohlenhydrate: 55, fett: 10 },
          { typ: 'Post-Workout',  name: 'Proteinshake mit Milch & Banane',                   kalorien: 380, protein: 40, kohlenhydrate: 45, fett:  5 },
          { typ: 'Mittagessen',   name: 'Hähnchenbrust 200 g mit Reis 200 g & Brokkoli',    kalorien: 680, protein: 54, kohlenhydrate: 82, fett:  8 },
          { typ: 'Snack',         name: 'Magerquark 250 g mit Walnüssen & Honig',            kalorien: 320, protein: 28, kohlenhydrate: 22, fett: 12 },
          { typ: 'Abendessen',    name: 'Lachs 200 g mit Süßkartoffel & Spargel',            kalorien: 620, protein: 46, kohlenhydrate: 52, fett: 20 },
        ],
      },
      {
        wochentag: 'Dienstag',
        mahlzeiten: [
          { typ: 'Frühstück',    name: 'Omelett (4 Eier, Paprika, Zwiebeln) & Vollkorntoast', kalorien: 560, protein: 36, kohlenhydrate: 42, fett: 22 },
          { typ: 'Snack',        name: 'Hüttenkäse 200 g mit Pfirsich',                        kalorien: 250, protein: 26, kohlenhydrate: 22, fett:  4 },
          { typ: 'Mittagessen',  name: 'Rinderhack-Bolognese mit Vollkornnudeln 200 g',        kalorien: 750, protein: 52, kohlenhydrate: 88, fett: 18 },
          { typ: 'Pre-Workout',  name: 'Banane & 1 Proteinriegel',                             kalorien: 280, protein: 20, kohlenhydrate: 40, fett:  6 },
          { typ: 'Post-Workout', name: 'Hähnchen-Wrap mit Guacamole',                          kalorien: 520, protein: 38, kohlenhydrate: 48, fett: 16 },
          { typ: 'Abendessen',   name: 'Putenbrust 200 g mit Stampfkartoffel & grünen Bohnen', kalorien: 590, protein: 50, kohlenhydrate: 55, fett:  8 },
        ],
      },
      {
        wochentag: 'Mittwoch',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Griechischer Joghurt 300 g, Granola, Beeren & Walnüsse', kalorien: 520, protein: 30, kohlenhydrate: 55, fett: 18 },
          { typ: 'Snack',       name: 'Käse-Vollkornbrot mit Schinken',                           kalorien: 320, protein: 22, kohlenhydrate: 30, fett: 10 },
          { typ: 'Mittagessen', name: 'Thunfisch-Pasta 200 g mit Olivenöl & Rucola',              kalorien: 700, protein: 48, kohlenhydrate: 82, fett: 14 },
          { typ: 'Snack',       name: 'Proteinshake & Handvoll Cashews',                          kalorien: 380, protein: 30, kohlenhydrate: 18, fett: 18 },
          { typ: 'Abendessen',  name: 'Hähnchen-Stir-Fry mit braunem Reis 150 g',                kalorien: 660, protein: 50, kohlenhydrate: 72, fett: 12 },
        ],
      },
      {
        wochentag: 'Donnerstag',
        mahlzeiten: [
          { typ: 'Frühstück',    name: 'French Toast (4 Scheiben) mit Proteinpulver im Teig',  kalorien: 600, protein: 36, kohlenhydrate: 72, fett: 14 },
          { typ: 'Pre-Workout',  name: 'Reiswaffeln mit Quark & Marmelade',                     kalorien: 300, protein: 20, kohlenhydrate: 42, fett:  4 },
          { typ: 'Post-Workout', name: 'Proteinshake mit Haferflocken (Blender)',                kalorien: 420, protein: 42, kohlenhydrate: 52, fett:  6 },
          { typ: 'Mittagessen',  name: 'Lachsnudeln mit Frischkäse 200 g',                      kalorien: 720, protein: 46, kohlenhydrate: 80, fett: 20 },
          { typ: 'Abendessen',   name: 'Beef-Bowl: Rinderhack, Avocado, Reis & Salsa',          kalorien: 680, protein: 52, kohlenhydrate: 50, fett: 26 },
        ],
      },
      {
        wochentag: 'Freitag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Protein-Pancakes (3 Stück) mit Blaubeeren & Sirup', kalorien: 550, protein: 36, kohlenhydrate: 65, fett: 12 },
          { typ: 'Snack',       name: 'Magerquark 200 g mit Beeren',                         kalorien: 240, protein: 26, kohlenhydrate: 20, fett:  2 },
          { typ: 'Mittagessen', name: 'Hähnchenschenkel (Ofen) mit Rosmarinkartoffeln',      kalorien: 720, protein: 48, kohlenhydrate: 65, fett: 24 },
          { typ: 'Snack',       name: 'Reiswaffeln & Erdnussbutter 2 EL',                    kalorien: 300, protein:  8, kohlenhydrate: 40, fett: 12 },
          { typ: 'Abendessen',  name: 'Pizza (Vollkorn, Ricotta, Hähnchen, Gemüse)',         kalorien: 750, protein: 48, kohlenhydrate: 82, fett: 20 },
        ],
      },
      {
        wochentag: 'Samstag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Großes Frühstück: 3 Eier, Speck, Tomaten, Vollkorntoast', kalorien: 620, protein: 38, kohlenhydrate: 40, fett: 28 },
          { typ: 'Mittagessen', name: 'Steak 200 g mit Süßkartoffel-Pommes & Salat',              kalorien: 800, protein: 56, kohlenhydrate: 60, fett: 30 },
          { typ: 'Snack',       name: 'Proteineis (selbstgemacht: Quark, Frucht, Stevia)',         kalorien: 200, protein: 22, kohlenhydrate: 18, fett:  2 },
          { typ: 'Abendessen',  name: 'Gegrillte Garnelen-Spieße mit Couscous 150 g',             kalorien: 560, protein: 42, kohlenhydrate: 58, fett: 12 },
        ],
      },
      {
        wochentag: 'Sonntag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Banana Protein Smoothie & Vollkorntoast mit Avocado', kalorien: 520, protein: 28, kohlenhydrate: 60, fett: 16 },
          { typ: 'Mittagessen', name: 'Meal Prep: Hähnchen, Reis, Brokkoli x2 Portionen',   kalorien: 820, protein: 72, kohlenhydrate: 90, fett: 12 },
          { typ: 'Snack',       name: 'Käsewürfel & Rohkost',                                kalorien: 280, protein: 18, kohlenhydrate:  8, fett: 18 },
          { typ: 'Abendessen',  name: 'Lachs-Süßkartoffel-Auflauf',                         kalorien: 620, protein: 46, kohlenhydrate: 55, fett: 20 },
        ],
      },
    ],
  },

  // ── Plan 3 ──────────────────────────────────
  {
    id: 'erplan-3',
    titel: 'Vegetarischer Sportler – Wochenplan',
    beschreibung:
      'Beweist: Pflanzliche Ernährung und Leistungssport schließen sich nicht aus. '
      + 'Eiweißreich durch Hülsenfrüchte, Milchprodukte und Eier – '
      + 'ohne Fleisch oder Fisch.',
    kategorie: 'vegetarisch',
    kalorien: 2200,
    autor: 'KynoGG',
    tage: [
      {
        wochentag: 'Montag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Skyr-Bowl mit Granola, Erdnussbutter & Apfel',       kalorien: 480, protein: 32, kohlenhydrate: 58, fett: 12 },
          { typ: 'Mittagessen', name: 'Rotes Linsen-Dhal mit braunem Reis',                  kalorien: 580, protein: 28, kohlenhydrate: 88, fett:  8 },
          { typ: 'Snack',       name: 'Hartes Ei & Rohkost mit Hummus',                      kalorien: 220, protein: 14, kohlenhydrate: 14, fett: 12 },
          { typ: 'Abendessen',  name: 'Ofen-Tofu mit Teriyaki-Sauce, Brokkoli & Ramen',      kalorien: 560, protein: 34, kohlenhydrate: 70, fett: 12 },
        ],
      },
      {
        wochentag: 'Dienstag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Vollkornpfannkuchen (3) mit Quark & Beeren',    kalorien: 440, protein: 26, kohlenhydrate: 58, fett: 10 },
          { typ: 'Mittagessen', name: 'Kichererbsen-Spinat-Curry mit Naan',             kalorien: 590, protein: 24, kohlenhydrate: 80, fett: 14 },
          { typ: 'Snack',       name: 'Proteinshake mit Erbsenprotein & Mandelmilch',   kalorien: 200, protein: 24, kohlenhydrate: 12, fett:  4 },
          { typ: 'Abendessen',  name: 'Zucchini-Spaghetti mit Linsen-Bolognese',        kalorien: 520, protein: 28, kohlenhydrate: 60, fett: 14 },
        ],
      },
      {
        wochentag: 'Mittwoch',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Härtgekochte Eier x3 & Avocadotoast',        kalorien: 500, protein: 24, kohlenhydrate: 36, fett: 28 },
          { typ: 'Mittagessen', name: 'Falafel-Bowl mit Tabbouleh & Tahini',          kalorien: 610, protein: 22, kohlenhydrate: 72, fett: 22 },
          { typ: 'Snack',       name: 'Magerquark 200 g mit Leinsamen & Blaubeeren', kalorien: 250, protein: 26, kohlenhydrate: 20, fett:  5 },
          { typ: 'Abendessen',  name: 'Gebackene Süßkartoffel mit Cottage Cheese',   kalorien: 480, protein: 26, kohlenhydrate: 62, fett:  8 },
        ],
      },
    ],
  },

  // ── Plan 4 ──────────────────────────────────
  {
    id: 'erplan-4',
    titel: '1500 kcal Kaloriendefizit – Abnehm-Plan',
    beschreibung:
      'Strukturierter 7-Tage-Plan mit konsequentem Kaloriendefizit für gesunden Fettabbau. '
      + 'Vier sättigende Mahlzeiten täglich mit hohem Proteinanteil zum Muskelerhalt. '
      + 'Ideal als Einstieg in eine Diätphase oder nach einer Aufbauphase.',
    kategorie: 'abnehmen',
    kalorien: 1500,
    autor: 'KynoGG',
    tage: [
      {
        wochentag: 'Montag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Protein-Haferbrei mit Skyr & Zimt',             kalorien: 340, protein: 22, kohlenhydrate: 44, fett:  7 },
          { typ: 'Mittagessen', name: 'Hähnchenbrust 150 g mit Quinoa & Paprika-Salsa', kalorien: 460, protein: 40, kohlenhydrate: 42, fett:  8 },
          { typ: 'Snack',       name: 'Magerquark 150 g mit Gurken-Dill',               kalorien: 130, protein: 18, kohlenhydrate:  6, fett:  2 },
          { typ: 'Abendessen',  name: 'Seelachsfilet (gedünstet) mit Brokkoli & Möhren', kalorien: 510, protein: 38, kohlenhydrate: 28, fett: 14 },
        ],
      },
      {
        wochentag: 'Dienstag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Rührei (2 Eier + 2 Eiweiß) mit Tomaten & Spinat', kalorien: 290, protein: 24, kohlenhydrate:  6, fett: 16 },
          { typ: 'Mittagessen', name: 'Putenbrust-Wrap (Vollkorn) mit Salat & Senf',      kalorien: 430, protein: 38, kohlenhydrate: 40, fett:  8 },
          { typ: 'Snack',       name: 'Apfel & 10 Mandeln',                               kalorien: 160, protein:  4, kohlenhydrate: 24, fett:  7 },
          { typ: 'Abendessen',  name: 'Tomatensuppe mit Linsen & Vollkornbrot (1 Scheibe)', kalorien: 520, protein: 28, kohlenhydrate: 62, fett:  9 },
        ],
      },
      {
        wochentag: 'Mittwoch',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Overnight Oats (50 g Haferflocken, Wasser, Beeren)', kalorien: 330, protein: 10, kohlenhydrate: 56, fett:  5 },
          { typ: 'Mittagessen', name: 'Thunfisch (Dose) auf buntem Salat mit Balsamico',    kalorien: 380, protein: 38, kohlenhydrate: 16, fett: 14 },
          { typ: 'Snack',       name: 'Hüttenkäse 100 g mit Paprikasticks',                 kalorien: 140, protein: 14, kohlenhydrate:  8, fett:  4 },
          { typ: 'Abendessen',  name: 'Zucchini-Hähnchen-Pfanne mit Kräuterkartoffeln',    kalorien: 490, protein: 36, kohlenhydrate: 42, fett: 12 },
        ],
      },
      {
        wochentag: 'Donnerstag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Griechischer Joghurt (0%) 200 g mit Beeren & Walnüssen', kalorien: 310, protein: 20, kohlenhydrate: 28, fett: 10 },
          { typ: 'Mittagessen', name: 'Linseneintopf mit Karotten & Lauch',                      kalorien: 470, protein: 26, kohlenhydrate: 60, fett:  8 },
          { typ: 'Snack',       name: 'Proteinshake (Wasser, 1 Schaufel, 20 g)',                  kalorien: 100, protein: 20, kohlenhydrate:  4, fett:  1 },
          { typ: 'Abendessen',  name: 'Putengeschnetzeltes mit Champignons & Hüttenkäse-Sauce',  kalorien: 520, protein: 44, kohlenhydrate: 20, fett: 18 },
        ],
      },
      {
        wochentag: 'Freitag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Vollkorntoast (2 Scheiben) mit Hüttenkäse & Tomate', kalorien: 320, protein: 20, kohlenhydrate: 38, fett:  6 },
          { typ: 'Mittagessen', name: 'Lachs 120 g mit Brokkoli & Süßkartoffel (100 g)',    kalorien: 480, protein: 36, kohlenhydrate: 36, fett: 16 },
          { typ: 'Snack',       name: 'Rohkost-Teller (Karotte, Gurke, Paprika)',            kalorien: 80,  protein:  3, kohlenhydrate: 15, fett:  1 },
          { typ: 'Abendessen',  name: 'Hähnchen-Gemüsesuppe mit Glasnudeln',                 kalorien: 530, protein: 38, kohlenhydrate: 42, fett: 14 },
        ],
      },
      {
        wochentag: 'Samstag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Eierpfannkuchen (2 Eier, 30 g Haferflocken) mit Beeren', kalorien: 360, protein: 22, kohlenhydrate: 40, fett: 10 },
          { typ: 'Mittagessen', name: 'Ofengemüse (Zucchini, Aubergine, Paprika) mit Feta 50 g', kalorien: 390, protein: 16, kohlenhydrate: 32, fett: 20 },
          { typ: 'Snack',       name: 'Proteinriegel selbstgemacht (Quark, Haferflocken, Honig)', kalorien: 210, protein: 18, kohlenhydrate: 24, fett:  4 },
          { typ: 'Abendessen',  name: 'Gegrillte Putenbrust mit Ratatouille & Bulgur 60 g',      kalorien: 490, protein: 40, kohlenhydrate: 38, fett: 14 },
        ],
      },
      {
        wochentag: 'Sonntag',
        mahlzeiten: [
          { typ: 'Frühstück',   name: 'Avocado (½) auf Vollkorntoast mit Spiegelei',     kalorien: 380, protein: 16, kohlenhydrate: 30, fett: 22 },
          { typ: 'Mittagessen', name: 'Hähnchenbrust-Salat mit Quinoa, Feta & Oliven',   kalorien: 450, protein: 38, kohlenhydrate: 32, fett: 18 },
          { typ: 'Snack',       name: 'Magerquark 150 g mit Vanille & Blaubeeren',       kalorien: 140, protein: 18, kohlenhydrate: 12, fett:  2 },
          { typ: 'Abendessen',  name: 'Seelachs-Curry (Light Kokosmilch) mit Blumenkohl-Reis', kalorien: 480, protein: 36, kohlenhydrate: 28, fett: 20 },
        ],
      },
    ],
  },

];
