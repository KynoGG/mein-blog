'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';
import { oeffentlicheErnaehrungsplaene } from '@/data/oeffentlichePlaene';

const LIST_KEY   = 'livora-einkaufsliste';
const AKTIV_E    = 'aktiver-ernaehrungsplan';
const EIGENE_E   = 'kynogg-eigene-ernaehrungsplaene';

/* ─── Produktdatenbank ───────────────────────────────────────────────────── */
// Nährwerte pro 100 g, außer bei Einheit "Stück" (dann pro Stück mit ~Gramm)
const PRODUKTE = [
  // 🥦 Obst & Gemüse
  { id:'p01', emoji:'🍎', name:'Apfel',           kat:'Obst & Gemüse',          kcal:52,  pro:0.3, kh:14,  fett:0.2, einheit:'Stück',   g:150 },
  { id:'p02', emoji:'🍌', name:'Banane',           kat:'Obst & Gemüse',          kcal:89,  pro:1.1, kh:23,  fett:0.3, einheit:'Stück',   g:120 },
  { id:'p03', emoji:'🍓', name:'Erdbeeren',        kat:'Obst & Gemüse',          kcal:32,  pro:0.7, kh:7.7, fett:0.3, einheit:'g',       g:100 },
  { id:'p04', emoji:'🫐', name:'Blaubeeren',       kat:'Obst & Gemüse',          kcal:57,  pro:0.7, kh:14,  fett:0.3, einheit:'g',       g:100 },
  { id:'p05', emoji:'🥦', name:'Brokkoli',         kat:'Obst & Gemüse',          kcal:34,  pro:2.8, kh:7,   fett:0.4, einheit:'Stück',   g:300 },
  { id:'p06', emoji:'🥕', name:'Karotten',         kat:'Obst & Gemüse',          kcal:41,  pro:0.9, kh:10,  fett:0.2, einheit:'Stück',   g:80  },
  { id:'p07', emoji:'🥒', name:'Gurke',            kat:'Obst & Gemüse',          kcal:15,  pro:0.6, kh:3.6, fett:0.1, einheit:'Stück',   g:300 },
  { id:'p08', emoji:'🍅', name:'Tomate',           kat:'Obst & Gemüse',          kcal:18,  pro:0.9, kh:3.9, fett:0.2, einheit:'Stück',   g:120 },
  { id:'p09', emoji:'🧅', name:'Zwiebel',          kat:'Obst & Gemüse',          kcal:40,  pro:1.1, kh:9.3, fett:0.1, einheit:'Stück',   g:100 },
  { id:'p10', emoji:'🥑', name:'Avocado',          kat:'Obst & Gemüse',          kcal:160, pro:2,   kh:9,   fett:15,  einheit:'Stück',   g:150 },
  { id:'p11', emoji:'🍋', name:'Zitrone',          kat:'Obst & Gemüse',          kcal:29,  pro:1.1, kh:9,   fett:0.3, einheit:'Stück',   g:80  },
  { id:'p12', emoji:'🥬', name:'Spinat',           kat:'Obst & Gemüse',          kcal:23,  pro:2.9, kh:3.6, fett:0.4, einheit:'g',       g:100 },
  { id:'p13', emoji:'🫑', name:'Paprika (rot)',    kat:'Obst & Gemüse',          kcal:31,  pro:1,   kh:6,   fett:0.3, einheit:'Stück',   g:150 },
  { id:'p14', emoji:'🧄', name:'Knoblauch',        kat:'Obst & Gemüse',          kcal:149, pro:6.4, kh:33,  fett:0.5, einheit:'Zehe',    g:5   },
  { id:'p15', emoji:'🥝', name:'Kiwi',             kat:'Obst & Gemüse',          kcal:61,  pro:1.1, kh:15,  fett:0.5, einheit:'Stück',   g:80  },

  // 🥩 Fleisch & Fisch
  { id:'p20', emoji:'🍗', name:'Hähnchenbrustfilet',kat:'Fleisch & Fisch',       kcal:110, pro:23,  kh:0,   fett:1.8, einheit:'g',       g:100 },
  { id:'p21', emoji:'🥩', name:'Rinderhackfleisch', kat:'Fleisch & Fisch',       kcal:221, pro:19,  kh:0,   fett:16,  einheit:'g',       g:100 },
  { id:'p22', emoji:'🐟', name:'Lachs',             kat:'Fleisch & Fisch',       kcal:208, pro:20,  kh:0,   fett:13,  einheit:'g',       g:100 },
  { id:'p23', emoji:'🐠', name:'Thunfisch (Dose)',  kat:'Fleisch & Fisch',       kcal:116, pro:26,  kh:0,   fett:1,   einheit:'Dose',    g:150 },
  { id:'p24', emoji:'🥩', name:'Schweinefilet',     kat:'Fleisch & Fisch',       kcal:143, pro:22,  kh:0,   fett:5,   einheit:'g',       g:100 },
  { id:'p25', emoji:'🍗', name:'Putengeschnetzeltes',kat:'Fleisch & Fisch',      kcal:104, pro:22,  kh:0,   fett:1.4, einheit:'g',       g:100 },
  { id:'p26', emoji:'🦐', name:'Garnelen',           kat:'Fleisch & Fisch',      kcal:99,  pro:21,  kh:0.9, fett:0.9, einheit:'g',       g:100 },

  // 🥛 Milchprodukte & Eier
  { id:'p30', emoji:'🥚', name:'Eier',              kat:'Milchprodukte & Eier',  kcal:155, pro:13,  kh:1.1, fett:11,  einheit:'Stück',   g:60  },
  { id:'p31', emoji:'🥛', name:'Vollmilch',         kat:'Milchprodukte & Eier',  kcal:64,  pro:3.3, kh:4.7, fett:3.7, einheit:'ml',      g:100 },
  { id:'p32', emoji:'🧀', name:'Mozzarella',        kat:'Milchprodukte & Eier',  kcal:253, pro:18,  kh:2.2, fett:19,  einheit:'Packung', g:125 },
  { id:'p33', emoji:'🧀', name:'Parmesan',           kat:'Milchprodukte & Eier', kcal:392, pro:36,  kh:3.2, fett:26,  einheit:'g',       g:100 },
  { id:'p34', emoji:'🫙', name:'Griechischer Joghurt',kat:'Milchprodukte & Eier',kcal:97,  pro:9,   kh:4,   fett:5,   einheit:'g',       g:100 },
  { id:'p35', emoji:'🧈', name:'Butter',             kat:'Milchprodukte & Eier', kcal:717, pro:0.9, kh:0.6, fett:81,  einheit:'g',       g:100 },
  { id:'p36', emoji:'🥛', name:'Quark (Magerquark)', kat:'Milchprodukte & Eier', kcal:67,  pro:12,  kh:4,   fett:0.2, einheit:'g',       g:100 },

  // 🌾 Getreide & Brot
  { id:'p40', emoji:'🍚', name:'Reis (Basmati)',    kat:'Getreide & Brot',       kcal:358, pro:7,   kh:79,  fett:0.7, einheit:'g',       g:100 },
  { id:'p41', emoji:'🍝', name:'Nudeln (Vollkorn)', kat:'Getreide & Brot',       kcal:352, pro:13,  kh:63,  fett:2.5, einheit:'g',       g:100 },
  { id:'p42', emoji:'🌾', name:'Haferflocken',      kat:'Getreide & Brot',       kcal:366, pro:13,  kh:58,  fett:7,   einheit:'g',       g:100 },
  { id:'p43', emoji:'🍞', name:'Vollkornbrot',      kat:'Getreide & Brot',       kcal:247, pro:9,   kh:40,  fett:3.4, einheit:'Scheibe', g:50  },
  { id:'p44', emoji:'🥖', name:'Baguette',          kat:'Getreide & Brot',       kcal:289, pro:9.6, kh:56,  fett:1.6, einheit:'Stück',   g:250 },
  { id:'p45', emoji:'🌽', name:'Quinoa',            kat:'Getreide & Brot',       kcal:368, pro:14,  kh:64,  fett:6,   einheit:'g',       g:100 },

  // 🥫 Hülsenfrüchte & Konserven
  { id:'p50', emoji:'🫘', name:'Kichererbsen (Dose)',kat:'Hülsenfrüchte',        kcal:164, pro:8.9, kh:27,  fett:2.6, einheit:'Dose',    g:240 },
  { id:'p51', emoji:'🫘', name:'Rote Linsen',       kat:'Hülsenfrüchte',         kcal:338, pro:25,  kh:52,  fett:1.4, einheit:'g',       g:100 },
  { id:'p52', emoji:'🫘', name:'Schwarze Bohnen',   kat:'Hülsenfrüchte',         kcal:132, pro:8.9, kh:24,  fett:0.5, einheit:'Dose',    g:240 },
  { id:'p53', emoji:'🍅', name:'Tomaten (Dose)',    kat:'Hülsenfrüchte',          kcal:25,  pro:1.2, kh:5,   fett:0.3, einheit:'Dose',    g:400 },

  // 🧴 Öle & Würzen
  { id:'p60', emoji:'🫒', name:'Olivenöl',          kat:'Öle & Würzen',          kcal:884, pro:0,   kh:0,   fett:100, einheit:'EL',      g:14  },
  { id:'p61', emoji:'🧂', name:'Meersalz',          kat:'Öle & Würzen',          kcal:0,   pro:0,   kh:0,   fett:0,   einheit:'Packung', g:500 },
  { id:'p62', emoji:'🫙', name:'Erdnussbutter',     kat:'Öle & Würzen',          kcal:588, pro:25,  kh:20,  fett:50,  einheit:'g',       g:100 },

  // 🍫 Snacks & Süßes
  { id:'p70', emoji:'🍫', name:'Dunkle Schokolade', kat:'Snacks & Süßes',        kcal:546, pro:5,   kh:60,  fett:31,  einheit:'g',       g:100 },
  { id:'p71', emoji:'🥜', name:'Mandeln',            kat:'Snacks & Süßes',        kcal:579, pro:21,  kh:22,  fett:50,  einheit:'g',       g:100 },
  { id:'p72', emoji:'🥜', name:'Walnüsse',           kat:'Snacks & Süßes',        kcal:654, pro:15,  kh:14,  fett:65,  einheit:'g',       g:100 },
  { id:'p73', emoji:'🍯', name:'Honig',              kat:'Snacks & Süßes',        kcal:304, pro:0.3, kh:82,  fett:0,   einheit:'EL',      g:21  },

  // 🥤 Getränke
  { id:'p80', emoji:'🥤', name:'Proteinpulver',     kat:'Getränke & Supplements', kcal:380, pro:75,  kh:12,  fett:4,   einheit:'Dose',    g:1000},
  { id:'p81', emoji:'🍵', name:'Grüner Tee',        kat:'Getränke & Supplements', kcal:1,   pro:0,   kh:0,   fett:0,   einheit:'Beutel',  g:2   },
  { id:'p82', emoji:'☕', name:'Kaffee (gemahlen)', kat:'Getränke & Supplements', kcal:0,   pro:0,   kh:0,   fett:0,   einheit:'Packung', g:500 },
];

const KATEGORIEN = [...new Set(PRODUKTE.map(p => p.kat))];
const KAT_EMOJI  = {
  'Obst & Gemüse': '🥦',
  'Fleisch & Fisch': '🥩',
  'Milchprodukte & Eier': '🥛',
  'Getreide & Brot': '🌾',
  'Hülsenfrüchte': '🫘',
  'Öle & Würzen': '🧴',
  'Snacks & Süßes': '🍫',
  'Getränke & Supplements': '🥤',
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function rnd(n) { return Math.round(n * 10) / 10; }

function itemNaehrwerte(item) {
  // kcal/pro/kh/fett are already "per menge * einheit"
  const factor = item.menge;
  return {
    kcal: rnd((item.kcalPro || 0) * factor),
    pro:  rnd((item.proPro  || 0) * factor),
    kh:   rnd((item.khPro   || 0) * factor),
    fett: rnd((item.fettPro || 0) * factor),
  };
}

function produktToItem(p, menge = 1) {
  // Nährwert pro Einheit berechnen
  const factor = p.g / 100;
  return {
    id:       uid(),
    produktId: p.id,
    emoji:    p.emoji,
    name:     p.name,
    kat:      p.kat,
    menge,
    einheit:  p.einheit,
    kcalPro:  rnd(p.kcal * factor),
    proPro:   rnd(p.pro  * factor),
    khPro:    rnd(p.kh   * factor),
    fettPro:  rnd(p.fett * factor),
    erledigt: false,
    vonPlan:  null,
  };
}

function mahlzeitToItem(meal, planName) {
  return {
    id:       uid(),
    produktId: null,
    emoji:    '🍽️',
    name:     meal.name,
    kat:      'Aus Ernährungsplan',
    menge:    1,
    einheit:  'Portion',
    kcalPro:  meal.kalorien || 0,
    proPro:   meal.protein  || 0,
    khPro:    meal.kohlenhydrate || 0,
    fettPro:  meal.fett     || 0,
    erledigt: false,
    vonPlan:  planName,
  };
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function EinkaufslistePage() {
  const { user: _au, loading: _al } = useAuth();

  const [items,      setItems]      = useState([]);
  const [loaded,     setLoaded]     = useState(false);
  const [tab,        setTab]        = useState('liste');   // 'liste' | 'produkte' | 'plan'
  const [sucheQ,     setSucheQ]     = useState('');
  const [aktivKat,   setAktivKat]   = useState('Alle');
  const [aktivPlan,  setAktivPlan]  = useState(null);     // loaded nutrition plan
  const [customName, setCustomName] = useState('');
  const [addedIds,   setAddedIds]   = useState(new Set());

  // Load list + active plan
  useEffect(() => {
    try { const v = localStorage.getItem(LIST_KEY); if (v) setItems(JSON.parse(v)); } catch {}
    try {
      const ref = JSON.parse(localStorage.getItem(AKTIV_E) || 'null');
      if (ref?.source === 'oeffentlich') {
        const plan = oeffentlicheErnaehrungsplaene.find(p => p.id === ref.id);
        if (plan) setAktivPlan({ ...plan, _source: 'oeffentlich' });
      } else if (ref?.source === 'eigene') {
        const eigene = JSON.parse(localStorage.getItem(EIGENE_E) || '[]');
        const plan = eigene.find(p => p.id === ref.id);
        if (plan) setAktivPlan({ ...plan, titel: plan.name, _source: 'eigene' });
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) localStorage.setItem(LIST_KEY, JSON.stringify(items)); }, [items, loaded]);

  function addProdukt(p, menge = 1) {
    setItems(prev => [...prev, produktToItem(p, menge)]);
    setAddedIds(prev => new Set([...prev, p.id]));
  }

  function addMahlzeit(meal, planName) {
    const key = `${meal.name}-${meal.typ}`;
    if (addedIds.has(key)) return;
    setItems(prev => [...prev, mahlzeitToItem(meal, planName)]);
    setAddedIds(prev => new Set([...prev, key]));
  }

  function addCustom(e) {
    e.preventDefault();
    if (!customName.trim()) return;
    setItems(prev => [...prev, { id: uid(), produktId: null, emoji: '🛒', name: customName.trim(), kat: 'Eigene', menge: 1, einheit: 'Stück', kcalPro: 0, proPro: 0, khPro: 0, fettPro: 0, erledigt: false, vonPlan: null }]);
    setCustomName('');
  }

  function toggle(id)     { setItems(p => p.map(i => i.id === id ? { ...i, erledigt: !i.erledigt } : i)); }
  function remove(id)     { setItems(p => p.filter(i => i.id !== id)); }
  function setMenge(id,v) { setItems(p => p.map(i => i.id === id ? { ...i, menge: Math.max(0.5, v) } : i)); }
  function clearDone()    { setItems(p => p.filter(i => !i.erledigt)); }
  function clearAll()     { setItems([]); setAddedIds(new Set()); }

  // Grouped list
  const grouped = useMemo(() => {
    const g = {};
    for (const item of items) {
      const k = item.kat || 'Eigene';
      if (!g[k]) g[k] = [];
      g[k].push(item);
    }
    return g;
  }, [items]);

  // Summary
  const summary = useMemo(() => {
    const aktive = items.filter(i => !i.erledigt);
    return {
      kcal: Math.round(aktive.reduce((a,i) => a + itemNaehrwerte(i).kcal, 0)),
      pro:  rnd(aktive.reduce((a,i) => a + itemNaehrwerte(i).pro,  0)),
      kh:   rnd(aktive.reduce((a,i) => a + itemNaehrwerte(i).kh,   0)),
      fett: rnd(aktive.reduce((a,i) => a + itemNaehrwerte(i).fett, 0)),
    };
  }, [items]);

  // Product filter
  const filteredProds = useMemo(() => {
    return PRODUKTE.filter(p => {
      const matchKat = aktivKat === 'Alle' || p.kat === aktivKat;
      const matchQ   = !sucheQ || p.name.toLowerCase().includes(sucheQ.toLowerCase());
      return matchKat && matchQ;
    });
  }, [aktivKat, sucheQ]);

  const doneCnt  = items.filter(i => i.erledigt).length;
  const totalCnt = items.length;

  if (_al) return null;
  if (!_au) return <AuthGate />;

  return (
    <main className="main-content">
      <div className="tracker-page">

        {/* ── Page Header ── */}
        <div className="el-page-head">
          <div>
            <h1 className="kategorie-title">Einkaufsliste</h1>
            <p className="tracker-sub">{totalCnt === 0 ? 'Noch leer' : `${doneCnt} von ${totalCnt} erledigt`}</p>
          </div>
          <div className="el-head-actions">
            {doneCnt > 0 && <button onClick={clearDone} className="el-btn-ghost">Erledigte löschen</button>}
            {totalCnt > 0 && <button onClick={clearAll}  className="el-btn-ghost el-btn-danger">Alles löschen</button>}
          </div>
        </div>

        {/* ── Nährwert-Summary ── */}
        {totalCnt > 0 && (
          <div className="el-summary-bar">
            <div className="el-summary-label">Gesamt (ausstehend)</div>
            <div className="el-summary-chips">
              <span className="el-chip el-chip-kcal">🔥 {summary.kcal} kcal</span>
              <span className="el-chip el-chip-pro">💪 {summary.pro} g Protein</span>
              <span className="el-chip el-chip-kh">🌾 {summary.kh} g KH</span>
              <span className="el-chip el-chip-fett">🫒 {summary.fett} g Fett</span>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="el-tabs">
          {[['liste','🛒 Liste'],['produkte','🔍 Produkte'],['plan','📋 Aus Plan']].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)} className={`el-tab${tab===v?' active':''}`}>{l}</button>
          ))}
        </div>

        {/* ══ TAB: Liste ══════════════════════════════════════════════════════ */}
        {tab === 'liste' && (
          <div className="el-section">
            {/* Schnell-hinzufügen */}
            <form onSubmit={addCustom} className="el-quick-add">
              <input
                className="el-quick-input"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Eigenes Produkt hinzufügen…"
              />
              <button type="submit" className="el-btn-primary">+</button>
            </form>

            {totalCnt === 0 ? (
              <div className="el-empty">
                <span>🛒</span>
                <p>Deine Einkaufsliste ist leer.</p>
                <button onClick={() => setTab('produkte')} className="el-btn-primary el-btn-big">
                  Produkte durchsuchen →
                </button>
              </div>
            ) : (
              Object.entries(grouped).map(([kat, katItems]) => (
                <div key={kat} className="el-group">
                  <div className="el-group-title">
                    {KAT_EMOJI[kat] || '📦'} {kat}
                    <span className="el-group-count">{katItems.length}</span>
                  </div>
                  {katItems.map(item => {
                    const nw = itemNaehrwerte(item);
                    return (
                      <div key={item.id} className={`el-item${item.erledigt ? ' done' : ''}`}>
                        <button onClick={() => toggle(item.id)} className="el-check">
                          {item.erledigt ? '✓' : ''}
                        </button>
                        <div className="el-item-body">
                          <div className="el-item-top">
                            <span className="el-item-emoji">{item.emoji}</span>
                            <span className="el-item-name">{item.name}</span>
                            {item.vonPlan && <span className="el-plan-badge">📋 {item.vonPlan}</span>}
                          </div>
                          {nw.kcal > 0 && (
                            <div className="el-item-nw">
                              <span>🔥 {nw.kcal} kcal</span>
                              <span>💪 {nw.pro}g</span>
                              <span>🌾 {nw.kh}g</span>
                              <span>🫒 {nw.fett}g</span>
                            </div>
                          )}
                        </div>
                        <div className="el-item-menge">
                          <button onClick={() => setMenge(item.id, item.menge - (item.einheit === 'g' || item.einheit === 'ml' ? 50 : 1))} className="el-menge-btn">−</button>
                          <span className="el-menge-val">{item.menge} <small>{item.einheit}</small></span>
                          <button onClick={() => setMenge(item.id, item.menge + (item.einheit === 'g' || item.einheit === 'ml' ? 50 : 1))} className="el-menge-btn">+</button>
                        </div>
                        <button onClick={() => remove(item.id)} className="el-item-del">✕</button>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {/* ══ TAB: Produkte ═══════════════════════════════════════════════════ */}
        {tab === 'produkte' && (
          <div className="el-section">
            <input
              className="el-search"
              value={sucheQ}
              onChange={e => setSucheQ(e.target.value)}
              placeholder="🔍  Produkt suchen…"
            />
            <div className="el-kat-filter">
              {['Alle', ...KATEGORIEN].map(k => (
                <button key={k} onClick={() => setAktivKat(k)} className={`el-kat-btn${aktivKat===k?' active':''}`}>
                  {KAT_EMOJI[k] || ''} {k}
                </button>
              ))}
            </div>
            <div className="el-produkt-grid">
              {filteredProds.map(p => {
                const isAdded = addedIds.has(p.id);
                const nwPro = rnd(p.kcal * p.g / 100);
                return (
                  <div key={p.id} className="el-produkt-card">
                    <div className="el-produkt-emoji">{p.emoji}</div>
                    <div className="el-produkt-name">{p.name}</div>
                    <div className="el-produkt-nw">
                      <span className="el-nw-kcal">🔥 {nwPro} kcal</span>
                      <span>💪 {rnd(p.pro * p.g / 100)}g</span>
                      <span>🌾 {rnd(p.kh * p.g / 100)}g</span>
                      <span>🫒 {rnd(p.fett * p.g / 100)}g</span>
                    </div>
                    <div className="el-produkt-einheit">pro {p.einheit === 'g' || p.einheit === 'ml' ? '100 ' + p.einheit : p.einheit}</div>
                    <button
                      onClick={() => { addProdukt(p); }}
                      className={`el-produkt-add${isAdded ? ' added' : ''}`}
                    >
                      {isAdded ? '✓ Hinzugefügt' : '+ Zur Liste'}
                    </button>
                  </div>
                );
              })}
              {filteredProds.length === 0 && (
                <div className="el-empty" style={{gridColumn:'1/-1'}}>
                  <span>🔍</span>
                  <p>Keine Produkte gefunden.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: Aus Plan ═══════════════════════════════════════════════════ */}
        {tab === 'plan' && (
          <div className="el-section">
            {!aktivPlan ? (
              <div className="el-empty">
                <span>📋</span>
                <p>Kein aktiver Ernährungsplan gefunden.</p>
                <p style={{fontSize:'0.875rem',color:'var(--text-muted)',marginTop:4}}>
                  Aktiviere einen Ernährungsplan unter <strong>Pläne → Mein Ernährungsplan</strong>.
                </p>
              </div>
            ) : (
              <>
                <div className="el-plan-header">
                  <span>📋</span>
                  <div>
                    <div className="el-plan-name">{aktivPlan.titel}</div>
                    <div className="el-plan-sub">Mahlzeiten zur Einkaufsliste hinzufügen</div>
                  </div>
                </div>

                {aktivPlan.tage?.map((tag, ti) => (
                  <div key={ti} className="el-plan-day">
                    <div className="el-plan-day-title">
                      {tag.wochentag || tag.name}
                    </div>
                    {(tag.mahlzeiten || []).map((meal, mi) => {
                      const key = `${meal.name}-${meal.typ}`;
                      const isAdded = addedIds.has(key);
                      return (
                        <div key={mi} className="el-plan-meal">
                          <div className="el-plan-meal-info">
                            <span className="el-plan-meal-typ">{meal.typ}</span>
                            <span className="el-plan-meal-name">{meal.name}</span>
                            <div className="el-plan-meal-nw">
                              {meal.kalorien > 0 && <span>🔥 {meal.kalorien} kcal</span>}
                              {meal.protein  > 0 && <span>💪 {meal.protein}g P</span>}
                              {meal.kohlenhydrate > 0 && <span>🌾 {meal.kohlenhydrate}g KH</span>}
                              {meal.fett     > 0 && <span>🫒 {meal.fett}g F</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => addMahlzeit(meal, aktivPlan.titel)}
                            className={`el-plan-add-btn${isAdded?' added':''}`}
                            disabled={isAdded}
                          >
                            {isAdded ? '✓' : '+'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Alle auf einmal */}
                <button
                  onClick={() => {
                    aktivPlan.tage?.forEach(tag =>
                      (tag.mahlzeiten || []).forEach(meal => addMahlzeit(meal, aktivPlan.titel))
                    );
                  }}
                  className="el-btn-primary el-btn-big"
                  style={{width:'100%',marginTop:8}}
                >
                  Alle Mahlzeiten hinzufügen
                </button>
              </>
            )}
          </div>
        )}

      </div>

      <style>{CSS}</style>
    </main>
  );
}

/* ── CSS ── */
const CSS = `
.el-page-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap;}
.el-head-actions{display:flex;gap:8px;flex-wrap:wrap;}
.el-btn-ghost{padding:6px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);background:transparent;color:var(--text-muted);font-size:.8125rem;font-weight:500;cursor:pointer;font-family:inherit;transition:background .15s;}
.el-btn-ghost:hover{background:var(--bg-card-hover);color:var(--text);}
.el-btn-danger{color:#ef4444;border-color:rgba(239,68,68,.3);}
.el-btn-danger:hover{background:rgba(239,68,68,.08)!important;color:#ef4444;}

.el-summary-bar{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.el-summary-label{font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;}
.el-summary-chips{display:flex;gap:8px;flex-wrap:wrap;}
.el-chip{padding:4px 10px;border-radius:20px;font-size:.8rem;font-weight:600;white-space:nowrap;}
.el-chip-kcal{background:rgba(239,68,68,.12);color:#ef4444;}
.el-chip-pro{background:rgba(107,175,126,.15);color:#6BAF7E;}
.el-chip-kh{background:rgba(245,158,11,.12);color:#f59e0b;}
.el-chip-fett{background:rgba(107,175,126,.1);color:#6BAF7E;}

.el-tabs{display:flex;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:20px;}
.el-tab{flex:1;padding:10px 8px;border:none;border-right:1px solid var(--border);background:var(--bg-card);color:var(--text-muted);font-size:.875rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s;}
.el-tab:last-child{border-right:none;}
.el-tab:hover{background:var(--bg-card-hover);color:var(--text);}
.el-tab.active{background:var(--accent);color:#fff;}

.el-section{display:flex;flex-direction:column;gap:12px;}

.el-quick-add{display:flex;gap:8px;}
.el-quick-input{flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:.9375rem;font-family:inherit;transition:border-color .15s;}
.el-quick-input:focus{outline:none;border-color:var(--accent);}
.el-btn-primary{padding:10px 16px;border:none;border-radius:var(--radius-sm);background:var(--accent);color:#fff;font-size:.9rem;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity .15s;white-space:nowrap;}
.el-btn-primary:hover{opacity:.88;}
.el-btn-big{padding:13px 20px;font-size:.9375rem;}

.el-empty{text-align:center;padding:40px 20px;display:flex;flex-direction:column;align-items:center;gap:10px;}
.el-empty span{font-size:2.5rem;}
.el-empty p{color:var(--text-muted);font-size:.9375rem;}

.el-group{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}
.el-group-title{padding:10px 16px;font-size:.8125rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg);}
.el-group-count{background:var(--border);border-radius:10px;padding:1px 7px;font-size:.75rem;color:var(--text-muted);}

.el-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);transition:background .1s;}
.el-item:last-child{border-bottom:none;}
.el-item:hover{background:var(--bg-card-hover);}
.el-item.done{opacity:.45;}
.el-item.done .el-item-name{text-decoration:line-through;}

.el-check{width:22px;height:22px;border:2px solid var(--border);border-radius:50%;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#fff;flex-shrink:0;transition:all .15s;font-family:inherit;}
.el-item.done .el-check{background:var(--accent);border-color:var(--accent);}
.el-check:hover{border-color:var(--accent);}

.el-item-body{flex:1;min-width:0;}
.el-item-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.el-item-emoji{font-size:1.1rem;flex-shrink:0;}
.el-item-name{font-size:.9375rem;font-weight:600;color:var(--text);}
.el-plan-badge{font-size:.7rem;background:rgba(167,136,250,.15);color:#A788FA;border-radius:10px;padding:1px 7px;font-weight:600;}
.el-item-nw{display:flex;gap:8px;margin-top:3px;flex-wrap:wrap;}
.el-item-nw span{font-size:.75rem;color:var(--text-muted);}

.el-item-menge{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.el-menge-btn{width:24px;height:24px;border:1px solid var(--border);border-radius:50%;background:var(--bg);color:var(--text);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:background .15s;}
.el-menge-btn:hover{background:var(--bg-card-hover);}
.el-menge-val{font-size:.8125rem;font-weight:600;color:var(--text);white-space:nowrap;text-align:center;min-width:52px;}
.el-menge-val small{font-weight:400;color:var(--text-muted);font-size:.7rem;}
.el-item-del{width:24px;height:24px;border:none;border-radius:50%;background:transparent;color:var(--text-muted);font-size:.75rem;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:all .15s;flex-shrink:0;}
.el-item-del:hover{background:rgba(239,68,68,.12);color:#ef4444;}

/* Produkte */
.el-search{width:100%;padding:11px 16px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:.9375rem;font-family:inherit;transition:border-color .15s;box-sizing:border-box;}
.el-search:focus{outline:none;border-color:var(--accent);}
.el-kat-filter{display:flex;gap:6px;flex-wrap:wrap;}
.el-kat-btn{padding:5px 12px;border:1px solid var(--border);border-radius:20px;background:var(--bg-card);color:var(--text-muted);font-size:.8rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;}
.el-kat-btn:hover{background:var(--bg-card-hover);color:var(--text);}
.el-kat-btn.active{background:var(--accent);border-color:var(--accent);color:#fff;}
.el-produkt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;}
.el-produkt-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 14px;display:flex;flex-direction:column;align-items:center;gap:8px;transition:border-color .15s,box-shadow .15s;text-align:center;}
.el-produkt-card:hover{border-color:var(--accent);box-shadow:0 4px 16px rgba(0,0,0,.12);}
.el-produkt-emoji{font-size:2rem;line-height:1;}
.el-produkt-name{font-size:.875rem;font-weight:700;color:var(--text);}
.el-produkt-nw{display:flex;flex-direction:column;gap:2px;width:100%;}
.el-produkt-nw span{font-size:.72rem;color:var(--text-muted);}
.el-nw-kcal{color:var(--text)!important;font-weight:600!important;font-size:.8rem!important;}
.el-produkt-einheit{font-size:.7rem;color:var(--text-muted);font-style:italic;}
.el-produkt-add{width:100%;padding:7px 10px;border:1px solid var(--accent);border-radius:var(--radius-sm);background:transparent;color:var(--accent);font-size:.8125rem;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;margin-top:auto;}
.el-produkt-add:hover{background:var(--accent);color:#fff;}
.el-produkt-add.added{background:var(--accent);color:#fff;border-color:var(--accent);opacity:.7;cursor:default;}

/* Plan */
.el-plan-header{display:flex;align-items:center;gap:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;}
.el-plan-header>span{font-size:1.75rem;}
.el-plan-name{font-size:1rem;font-weight:700;color:var(--text);}
.el-plan-sub{font-size:.8125rem;color:var(--text-muted);margin-top:2px;}
.el-plan-day{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}
.el-plan-day-title{padding:10px 16px;font-size:.8125rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;background:var(--bg);border-bottom:1px solid var(--border);}
.el-plan-meal{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);transition:background .1s;}
.el-plan-meal:last-child{border-bottom:none;}
.el-plan-meal:hover{background:var(--bg-card-hover);}
.el-plan-meal-info{flex:1;min-width:0;}
.el-plan-meal-typ{font-size:.72rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:2px;}
.el-plan-meal-name{font-size:.9375rem;font-weight:600;color:var(--text);}
.el-plan-meal-nw{display:flex;gap:8px;margin-top:3px;flex-wrap:wrap;}
.el-plan-meal-nw span{font-size:.75rem;color:var(--text-muted);}
.el-plan-add-btn{width:32px;height:32px;border:2px solid var(--accent);border-radius:50%;background:transparent;color:var(--accent);font-size:1.1rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:all .15s;flex-shrink:0;}
.el-plan-add-btn:hover:not(:disabled){background:var(--accent);color:#fff;}
.el-plan-add-btn.added{background:var(--accent);color:#fff;cursor:default;}
.el-plan-add-btn:disabled{opacity:.6;cursor:default;}

@media(max-width:640px){
  .el-produkt-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;}
  .el-summary-bar{flex-direction:column;align-items:flex-start;gap:8px;}
  .el-item{gap:8px;}
  .el-menge-val{min-width:44px;}
}
`;
