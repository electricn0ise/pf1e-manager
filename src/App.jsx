// src/App.jsx
import { useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, doc, getDocs, setDoc, deleteDoc, query, orderBy,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { AuthScreen } from "./AuthScreens";

// ─── Il wizard di creazione personaggio è importato dal file separato
// Per ora includiamo tutto qui per semplicità di distribuzione.
// Se preferisci, puoi spostare RACES, CLASSES, ecc. in un file data.js separato.

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg0:"#181c1f", bg1:"#1f2428", bg2:"#272d32", bg3:"#2f363c",
  border:"#363e45", borderHover:"#4e5a62",
  accent:"#c87050", accentDim:"#7a4432",
  accentBg:"rgba(200,112,80,0.10)", accentHover:"rgba(200,112,80,0.16)",
  textPrimary:"#eceef0", textSecondary:"#8e9ba6",
  textMuted:"#55646e", textDisabled:"#333d44",
  danger:"#c84848", dangerBg:"rgba(200,72,72,0.12)",
  success:"#56a872", successBg:"rgba(86,168,114,0.12)",
  info:"#5a96cc", infoBg:"rgba(90,150,204,0.12)",
  fontDisplay:"'Cormorant','Palatino Linotype',Georgia,serif",
  fontBody:"'DM Sans','Segoe UI',system-ui,sans-serif",
  r4:4, r6:6, r8:8, r12:12,
  tr:"all 0.18s ease",
};

// ─── FIRESTORE HELPERS ────────────────────────────────────────────────────────
function userCharsRef(userId) {
  return collection(db, "users", userId, "characters");
}
async function loadUserChars(userId) {
  const q = query(userCharsRef(userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function saveChar(userId, char) {
  const ref = doc(userCharsRef(userId), char.id);
  await setDoc(ref, char);
}
async function deleteChar(userId, charId) {
  await deleteDoc(doc(userCharsRef(userId), charId));
}

// ─────────────────────────────────────────────────────────────────────────────
// PF1E DATA (identico al file precedente — incollato qui per avere un
// singolo App.jsx autosufficiente)
// ─────────────────────────────────────────────────────────────────────────────

const BOOKS = {
  CRB: { id:"CRB", name:"Core Rulebook",         abbr:"CRB", required:true,  color:"#c87050" },
  APG: { id:"APG", name:"Advanced Player's Guide",abbr:"APG", required:false, color:"#5a96cc" },
  UM:  { id:"UM",  name:"Ultimate Magic",          abbr:"UM",  required:false, color:"#9a6cc8" },
  UC:  { id:"UC",  name:"Ultimate Combat",         abbr:"UC",  required:false, color:"#c84848" },
  ARG: { id:"ARG", name:"Advanced Race Guide",     abbr:"ARG", required:false, color:"#56a872" },
  ACG: { id:"ACG", name:"Advanced Class Guide",    abbr:"ACG", required:false, color:"#c8a050" },
};
const PB_COST = { 7:-4, 8:-2, 9:-1, 10:0, 11:1, 12:2, 13:3, 14:5, 15:7, 16:10, 17:13, 18:17 };
const PB_POOLS = { "Fantasy Bassa (10)":10, "Fantasy Standard (15)":15, "Fantasy Alta (20)":20, "Fantasy Epica (25)":25 };
const STANDARD_ARRAY = [15,14,13,12,10,8];
const ALIGNMENTS = [
  {v:"LG",l:"Legale Buono"},{v:"NG",l:"Neutrale Buono"},{v:"CG",l:"Caotico Buono"},
  {v:"LN",l:"Legale Neutrale"},{v:"N",l:"Neutrale"},{v:"CN",l:"Caotico Neutrale"},
  {v:"LE",l:"Legale Malvagio"},{v:"NE",l:"Neutrale Malvagio"},{v:"CE",l:"Caotico Malvagio"},
];
const DEITIES = ["Nessuno","Abadar","Asmodeus","Cayden Cailean","Desna","Erastil","Gorum","Gozreh","Iomedae","Irori","Lamashtu","Nethys","Norgorber","Pharasma","Rovagug","Sarenrae","Shelyn","Torag","Urgathoa","Zon-Kuthon"];
const STAT_KEYS   = ["STR","DEX","CON","INT","WIS","CHA"];
const STAT_LABELS = { STR:"Forza", DEX:"Destrezza", CON:"Costituzione", INT:"Intelligenza", WIS:"Saggezza", CHA:"Carisma" };
const STAT_SHORT  = { STR:"For", DEX:"Des", CON:"Cos", INT:"Int", WIS:"Sag", CHA:"Car" };

const RACES = {
  Umano:{book:"CRB",size:"Medio",speed:30,vision:"Normale",mods:{},freeBoost:1,flavorText:"La razza più diffusa e ambiziosa di Golarion. La loro straordinaria adattabilità si riflette in un talento bonus e un grado di abilità extra per livello.",traits:["Talento Bonus — ottengono un talento aggiuntivo al 1° livello","Abilità Extra — +1 grado di abilità per ogni livello","Lingue Bonus — una lingua aggiuntiva per ogni punto di modificatore di INT"],classAdvice:"Perfetti per qualsiasi classe. Il talento extra è particolarmente prezioso per Mago o Chierico."},
  Nano:{book:"CRB",size:"Medio",speed:20,vision:"Vista Oscura 60 ft",mods:{CON:2,WIS:2,CHA:-2},freeBoost:0,flavorText:"Custodi delle antiche fortezze di montagna, forgiati da secoli di guerra contro orchi e goblin. La Vista Oscura e la resistenza ai veleni riflettono una vita trascorsa nelle profondità della terra.",traits:["+2 Tempra vs Veleni","+4 CMD contro Spingere e Sgambettare","Abilità di Pietra — Percezione +2 per strutture anomale","Odio Orchi/Goblinoidi — +1 ai tiri per colpire","Resistenza Nanica — +2 TS contro incantesimi e SLA"],classAdvice:"Ottimi Guerrieri, Chierici e Inquisitori. COS+2 e SAG+2 massimizzano PF e CD degli incantesimi divini."},
  Elfo:{book:"CRB",size:"Medio",speed:30,vision:"Vista Crepuscolare",mods:{DEX:2,INT:2,CON:-2},freeBoost:0,flavorText:"Esseri longevi e raffinati con una connessione innata alla magia arcana. Vivono tanto a lungo da sviluppare prospettive profondamente diverse da quelle delle razze mortali.",traits:["Immunità al Sonno Magico","Resistenza all'Incantamento — +2 ai TS vs Ammaliamento","Sensi Acuti — +2 Percezione","Magia Elfica — +2 Conoscenze Magiche","Familiarità con le Armi Elfiche"],classAdvice:"Eccellenti Maghi e Stregoni. INT+2 e DEX+2 ideali per arcanisti e arcieri. CON-2 richiede attenzione."},
  Gnomo:{book:"CRB",size:"Piccolo",speed:20,vision:"Vista Crepuscolare",mods:{CON:2,CHA:2,STR:-2},freeBoost:0,flavorText:"Eccentrici emigranti del Piano Fatato. La loro vivace personalità e curiosità insaziabile mascherano un'anima che teme il grigiore dell'esistenza ordinaria.",traits:["Magia Gnoma — Danza delle Luci, Suono Fantasma, Prestidigitazione 1/giorno","Resistenza alle Illusioni — +2 TS vs illusioni","+1 CD alle proprie illusioni","Senso del Pericolo — +4 schivata vs Giganti","Sensi Acuti — +2 Percezione"],classAdvice:"Ottimi Stregoni (lignaggio Fatato), Illusionisti e Alchimisti. CHA+2 e CON+2 inusuali ma potenti."},
  Halfling:{book:"CRB",size:"Piccolo",speed:20,vision:"Vista Crepuscolare",mods:{DEX:2,CHA:2,STR:-2},freeBoost:0,flavorText:"Piccoli ma sorprendentemente tenaci, benedetti da una fortuna proverbiale che li ha aiutati a sopravvivere in un mondo fatto per persone più grandi.",traits:["Fortunato — +1 a tutti i Tiri Salvezza","Coraggio — +2 TS vs paura","Mira con i Proiettili — +1 attacchi con armi da lancio","Sensi Acuti — +2 Acrobazia, Arrampicata, Percezione"],classAdvice:"Ottimi Ladri, Ranger e Bardi. DEX+2 fondamentale. Il bonus fortuna a tutti i TS li rende resilienti."},
  Mezzorco:{book:"CRB",size:"Medio",speed:30,vision:"Vista Oscura 60 ft",mods:{},freeBoost:1,flavorText:"Nati dall'unione tra umani e orchi, portano il peso di entrambi i mondi. Spesso emarginati, molti diventano avventurieri per trovare uno scopo.",traits:["Ferocità Orchesca — sopravvivono 1 round a 0 PF","Sangue Orco — contano come orchi","Familiarità con le Armi Orche","Intimidire — +2"],classAdvice:"Eccellenti Barbari e Guerrieri. +2 libero in FOR massimizza il danno. La Ferocità li rende difficili da abbattere."},
  Mezzelfo:{book:"CRB",size:"Medio",speed:30,vision:"Vista Crepuscolare",mods:{},freeBoost:1,flavorText:"Camminano tra due mondi senza appartenere completamente a nessuno. Questa solitudine ha forgiato una straordinaria capacità di adattamento.",traits:["Adattabilità — Skill Focus bonus al 1° livello","Immunità al Sonno Magico","Resistenza all'Incantamento — +2 TS vs Ammaliamento","Sangue Elfico — contano sia umani che elfi","Due Classi Preferite","Sensi Acuti — +2 Percezione"],classAdvice:"Versatili come gli umani con bonus difensivi elfici. Due classi preferite ideali per multiclasse."},
  Aasimar:{book:"ARG",size:"Medio",speed:30,vision:"Vista Oscura 60 ft",mods:{WIS:2,CHA:2},freeBoost:0,flavorText:"Discendenti lontani di creature celesti, irradiano una bontà quasi soprannaturale. La loro grazia innata li rende facilmente riconoscibili.",traits:["Resistenza Elementale — Acido, Freddo ed Elettricità 5","Luce come SLA 1/giorno","Individuare il Male 1/giorno","Resistenza agli effetti negativi — +2 TS"],classAdvice:"Perfetti per Paladino, Chierico e Oracolo (Vita). SAG+2 e CHA+2 chiave per incantatori divini."},
  Tiefling:{book:"ARG",size:"Medio",speed:30,vision:"Vista Oscura 60 ft",mods:{DEX:2,INT:2,CHA:-2},freeBoost:0,flavorText:"Portatori del sangue corrotto dei piani infernali, lottano quotidianamente contro i pregiudizi. La loro intelligenza e agilità sono strumenti di sopravvivenza.",traits:["Resistenza Elementale — Freddo, Elettricità e Fuoco 5","Oscurità come SLA 1/giorno","Ingannare e Furtività come abilità di classe","Resistenza agli Incantesimi — +2 TS"],classAdvice:"Eccellenti Maghi, Stregoni (lignaggio Infernale) e Inquisitori. DEX+2 e INT+2 ottimi. CHA-2 penalizza i Bardi."},
  Tengu:{book:"ARG",size:"Medio",speed:30,vision:"Vista Crepuscolare",mods:{DEX:2,WIS:2,CON:-2},freeBoost:0,flavorText:"Umanoidi corvini dall'intelletto affilato, maestri delle armi e dei linguaggi. La curiosità innata e il talento per l'imitazione li rende eccellenti in molti campi.",traits:["Morso 1d3 (arma naturale primaria)","Abilità di Spada — 3 armi con lama come armi di classe","Linguista — +2 Linguistica, lingua aggiuntiva","Sensi Acuti — +2 Percezione"],classAdvice:"Ottimi Ranger, Ladri e Monaco. DEX+2 e SAG+2 utili per molte build."},
  Kitsune:{book:"ARG",size:"Medio",speed:30,vision:"Vista Crepuscolare",mods:{DEX:2,CHA:2,STR:-2},freeBoost:0,flavorText:"Spiriti volpe con la capacità di assumere forma umana. Nella cultura di Tian Xia sono venerati e temuti, ritenuti messaggeri degli spiriti.",traits:["Cambiaforma — forma umana a volontà","Magia del Kitsune — SLA in base al livello","Sensi Acuti — +2 Percezione"],classAdvice:"Ottimi Stregoni, Bardi e Maghi. CHA+2 e DEX+2. STR-2 penalizza in corpo a corpo diretto."},
  Rattoide:{book:"ARG",size:"Piccolo",speed:20,vision:"Vista Oscura 60 ft",mods:{DEX:2,INT:2,STR:-2},freeBoost:0,flavorText:"Piccoli umanoidi roditori con intelligenza acuta e spirito commerciale senza pari. Costruiscono vaste reti sia in superficie che nelle profondità.",traits:["Ammassarsi — +2 attacco se alleato adiacente al nemico","Sensi Acuti — +2 Percezione e Sopravvivenza per tracce","Nuoto 30 ft"],classAdvice:"Ottimi Alchimisti e Investigatori. INT+2 e DEX+2 ideali per classi tecniche. Taglia Piccola dona bonus CA."},
  Silfide:{book:"ARG",size:"Medio",speed:30,vision:"Vista Oscura 60 ft",mods:{DEX:2,INT:2,CON:-2},freeBoost:0,flavorText:"Discendenti di elementali dell'aria, eterei e sfuggenti con un legame innato ai venti. La natura aerea si riflette nei poteri e nella personalità incostante.",traits:["Resistenza al Fulmine 5","Levitazione come SLA 1/giorno","Senso Eolio — +2 Percezione, nessuna penalità dal vento"],classAdvice:"Ottimi Maghi e Stregoni (lignaggio Elementale). DEX+2 e INT+2. CON-2 richiede attenzione ai PF."},
};

const SKILLS_DATA = [
  {key:"Acrobazia",stat:"DEX",trainedOnly:false},{key:"Valutare",stat:"INT",trainedOnly:false},
  {key:"Ingannare",stat:"CHA",trainedOnly:false},{key:"Scalare",stat:"STR",trainedOnly:false},
  {key:"Artigianato",stat:"INT",trainedOnly:false},{key:"Diplomazia",stat:"CHA",trainedOnly:false},
  {key:"Disattivare Congegni",stat:"DEX",trainedOnly:true},{key:"Travestirsi",stat:"CHA",trainedOnly:false},
  {key:"Liberarsi",stat:"DEX",trainedOnly:false},{key:"Volare",stat:"DEX",trainedOnly:false},
  {key:"Domare Animali",stat:"CHA",trainedOnly:true},{key:"Guarire",stat:"WIS",trainedOnly:false},
  {key:"Intimidire",stat:"CHA",trainedOnly:false},{key:"Conoscenze (Arcano)",stat:"INT",trainedOnly:true},
  {key:"Conoscenze (Dungeon)",stat:"INT",trainedOnly:true},{key:"Conoscenze (Ingegneria)",stat:"INT",trainedOnly:true},
  {key:"Conoscenze (Geografica)",stat:"INT",trainedOnly:true},{key:"Conoscenze (Storia)",stat:"INT",trainedOnly:true},
  {key:"Conoscenze (Locale)",stat:"INT",trainedOnly:true},{key:"Conoscenze (Natura)",stat:"INT",trainedOnly:true},
  {key:"Conoscenze (Nobiltà)",stat:"INT",trainedOnly:true},{key:"Conoscenze (Piani)",stat:"INT",trainedOnly:true},
  {key:"Conoscenze (Religione)",stat:"INT",trainedOnly:true},{key:"Linguistica",stat:"INT",trainedOnly:true},
  {key:"Percezione",stat:"WIS",trainedOnly:false},{key:"Esibizione",stat:"CHA",trainedOnly:false},
  {key:"Professione",stat:"WIS",trainedOnly:true},{key:"Cavalcare",stat:"DEX",trainedOnly:false},
  {key:"Percepire le Intenzioni",stat:"WIS",trainedOnly:false},{key:"Borseggiare",stat:"DEX",trainedOnly:true},
  {key:"Conoscenze Magiche",stat:"INT",trainedOnly:true},{key:"Furtività",stat:"DEX",trainedOnly:false},
  {key:"Sopravvivenza",stat:"WIS",trainedOnly:false},{key:"Nuotare",stat:"STR",trainedOnly:false},
  {key:"Usare Oggetti Magici",stat:"CHA",trainedOnly:true},
];

const CLASSES = {
  Barbaro:{book:"CRB",hd:12,bab:"full",saves:{fort:"good",ref:"poor",will:"poor"},skills:4,spellcaster:false,keyAbility:"STR",alignment:["NG","CG","LN","N","CN","NE","CE"],alignNote:"Qualsiasi non Legale",classSkills:["Acrobazia","Scalare","Artigianato","Domare Animali","Intimidire","Conoscenze (Natura)","Percezione","Cavalcare","Sopravvivenza","Nuotare"],flavorText:"Alcuni combattono con disciplina. Il Barbaro combatte con furia pura.",description:"Il Barbaro attinge a una riserva di rabbia primordiale per abbattere i nemici con brutalità devastante. L'Ira (+4 FOR/COS, +2 TS Volontà, -2 CA) dura pochi round — il Barbaro deve essere aggressivo e chiudere rapidamente. I Poteri d'Ira ogni 2 livelli definiscono lo stile di gioco.",features:["Ira (Ex) — +4 FOR, +4 COS, +2 TS Volontà, -2 CA. Dura 4+mod.COS round/giorno","Velocità Rapida (Ex) — +10 ft in armatura leggera o senza","Rilevare Trappole al 2° livello","Riflessi Incombenti al 2° livello","Potere d'Ira ogni 2 livelli"],tip:"💡 FOR alta priorità, CON allunga l'Ira. Evita armature pesanti."},
  Bardo:{book:"CRB",hd:8,bab:"3/4",saves:{fort:"poor",ref:"good",will:"good"},skills:6,spellcaster:true,spellStat:"CHA",spellType:"arcano",castingType:"spontaneo",keyAbility:"CHA",classSkills:["Acrobazia","Valutare","Ingannare","Scalare","Artigianato","Diplomazia","Liberarsi","Volare","Guarire","Intimidire","Conoscenze (Arcano)","Conoscenze (Dungeon)","Conoscenze (Ingegneria)","Conoscenze (Geografica)","Conoscenze (Storia)","Conoscenze (Locale)","Conoscenze (Natura)","Conoscenze (Nobiltà)","Conoscenze (Piani)","Conoscenze (Religione)","Linguistica","Percezione","Esibizione","Cavalcare","Percepire le Intenzioni","Borseggiare","Conoscenze Magiche","Furtività","Usare Oggetti Magici"],flavorText:"Il maestro del talento universale: sa fare un po' di tutto.",description:"Il Bardo unisce magia arcana spontanea, supporto con la Rappresentazione Bardica, eccellenti abilità e buon combattimento. L'Ispirazione Eroica fornisce +1 ai tiri per colpire e danni a tutti gli alleati — una delle capacità di supporto più forti del gioco.",features:["Rappresentazione Bardica — Ispirazione Eroica, Controcanto, Distrazione, Affascinare, ecc.","Sapere Bardico — ½ livello + INT alle Conoscenze senza addestramento","Competenza Universale — usa tutte le abilità anche Solo Addestrate"],tip:"💡 CHA alta per CD e Rappresentazione. Considera Perform (Canto) per l'area d'effetto."},
  Chierico:{book:"CRB",hd:8,bab:"3/4",saves:{fort:"good",ref:"poor",will:"good"},skills:2,spellcaster:true,spellStat:"WIS",spellType:"divino",castingType:"preparato",keyAbility:"WIS",classSkills:["Valutare","Artigianato","Diplomazia","Guarire","Conoscenze (Arcano)","Conoscenze (Storia)","Conoscenze (Nobiltà)","Conoscenze (Piani)","Conoscenze (Religione)","Linguistica","Professione","Percepire le Intenzioni","Conoscenze Magiche"],flavorText:"Guaritore, combattente o arcanista: dipende da come lo costruisci.",description:"Il Chierico prepara incantesimi divini da una delle liste più ampie del gioco. I due Domini scelti forniscono capacità uniche e incantesimi bonus. Un Chierico di Guerra compete col Guerriero; uno di Conoscenza eguaglia il Mago in versatilità.",features:["Canalizzare Energia — 2d6, 3+mod.CHA/giorno, area 30 ft","Domini — 2 domini della propria divinità, con poteri e incantesimi bonus","Incantesimi Spontanei — sacrifica slot per Cura/Infliggi Ferite"],tip:"💡 SAG alta controlla CD e numero di slot. Scegli i domini in base al ruolo desiderato."},
  Druido:{book:"CRB",hd:8,bab:"3/4",saves:{fort:"good",ref:"poor",will:"good"},skills:4,spellcaster:true,spellStat:"WIS",spellType:"divino",castingType:"preparato",keyAbility:"WIS",classSkills:["Scalare","Artigianato","Volare","Domare Animali","Guarire","Conoscenze (Geografica)","Conoscenze (Natura)","Percezione","Cavalcare","Conoscenze Magiche","Sopravvivenza","Nuotare"],flavorText:"Il guardiano dell'equilibrio naturale. Quando si trasforma in orso, la filosofia passa in secondo piano.",description:"Incantatore divino con magia potente focalizzata sulla natura, più Forma Selvatica dal 4° livello: trasformazione in animali con tutti i loro attributi fisici. La scelta del Legame definisce lo stile: Compagno Animale o Dominio Naturale.",features:["Legame con la Natura — Compagno Animale (pieno avanzamento) o Dominio Naturale","Empatia Selvaggia — influenza animali come Diplomazia","Passo nel Bosco — nessuna penalità su terreno naturale difficile","Forma Selvatica — al 4° livello, si trasforma in animale"],tip:"💡 Nessuna armatura metallica. Pianifica la Forma Selvatica: la FOR dell'animale sostituisce la tua."},
  Guerriero:{book:"CRB",hd:10,bab:"full",saves:{fort:"good",ref:"poor",will:"poor"},skills:2,spellcaster:false,keyAbility:"STR",classSkills:["Scalare","Artigianato","Domare Animali","Intimidire","Conoscenze (Dungeon)","Conoscenze (Ingegneria)","Cavalcare","Percezione","Conoscenze Magiche","Nuotare"],flavorText:"Nessuna classe padroneggia armi e armature come il Guerriero.",description:"Il Guerriero ottiene un Talento da Combattimento Bonus al 1° e ogni livello pari — il doppio dei talenti di qualsiasi altra classe. L'Addestramento con l'Armatura e con le Armi a certi livelli riduce penalità e aumenta bonus. Specializzati in uno stile e diventerete una macchina da guerra inarrestabile.",features:["Talento da Combattimento Bonus — al 1° e ogni livello pari","Coraggio — +1 TS vs paura ogni 4 livelli; immunità al 14°","Addestramento con l'Armatura — al 3°, 7°, 11°, 15° livello","Addestramento con le Armi — al 5°, 9°, 13°, 17° livello"],tip:"💡 Scegli uno stile e costruisci attorno ad esso. Con 2 gradi di abilità, usa la Classe Preferita per gradi extra."},
  Monaco:{book:"CRB",hd:8,bab:"3/4",saves:{fort:"good",ref:"good",will:"good"},skills:4,spellcaster:false,keyAbility:"STR",alignment:["LG","LN","LE"],alignNote:"Solo Legale",classSkills:["Acrobazia","Artigianato","Liberarsi","Conoscenze (Storia)","Conoscenze (Religione)","Percezione","Esibizione","Cavalcare","Percepire le Intenzioni","Furtività","Nuotare"],flavorText:"Il corpo come arma, la mente come scudo.",description:"Il Monaco trasforma il proprio corpo in un'arma perfetta. Il Dado Danno del Colpo Senz'Armi scala automaticamente, la Raffica di Colpi fornisce attacchi multipli, e il Ki alimenta capacità soprannaturali. La velocità di movimento supera alla fine qualsiasi altra creatura.",features:["Colpo Senz'Armi — 1d6 al 1°, scala fino a 2d10 al 20°; no attacchi di opportunità","Raffica di Colpi — attacchi multipli come BAB più alto","Bonus CA — aggiunge mod.SAG alla CA senza armatura","Riserva di Ki — poteri soprannaturali"],tip:"💡 Richiede FOR, DES, COS e SAG alte — una delle classi più esigenti. Amulet of Natural Armor e Monk's Belt fondamentali."},
  Paladino:{book:"CRB",hd:10,bab:"full",saves:{fort:"good",ref:"poor",will:"good"},skills:2,spellcaster:true,spellStat:"CHA",spellType:"divino",castingType:"preparato",keyAbility:"CHA",alignment:["LG"],alignNote:"Solo Legale Buono",classSkills:["Artigianato","Diplomazia","Domare Animali","Guarire","Conoscenze (Nobiltà)","Conoscenze (Religione)","Cavalcare","Percepire le Intenzioni","Conoscenze Magiche"],flavorText:"Il campione della giustizia divina. Rigido nel codice, impossibile da intimidire.",description:"Guerriero divino con BAB Completo e d10, potenziato da capacità soprannaturali. Grazia Divina aggiunge CHA a tutti e tre i Tiri Salvezza — bonus difensivo eccezionale. Imporre le Mani guarisce rapidamente. Solo allineamento Legale Buono, in cambio di alcuni dei bonus difensivi più forti del gioco.",features:["Grazia Divina — bonus CHA a tutti i TS","Imporre le Mani — guarisce 1d6/2 livelli PF; 1/2×livello+CHA/giorno","Aura del Coraggio — immunità paura; alleati +4 vs paura entro 10 ft","Colpire il Male — +CHA danno vs malvagio; 1/giorno ogni 2 livelli"],tip:"💡 Massimizza CHA e FOR. CHA potenzia Grazia Divina, Imporre le Mani e Colpire il Male."},
  Ranger:{book:"CRB",hd:10,bab:"full",saves:{fort:"good",ref:"good",will:"poor"},skills:6,spellcaster:true,spellStat:"WIS",spellType:"divino",castingType:"preparato",keyAbility:"DEX",classSkills:["Scalare","Artigianato","Domare Animali","Conoscenze (Dungeon)","Conoscenze (Geografica)","Conoscenze (Natura)","Percezione","Cavalcare","Conoscenze Magiche","Furtività","Sopravvivenza","Nuotare"],flavorText:"Il cacciatore specializzato. Contro il suo tipo di nemico, nessuno è più letale.",description:"BAB Completo con 6 gradi di abilità. Il Nemico Prediletto fornisce bonus crescenti vs il tipo scelto. Lo Stile da Combattimento bonus ignora i prerequisiti normali. Terreno Privilegiato al 3° livello. Compagno Animale opzionale al 4°.",features:["Nemico Prediletto — +2 attacco/danno e abilità vs tipo scelto; migliora ogni 5 livelli","Stile da Combattimento Bonus — talenti senza prerequisiti: Arco, Due Armi o Bastone","Terreno Privilegiato — bonus a Iniziativa, Percezione, Furtività in terreno scelto","Compagno Animale — al 4°, come Druido -3 livelli"],tip:"💡 Scegli il Nemico Prediletto strategicamente: Umanoidi sono i più comuni."},
  Ladro:{book:"CRB",hd:8,bab:"3/4",saves:{fort:"poor",ref:"good",will:"poor"},skills:8,spellcaster:false,keyAbility:"DEX",classSkills:["Acrobazia","Valutare","Ingannare","Scalare","Artigianato","Diplomazia","Disattivare Congegni","Travestirsi","Liberarsi","Volare","Intimidire","Conoscenze (Dungeon)","Conoscenze (Locale)","Linguistica","Percezione","Esibizione","Cavalcare","Percepire le Intenzioni","Borseggiare","Conoscenze Magiche","Furtività","Usare Oggetti Magici"],flavorText:"Maestro dell'astuzia e delle opportunità. Letale nell'ombra, insostituibile in esplorazione.",description:"8 gradi per livello, 23 abilità di classe, Usare Oggetti Magici. L'Attacco Furtivo (+1d6 ogni 2 livelli) si attiva quando il nemico è privo del bonus DES alla CA o fiancheggiato. Il Talento da Ladro ogni 2 livelli permette enorme personalizzazione.",features:["Attacco Furtivo — +1d6 ogni 2 livelli vs nemici negati DES o fiancheggiati","Trovare Trappole — Percezione per trappole magiche","Schivata Soprannaturale — non perde DES quando sorpreso","Talento da Ladro — al 2° e ogni 2 livelli"],tip:"💡 DEX alta prioritaria. Combattimento con Due Armi + Attacco Furtivo è devastante."},
  Stregone:{book:"CRB",hd:6,bab:"1/2",saves:{fort:"poor",ref:"poor",will:"good"},skills:2,spellcaster:true,spellStat:"CHA",spellType:"arcano",castingType:"spontaneo",keyAbility:"CHA",classSkills:["Valutare","Ingannare","Volare","Intimidire","Conoscenze (Arcano)","Conoscenze (Piani)","Esibizione","Conoscenze Magiche","Usare Oggetti Magici"],flavorText:"Il potere nelle vene, non nei libri.",description:"Lancia spontaneamente da un repertorio fisso. Il Lignaggio del Sangue determina capacità bonus, Magie del Sangue, talenti bonus e incantesimi aggiuntivi. Meno varietà del Mago, ma massima flessibilità di utilizzo — può lanciare il suo incantesimo preferito quante volte gli slot lo permettono.",features:["Lignaggio — Aberrazione, Arcano, Celestiale, Elementale, Fatato, Infernale, Orchesco, Dracesco, ecc.","Magia del Sangue — capacità legate al lignaggio","Incantesimi Spontanei","Talenti Bonus dal lignaggio"],tip:"💡 CHA è assoluta. Pianifica gli incantesimi conosciuti con cura: sono pochi e difficili da cambiare."},
  Mago:{book:"CRB",hd:6,bab:"1/2",saves:{fort:"poor",ref:"poor",will:"good"},skills:2,spellcaster:true,spellStat:"INT",spellType:"arcano",castingType:"preparato",keyAbility:"INT",classSkills:["Artigianato","Volare","Conoscenze (Arcano)","Conoscenze (Dungeon)","Conoscenze (Ingegneria)","Conoscenze (Geografica)","Conoscenze (Storia)","Conoscenze (Locale)","Conoscenze (Natura)","Conoscenze (Nobiltà)","Conoscenze (Piani)","Conoscenze (Religione)","Linguistica","Percezione","Esibizione","Conoscenze Magiche","Usare Oggetti Magici"],flavorText:"La conoscenza è potere. Il Mago ha entrambi.",description:"L'unica classe con accesso teorico a ogni incantesimo arcano. Ogni mattina sceglie quali preparare dal Libro, adattandosi a qualsiasi sfida. La Scuola Arcana fornisce slot bonus e capacità uniche. Con INT alta ha le CD più alte del gioco.",features:["Libro degli Incantesimi — tutti gli incantesimi noti; aggiunge quelli trovati come bottino","Scuola Arcana — specializzazione; slot bonus e capacità speciali","Legame Arcano — Famiglio o Oggetto Familiare","Scrivi Pergamene — talento bonus al 1°"],tip:"💡 INT alta fondamentale. Incantesimi di controllo spesso più efficaci dei puri danni."},
  Alchimista:{book:"APG",hd:8,bab:"3/4",saves:{fort:"good",ref:"good",will:"poor"},skills:4,spellcaster:true,spellStat:"INT",spellType:"divino",castingType:"preparato",keyAbility:"INT",classSkills:["Valutare","Artigianato","Disattivare Congegni","Volare","Guarire","Conoscenze (Arcano)","Conoscenze (Natura)","Percezione","Conoscenze Magiche","Sopravvivenza","Usare Oggetti Magici"],flavorText:"Scienza e magia al confine. Le sue bombe esplodono, i suoi estratti potenziano.",description:"I 'incantesimi' dell'Alchimista sono Estratti che deve bere lui stesso. Compensa con Bombe (danno fuoco scalante) e Mutageno (aumenta massivamente un punteggio fisico riducendo quello mentale opposto). Le Scoperte ogni 2 livelli sono l'anima della personalizzazione.",features:["Alchimia — crea estratti, bombe e mutageni","Bombe — 1d6+INT fuoco per lancio; 1+INT/giorno","Mutageno — +4 a FOR/DES/COS, bonus CA naturale, -2 mentale","Scoperta — al 2° e ogni 2 livelli"],tip:"💡 Scegli tra Bombardiere (INT alta) o Mutageno (bilancia FOR/INT)."},
  Cavaliere:{book:"APG",hd:10,bab:"full",saves:{fort:"good",ref:"poor",will:"poor"},skills:4,spellcaster:false,keyAbility:"STR",classSkills:["Scalare","Artigianato","Diplomazia","Domare Animali","Intimidire","Cavalcare","Percepire le Intenzioni","Conoscenze Magiche","Nuotare"],flavorText:"Un guerriero vincolato al proprio Ordine e alla propria Sfida.",description:"BAB Completo con d10. La Sfida designa un bersaglio: danni bonus contro di esso. L'Ordine (Cavaliere, Corona, Drago, Stella, Spada, Torre) definisce l'identità. La Cavalcatura potenziata permette combattimento in sella eccezionale.",features:["Ordine — ideali, codice, abilità bonus e Sfida speciale","Sfida — 1/giorno al 1°; +1d6 danni vs bersaglio sfidato","Cavalcatura — +4 Cavalcare, comandi con le cosce","Tattico — al 5°, manovra di squadra per gli alleati"],tip:"💡 Ordine del Drago per danno; Torre per difesa."},
  Convocatore:{book:"APG",hd:8,bab:"3/4",saves:{fort:"poor",ref:"poor",will:"good"},skills:2,spellcaster:true,spellStat:"CHA",spellType:"arcano",castingType:"spontaneo",keyAbility:"CHA",classSkills:["Artigianato","Volare","Conoscenze (Arcano)","Conoscenze (Piani)","Linguistica","Conoscenze Magiche","Usare Oggetti Magici"],flavorText:"Non evoca mostri — crea il suo compagno ideale dal nulla.",description:"La forza principale è l'Eidolon: compagno extraplanare personalizzabile attraverso le Evoluzioni. Il Pool di Evoluzioni cresce ogni livello. L'Eidolon condivide un legame con il Convocatore: insieme formano un'unità di combattimento potente.",features:["Eidolon — compagno extraplanare personalizzabile","Pool di Evoluzioni — cresce per livello; speso per capacità dell'Eidolon","Legame — condivide PF con l'Eidolon","Evocazione Mostri come SLA — 1/giorno durata illimitata"],tip:"💡 Pianifica le Evoluzioni con cura. Taglia Bipede con attacchi naturali è efficiente."},
  Fattucchiere:{book:"APG",hd:6,bab:"1/2",saves:{fort:"poor",ref:"poor",will:"good"},skills:2,spellcaster:true,spellStat:"INT",spellType:"arcano",castingType:"preparato",keyAbility:"INT",classSkills:["Artigianato","Volare","Guarire","Intimidire","Conoscenze (Arcano)","Conoscenze (Storia)","Conoscenze (Natura)","Conoscenze (Piani)","Conoscenze (Religione)","Conoscenze Magiche","Usare Oggetti Magici"],flavorText:"Il potere da un accordo oscuro con un Patrono misterioso.",description:"Gli incantesimi vengono comunicati dal Patrono attraverso il famiglio. Le Maledizioni sono la firma: effetti debilitanti con CD difficilissime. Il famiglio custodisce gli incantesimi — perderlo è catastrofico.",features:["Patrono — dona incantesimi tematici ogni 2 livelli","Famiglio — custodisce gli incantesimi; se muore non si possono prepararne di nuovi","Maledizioni — potenti debuff illimitati o quasi","Incantesimi Preparati — lista focalizzata sul controllo"],tip:"💡 INT alta per CD. Mal degli Occhi + Fatalità è devastante. Proteggi il famiglio a ogni costo."},
  Inquisitore:{book:"APG",hd:8,bab:"3/4",saves:{fort:"good",ref:"poor",will:"good"},skills:6,spellcaster:true,spellStat:"WIS",spellType:"divino",castingType:"spontaneo",keyAbility:"WIS",classSkills:["Scalare","Artigianato","Ingannare","Diplomazia","Intimidire","Conoscenze (Arcano)","Conoscenze (Dungeon)","Conoscenze (Natura)","Conoscenze (Piani)","Conoscenze (Religione)","Linguistica","Percezione","Cavalcare","Percepire le Intenzioni","Conoscenze Magiche","Furtività","Sopravvivenza","Nuotare"],flavorText:"Il braccio armato della divinità nel mondo mortale.",description:"Unisce BAB 3/4, magia spontanea divina, 6 gradi di abilità e capacità investigative uniche. Il Giudizio fornisce bonus situazionali ogni round. Sguardo Austero usa SAG per Intimidire.",features:["Giudizio — 1/giorno al 1°; bonus round per round: attacco, danno, CA, TS, ecc.","Conoscenza dei Mostri — INT a Percezione per identificare creature","Sguardo Austero — SAG invece di CHA per Intimidire","Dominio o Inquisizione"],tip:"💡 STR e SAG alte. Con armatura media e arma divina combatte in prima linea."},
  Oracolo:{book:"APG",hd:8,bab:"3/4",saves:{fort:"poor",ref:"poor",will:"good"},skills:4,spellcaster:true,spellStat:"CHA",spellType:"divino",castingType:"spontaneo",keyAbility:"CHA",classSkills:["Artigianato","Diplomazia","Guarire","Conoscenze (Storia)","Conoscenze (Piani)","Conoscenze (Religione)","Esibizione","Conoscenze Magiche"],flavorText:"Toccato dalla divinità in modo misterioso e a volte maledetto.",description:"Il Chierico che lancia spontaneamente con CHA. Il Mistero (Battaglia, Vita, Fuoco, ecc.) aggiunge incantesimi bonus, Rivelazioni e la Maledizione dell'Oracolo — una penalità permanente che scala in benefici.",features:["Mistero — Rivelazioni, incantesimi bonus e Maledizione","Maledizione — penalità permanente che scala in benefici al 5°, 10°, 15°","Rivelazioni — capacità speciali del Mistero","Incantesimi Divini Spontanei con CHA"],tip:"💡 Mistero Vita per supporto; Battaglia per melee; Fuoco/Tempesta per danno."},
  Magus:{book:"UM",hd:8,bab:"3/4",saves:{fort:"good",ref:"poor",will:"good"},skills:2,spellcaster:true,spellStat:"INT",spellType:"arcano",castingType:"preparato",keyAbility:"INT",classSkills:["Scalare","Artigianato","Volare","Intimidire","Conoscenze (Arcano)","Conoscenze (Dungeon)","Conoscenze (Geografica)","Conoscenze (Natura)","Conoscenze (Piani)","Cavalcare","Conoscenze Magiche","Nuotare"],flavorText:"L'incantesimo e la spada non sono opposti — nelle mani del Magus, sono la stessa cosa.",description:"Il Combattimento Magico (un'azione intera) permette di attaccare e lanciare contemporaneamente. Il Pozzo Arcano alimenta il consumo rapido di slot. Le Arcane del Magus ogni 3 livelli sono il cuore della personalizzazione.",features:["Pozzo Arcano — 3+INT punti; recuperato preparando","Combattimento Magico — attacca e lancia un incantesimo con un tocco","Colpo Magico — dopo un colpo, lancia un incantesimo sull'arma","Arcane del Magus — al 3° e ogni 3 livelli"],tip:"💡 INT alta. Combattimento Magico + Dardo Incantato è il combo base. Empowered Spell + Shocking Grasp per burst."},
  Pistolero:{book:"UC",hd:10,bab:"full",saves:{fort:"good",ref:"good",will:"poor"},skills:4,spellcaster:false,keyAbility:"DEX",classSkills:["Acrobazia","Ingannare","Scalare","Artigianato","Diplomazia","Domare Animali","Intimidire","Conoscenze (Locale)","Percezione","Cavalcare","Conoscenze Magiche","Furtività","Sopravvivenza","Nuotare"],flavorText:"Dove c'è polvere da sparo, c'è un Pistolero.",description:"Le armi da fuoco ignorano l'armatura a distanza ravvicinata. Il Coraggio (recuperato con critici e uccisioni) alimenta le Imprese. L'Agilità aggiunge INT alla CA in armatura leggera.",features:["Competenza con Armi da Fuoco — l'unica classe con competenza nativa","Coraggio — 2 punti; recupera con critici o uccisioni; alimenta le Imprese","Imprese — azioni speciali ogni livello pari","Agilità — al 2°: +INT alla CA in armatura leggera"],tip:"💡 DEX alta per attacchi, INT per CA. Tieni scorte di polvere da sparo."},
  Ninja:{book:"UC",hd:8,bab:"3/4",saves:{fort:"poor",ref:"good",will:"poor"},skills:8,spellcaster:false,keyAbility:"DEX",classSkills:["Acrobazia","Valutare","Ingannare","Scalare","Artigianato","Diplomazia","Disattivare Congegni","Travestirsi","Liberarsi","Domare Animali","Intimidire","Conoscenze (Locale)","Conoscenze (Nobiltà)","Linguistica","Percezione","Esibizione","Cavalcare","Percepire le Intenzioni","Borseggiare","Conoscenze Magiche","Furtività","Usare Oggetti Magici"],flavorText:"Il Ladro della cultura di Tian Xia. La Riserva di Ki eleva le sue capacità.",description:"Stesse fondamenta del Ladro ma con Riserva di Ki (alimentata da CHA). Nessuna Traccia al 6° livello rende impossibile seguire le sue orme. Uso dei Veleni senza avvelenarsi da soli.",features:["Attacco Furtivo — +1d6 ogni 2 livelli","Uso dei Veleni — no rischio di avvelenamento","Riserva di Ki — ½ livello + CHA; Passo Veloce, Attacco Veloce, Difesa Ninja","Nessuna Traccia — al 6°"],tip:"💡 CHA e DEX alte. Ottimo per build di infiltrazione pura."},
  Samurai:{book:"UC",hd:10,bab:"full",saves:{fort:"good",ref:"poor",will:"poor"},skills:4,spellcaster:false,keyAbility:"STR",classSkills:["Scalare","Artigianato","Diplomazia","Domare Animali","Intimidire","Cavalcare","Percepire le Intenzioni","Conoscenze Magiche","Nuotare"],flavorText:"L'onore è la sua armatura più resistente.",description:"Variante del Cavaliere di Tian Xia. La Determinazione permette di usare FOR/COS/CHA per rimpiazzare un TS fallito (1/giorno, scala). Competenza innata con katana e wakizashi.",features:["Ordine — come Cavaliere; include ordini esclusivi","Sfida — identica al Cavaliere","Risoluzione — 1/giorno: usa FOR/COS/CHA in luogo di un TS fallito","Cavalcatura — identica al Cavaliere"],tip:"💡 STR e COS alte. La Determinazione è una rete di sicurezza preziosa."},
  Arcanista:{book:"ACG",hd:6,bab:"1/2",saves:{fort:"poor",ref:"poor",will:"good"},skills:2,spellcaster:true,spellStat:"INT",spellType:"arcano",castingType:"preparato",keyAbility:"INT",classSkills:["Artigianato","Volare","Conoscenze (Arcano)","Conoscenze (Dungeon)","Conoscenze (Natura)","Conoscenze (Piani)","Conoscenze (Religione)","Linguistica","Conoscenze Magiche","Usare Oggetti Magici"],flavorText:"La flessibilità dello Stregone, la potenza del Mago.",description:"Prepara come un Mago ma lancia spontaneamente come uno Stregone. Gli Sfruttamenti (alimentati dalla Riserva Arcana) modificano gli incantesimi in tempo reale. Molti la considerano la classe arcana più forte in assoluto.",features:["Slot Arcanisti — prepara dal libro ogni mattina; lancia spontaneamente","Riserva Arcana — 3+INT punti; recuperata preparando","Sfruttamenti — al 1° e ogni 2 livelli; modificano incantesimi in tempo reale","Addestramento Scolastico — al 3° livello"],tip:"💡 INT altissima. Sfruttamento Consumazione Potente quasi sempre prima scelta."},
  "Iracondo di Stirpe":{book:"ACG",hd:10,bab:"full",saves:{fort:"good",ref:"poor",will:"good"},skills:4,spellcaster:true,spellStat:"CHA",spellType:"arcano",castingType:"spontaneo",keyAbility:"STR",alignment:["NG","CG","LN","N","CN","NE","CE"],alignNote:"Qualsiasi non Legale",classSkills:["Acrobazia","Valutare","Scalare","Artigianato","Intimidire","Conoscenze (Arcano)","Conoscenze (Natura)","Cavalcare","Conoscenze Magiche","Nuotare"],flavorText:"Il sangue brucia, la magia esplode, il nemico cade.",description:"Fonde Barbaro e Stregone in modo brutale. L'Ira di Sangue aggiunge capacità magiche alla furia fisica. Il Lignaggio del Sangue definisce quale tipo di magia fluisce nelle vene.",features:["Ira di Sangue — come l'Ira del Barbaro; aggiunge Incantesimi di Sangue","Lignaggio del Sangue — come lo Stregone","Incantesimi di Sangue — lancia incantesimi durante l'Ira con azione rapida","Velocità Rapida — +10 ft in armatura leggera"],tip:"💡 STR alta per combattimento, CHA per CD. Lignaggio Dracesco o Infernale massimizza la sinergia."},
  Attaccabrighe:{book:"ACG",hd:10,bab:"full",saves:{fort:"good",ref:"good",will:"poor"},skills:4,spellcaster:false,keyAbility:"STR",classSkills:["Acrobazia","Scalare","Artigianato","Liberarsi","Intimidire","Conoscenze (Locale)","Percezione","Cavalcare","Percepire le Intenzioni","Conoscenze Magiche","Nuotare"],flavorText:"Il Guerriero ha i talenti. L'Attaccabrighe li cambia ogni round.",description:"La Flessibilità Marziale (azione rapida) prepara 1 talento da combattimento per 1 minuto senza prerequisiti — fino a 4 contemporaneamente a livelli alti. Ogni combattimento adattato alla situazione.",features:["Flessibilità Marziale — azione rapida: prepara 1 talento da combattimento per 1 min","Raffica — come Monaco ma con BAB Completo","Addestramento alle Manovre — +1 CMB/CMD ogni 2 livelli","Attacco Senz'Armi — 1d6 al 1°, scala come Monaco"],tip:"💡 STR e DES alte. Studia la lista dei talenti disponibili per usare al meglio la Flessibilità."},
  Cacciatore:{book:"ACG",hd:8,bab:"3/4",saves:{fort:"good",ref:"good",will:"poor"},skills:6,spellcaster:true,spellStat:"WIS",spellType:"divino",castingType:"spontaneo",keyAbility:"DEX",classSkills:["Scalare","Artigianato","Domare Animali","Conoscenze (Dungeon)","Conoscenze (Geografica)","Conoscenze (Natura)","Percezione","Cavalcare","Conoscenze Magiche","Furtività","Sopravvivenza","Nuotare"],flavorText:"Il Ranger ha un compagno animale. Il Cacciatore è una cosa sola con lui.",description:"Il compagno avanza come quello del Druido (pieno). La Concentrazione Precisa elimina gli attacchi di opportunità quando comanda il compagno. I Talenti Teamwork sono condivisi automaticamente.",features:["Compagno Animale — pieno avanzamento come Druido","Teamwork Feats — talenti di squadra bonus; il compagno li possiede automaticamente","Concentrazione Precisa — no AoO quando comanda il compagno","Focus dell'Animale — condivide bonus di Nemico Prediletto"],tip:"💡 SAG per gli incantesimi, DEX per il combattimento. Il compagno è la vera forza."},
  Intrepido:{book:"ACG",hd:10,bab:"full",saves:{fort:"poor",ref:"good",will:"poor"},skills:4,spellcaster:false,keyAbility:"DEX",classSkills:["Acrobazia","Valutare","Ingannare","Scalare","Artigianato","Diplomazia","Liberarsi","Intimidire","Conoscenze (Locale)","Conoscenze (Nobiltà)","Percezione","Esibizione","Cavalcare","Percepire le Intenzioni","Conoscenze Magiche","Nuotare"],flavorText:"Elegante, audace, mortale. L'Intrepido trasforma il duello in arte.",description:"Usa DES al posto di FOR per attaccare in mischia. Il Panache alimenta le Imprese — da Stoccata Aggraziata a Disarmo Magistrale. Agilità del Duellante aggiunge INT alla CA.",features:["Raffinatezza del Duellante — DES ai tiri per colpire in mischia con armi leggere","Panache — 2 punti; recupera con critici e uccisioni","Imprese — azioni speciali eleganti ogni livello pari","Agilità del Duellante — al 3°: +INT alla CA in armatura leggera"],tip:"💡 DEX, INT e CHA alte. Lo stocco è l'arma iconica."},
  Investigatore:{book:"ACG",hd:8,bab:"3/4",saves:{fort:"poor",ref:"good",will:"good"},skills:6,spellcaster:true,spellStat:"INT",spellType:"divino",castingType:"preparato",keyAbility:"INT",classSkills:["Valutare","Artigianato","Ingannare","Disattivare Congegni","Diplomazia","Travestirsi","Liberarsi","Guarire","Intimidire","Conoscenze (Arcano)","Conoscenze (Dungeon)","Conoscenze (Ingegneria)","Conoscenze (Locale)","Conoscenze (Natura)","Conoscenze (Nobiltà)","Conoscenze (Piani)","Conoscenze (Religione)","Linguistica","Percezione","Esibizione","Conoscenze Magiche","Borseggiare","Furtività"],flavorText:"La logica come arma, l'osservazione come scudo.",description:"Il Combattimento Studiato usa INT per i bonus ai tiri per colpire e danni. L'Ispirazione è un pool di d6 bonus flessibilissimi. Con 6 gradi di abilità è il master delle situazioni fuori dal combattimento.",features:["Alchimia — estratti come l'Alchimista","Ispirazione — ½ livello + INT punti; d6 bonus a abilità, poi attacchi e TS","Combattimento Studiato — al 4°: +INT a tiri per colpire e danno vs bersaglio","Metodologia — stile al 1°: Empirico, Acuto, Tattile, Anatomista, Veggente, Interrogatore"],tip:"💡 INT è tutto. Ottimo in campagne con esplorazione e misteri."},
  Predatore:{book:"ACG",hd:10,bab:"full",saves:{fort:"good",ref:"good",will:"poor"},skills:6,spellcaster:false,keyAbility:"DEX",classSkills:["Acrobazia","Scalare","Artigianato","Ingannare","Diplomazia","Disattivare Congegni","Travestirsi","Intimidire","Conoscenze (Dungeon)","Conoscenze (Geografica)","Conoscenze (Locale)","Percezione","Cavalcare","Conoscenze Magiche","Borseggiare","Furtività","Sopravvivenza","Nuotare"],flavorText:"Il Ranger e il Ladro in uno: trova il bersaglio, lo studia, lo elimina.",description:"Bersaglio Studiato (azione di movimento) + Attacco Furtivo sullo stesso personaggio con BAB Completo e d10. Più resistente del Ladro, più furtivo del Ranger.",features:["Bersaglio Studiato — azione di movimento: +1 attacco/danno vs studiato; scala","Attacco Furtivo — +1d6 ogni 3 livelli (meno del Ladro ma BAB Completo)","Muoversi Silenziosamente — Furtività senza penalità","Talento del Predatore — al 2° e ogni 2 livelli"],tip:"💡 DEX alta. Arciere furtivo è la build più efficace."},
  "Sacerdote Guerriero":{book:"ACG",hd:8,bab:"3/4",saves:{fort:"good",ref:"poor",will:"good"},skills:2,spellcaster:true,spellStat:"WIS",spellType:"divino",castingType:"preparato",keyAbility:"WIS",classSkills:["Scalare","Artigianato","Diplomazia","Domare Animali","Guarire","Intimidire","Conoscenze (Religione)","Cavalcare","Percepire le Intenzioni","Conoscenze Magiche","Nuotare"],flavorText:"Il Chierico che vuole combattere davvero.",description:"Ibrido Guerriero/Chierico per il frontliner divino. Le Benedizioni (2 a scelta) sono versioni semplificate dei Domini. L'Arma Sacra scala il dado danno automaticamente. Il Fervore permette cure con azione rapida.",features:["Benedizioni — 2 versioni combat dei Domini divini","Fervore — Canalizzazione potenziata; cure con azione rapida","Arma Sacra — scala dado danno come il Monaco","Armatura Sacra — al 7°; bonus crescenti"],tip:"💡 SAG per incantesimi, STR per corpo a corpo. Benedizione delle Armi + Fervore in Cura è la combo base."},
  Scaldo:{book:"ACG",hd:8,bab:"3/4",saves:{fort:"good",ref:"poor",will:"good"},skills:4,spellcaster:true,spellStat:"CHA",spellType:"arcano",castingType:"spontaneo",keyAbility:"CHA",classSkills:["Acrobazia","Scalare","Artigianato","Ingannare","Diplomazia","Intimidire","Conoscenze (Arcano)","Conoscenze (Locale)","Conoscenze (Natura)","Conoscenze (Nobiltà)","Conoscenze (Religione)","Linguistica","Percezione","Esibizione","Percepire le Intenzioni","Conoscenze Magiche"],flavorText:"Il guerriero-poeta del nord che porta l'Ira Ispirata ai compagni.",description:"La Canzone Rabbiosa trasmette un'Ira Ispirata a tutti gli alleati (FOR+2, PF temporanei, TS Volontà). BAB 3/4 e armature medie lo posizionano come combattente di supporto. Ottimo per gruppi con Barbari.",features:["Sapere Bardico","Canzone Rabbiosa — Ira Ispirata agli alleati entro 30 ft","Poteri dello Scaldo — capacità di guerra","Incantesimi Arcani Spontanei — lista di guerra"],tip:"💡 CHA e STR alte. Prezioso per i gruppi con Barbari che non possono usare l'Ira del Bardo."},
  Sciamano:{book:"ACG",hd:8,bab:"3/4",saves:{fort:"poor",ref:"poor",will:"good"},skills:4,spellcaster:true,spellStat:"WIS",spellType:"divino",castingType:"preparato",keyAbility:"WIS",classSkills:["Artigianato","Volare","Guarire","Intimidire","Conoscenze (Arcano)","Conoscenze (Natura)","Conoscenze (Piani)","Conoscenze (Religione)","Conoscenze Magiche","Sopravvivenza"],flavorText:"Il sussurratore di spiriti. Chiama, negozia, comanda.",description:"Ibrido Oracolo/Fattucchiere con SAG. Lo Spirito scelto definisce Maledizioni, incantesimi bonus e il Famiglio potenziato. Lo Spirito Errante cambia giornalmente aggiungendo Maledizioni extra. Lista combinata Chierico/Druido potentissima.",features:["Spirito — uno al 1° (Lama, Battaglia, Bestia, Civiltà, Fortuna, Guarigione, ecc.)","Maledizioni — Mal degli Occhi, Sonno Profondo, Stregatura, ecc.","Spirito Errante — al 4°: spirito secondario giornaliero","Famiglio — potenziato dallo Spirito"],tip:"💡 SAG altissima. Spirito Fortuna + Mal degli Occhi è uno dei combo di controllo più forti."},
};

const FEATS = {
  "Allerta":{type:"generale",desc:"+2 Percezione, +2 Percepire le Intenzioni",prereq:null},
  "Atletico":{type:"generale",desc:"+2 Scalare e +2 Nuotare",prereq:null},
  "Robustezza":{type:"generale",desc:"+3 PF al 1° livello, poi +1/livello",prereq:null},
  "Grande Tempra":{type:"generale",desc:"+2 ai TS su Tempra",prereq:null},
  "Ferrea Volontà":{type:"generale",desc:"+2 ai TS su Volontà",prereq:null},
  "Riflessi Pronti":{type:"generale",desc:"+2 ai TS su Riflessi",prereq:null},
  "Resistenza":{type:"generale",desc:"+4 TS vs affaticamento; dorme in armatura media",prereq:null},
  "Abilità Mimetica":{type:"generale",desc:"+2 Ingannare, +2 Travestirsi",prereq:null},
  "Mani Svelte":{type:"generale",desc:"+2 Disattivare Congegni, +2 Borseggiare",prereq:null},
  "Maestria nell'Abilità":{type:"generale",desc:"+3 a un'abilità; +6 con 10+ gradi",prereq:null},
  "Oratore":{type:"generale",desc:"+2 Diplomazia, +2 Intimidire",prereq:null},
  "Rapido":{type:"generale",desc:"Corsa ×5 invece di ×4; no penalità DES",prereq:null},
  "Doti Innati":{type:"generale",desc:"+2 a due abilità di Conoscenza a scelta",prereq:null},
  "Concentrazione":{type:"generale",desc:"+1 CD incantesimi di una scuola scelta",prereq:"Capacità di lanciare incantesimi"},
  "Iniziativa Migliorata":{type:"combattimento",desc:"+4 al tiro di Iniziativa",prereq:null},
  "Schivare":{type:"combattimento",desc:"+1 bonus schivata alla CA",prereq:"DES 13"},
  "Potere d'Attacco":{type:"combattimento",desc:"-1 attacchi / +2 danni (o +3 a due mani)",prereq:"FOR 13, BAB +1"},
  "Combattimento con Due Armi":{type:"combattimento",desc:"Riduce penalità per due armi",prereq:"DES 15"},
  "Messa a Fuoco con l'Arma":{type:"combattimento",desc:"+1 tiri per colpire con arma scelta",prereq:"BAB +1"},
  "Specializzazione nell'Arma":{type:"combattimento",desc:"+2 danni con arma scelta",prereq:"Guerriero liv.4, Messa a Fuoco"},
  "Tiro da Breve Distanza":{type:"combattimento",desc:"+1 attacco/danno a distanza entro 9 mt",prereq:null},
  "Tiro Preciso":{type:"combattimento",desc:"No penalità -4 per sparare in mischia",prereq:"Tiro da Breve Distanza"},
  "Attacco Vitale":{type:"combattimento",desc:"Azione standard: attacco con dado danno ×2",prereq:"BAB +6"},
  "Sradicamento":{type:"combattimento",desc:"+2 CMB Disarmo/Sgambetto/Presa; +2 CMD vs stesse",prereq:"INT 13, BAB +1"},
  "Destrezza in Combattimento":{type:"combattimento",desc:"DES al posto di FOR per tiri per colpire in mischia",prereq:"DES 13"},
  "Riflessi in Combattimento":{type:"combattimento",desc:"AoO aggiuntivi pari al mod. DES per round",prereq:"DES 13"},
  "Combattimento Migliorato Senz'Armi":{type:"combattimento",desc:"Attacchi senz'armi no AoO",prereq:null},
  "Sventare":{type:"combattimento",desc:"-2 attacchi, +2 CA",prereq:"INT 13, Sradicamento, BAB +1"},
  "Sfondare":{type:"combattimento",desc:"Dopo aver ridotto a 0 PF un nemico, attacca un altro adiacente",prereq:"FOR 13, Potere d'Attacco, BAB +1"},
};

// ─── MATH ─────────────────────────────────────────────────────────────────────
const flr   = n => Math.floor(n);
const modOf = v => flr((v - 10) / 2);
const fmod  = n => n >= 0 ? `+${n}` : `${n}`;
const goodSave = (lv=1) => 2 + flr(lv/2);
const poorSave = (lv=1) => flr(lv/3);
const BAB = { full:(lv)=>lv, "3/4":(lv)=>flr(lv*3/4), "1/2":(lv)=>flr(lv/2) };
const getSave = (q, lv=1) => q==="good" ? goodSave(lv) : poorSave(lv);

function computeRaceMods(raceName, freeBoostChoice) {
  const race = RACES[raceName]; if (!race) return {};
  const s = {...race.mods};
  if (race.freeBoost > 0 && freeBoostChoice) s[freeBoostChoice] = (s[freeBoostChoice]||0) + 2;
  return s;
}
function applyRace(baseStats, raceName, freeBoostChoice) {
  const mods = computeRaceMods(raceName, freeBoostChoice);
  const out = {...baseStats};
  STAT_KEYS.forEach(k => { out[k] = (baseStats[k]||10) + (mods[k]||0); });
  return out;
}
function derivedStats(char) {
  const stats = char.finalStats || {STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10};
  const cls   = char.class ? CLASSES[char.class] : null;
  const lv    = char.level || 1;
  const b     = cls ? BAB[cls.bab](lv) : 0;
  const hpMax = cls ? cls.hd + modOf(stats.CON) : 0;
  const fort  = cls ? getSave(cls.saves.fort, lv) + modOf(stats.CON) : 0;
  const ref   = cls ? getSave(cls.saves.ref,  lv) + modOf(stats.DEX) : 0;
  const will  = cls ? getSave(cls.saves.will, lv) + modOf(stats.WIS) : 0;
  const ac    = 10 + modOf(stats.DEX);
  const init  = modOf(stats.DEX) + ((char.feats||[]).includes("Iniziativa Migliorata") ? 4 : 0);
  const cmb   = b + modOf(stats.STR);
  const cmd   = 10 + b + modOf(stats.STR) + modOf(stats.DEX);
  return { bab:b, hpMax, fort, ref, will, ac, init, cmb, cmd, stats };
}
function skillRanksAvailable(char) {
  const cls = char.class ? CLASSES[char.class] : null;
  if (!cls) return 0;
  const intMod = modOf((char.finalStats||{}).INT||10);
  return Math.max(1, cls.skills + intMod) + (char.race === "Umano" ? 1 : 0);
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Label({children, required}) {
  return <div style={{fontSize:11,fontFamily:T.fontBody,fontWeight:600,color:T.textMuted,
    letterSpacing:1.8,textTransform:"uppercase",marginBottom:8,
    display:"flex",gap:4,alignItems:"center"}}>
    {children}{required && <span style={{color:T.accent}}>*</span>}
  </div>;
}
function TxtIn({label, required, style, ...p}) {
  const [f,sf] = useState(false);
  return <div style={style}>
    {label && <Label required={required}>{label}</Label>}
    <input onFocus={()=>sf(true)} onBlur={()=>sf(false)} {...p}
      style={{width:"100%",background:T.bg3,border:`1px solid ${f?T.accent:T.border}`,
        borderRadius:T.r8,color:T.textPrimary,fontSize:15,fontFamily:T.fontBody,
        padding:"13px 16px",outline:"none",boxSizing:"border-box",transition:T.tr,
        boxShadow:f?`0 0 0 3px ${T.accentBg}`:"none"}}/>
  </div>;
}
function SelIn({label, options, required, value, onChange, style}) {
  const [f,sf] = useState(false);
  return <div style={style}>
    {label && <Label required={required}>{label}</Label>}
    <div style={{position:"relative"}}>
      <select value={value} onChange={onChange} onFocus={()=>sf(true)} onBlur={()=>sf(false)}
        style={{width:"100%",background:T.bg3,border:`1px solid ${f?T.accent:T.border}`,
          borderRadius:T.r8,color:T.textPrimary,fontSize:15,fontFamily:T.fontBody,
          padding:"13px 40px 13px 16px",outline:"none",appearance:"none",
          boxSizing:"border-box",cursor:"pointer",transition:T.tr,
          boxShadow:f?`0 0 0 3px ${T.accentBg}`:"none"}}>
        {options.map(o => (
          <option key={o.v||o} value={o.v||o} style={{background:T.bg1}}>{o.l||o}</option>
        ))}
      </select>
      <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",
        pointerEvents:"none",color:T.textMuted,fontSize:11}}>▾</span>
    </div>
  </div>;
}
function Btn({children, variant="primary", size="md", onClick, disabled, fullWidth}) {
  const [h,sh] = useState(false), [a,sa] = useState(false);
  const v = {
    primary:  {bg:h?"#d88060":T.accent,   border:h?"#d88060":T.accent,  color:"#181c1f"},
    secondary:{bg:h?T.bg3:T.bg2,          border:h?T.borderHover:T.border, color:T.textPrimary},
    ghost:    {bg:h?T.accentHover:"transparent", border:h?T.accentDim:"transparent", color:h?T.accent:T.textSecondary},
    danger:   {bg:h?"rgba(200,72,72,.2)":T.dangerBg, border:h?T.danger:"rgba(200,72,72,.3)", color:T.danger},
  }[variant];
  const s = {sm:{fs:12,p:"8px 16px",r:T.r6}, md:{fs:14,p:"12px 22px",r:T.r8}, lg:{fs:16,p:"15px 30px",r:T.r8}}[size];
  return <button onClick={onClick} disabled={disabled}
    onMouseEnter={()=>sh(true)} onMouseLeave={()=>{sh(false);sa(false);}}
    onMouseDown={()=>sa(true)} onMouseUp={()=>sa(false)}
    style={{background:v.bg,border:`1px solid ${v.border}`,color:v.color,
      fontSize:s.fs,padding:s.p,borderRadius:s.r,fontFamily:T.fontBody,fontWeight:600,
      cursor:disabled?"not-allowed":"pointer",width:fullWidth?"100%":"auto",
      transition:T.tr,opacity:disabled?.4:1,transform:a?"scale(.97)":"scale(1)",outline:"none"}}>
    {children}
  </button>;
}
function Badge({children, color="accent"}) {
  const cs = {
    accent:{bg:T.accentBg,border:T.accentDim,text:T.accent},
    green:{bg:T.successBg,border:T.success,text:T.success},
    red:{bg:T.dangerBg,border:T.danger,text:T.danger},
    blue:{bg:T.infoBg,border:T.info,text:T.info},
    muted:{bg:T.bg2,border:T.border,text:T.textMuted},
  }[color]||{bg:T.bg2,border:T.border,text:T.textMuted};
  return <span style={{display:"inline-flex",alignItems:"center",background:cs.bg,
    border:`1px solid ${cs.border}`,color:cs.text,fontSize:11,fontFamily:T.fontBody,
    fontWeight:600,padding:"3px 9px",borderRadius:20}}>{children}</span>;
}
function Divider({m="28px 0"}) { return <div style={{height:1,background:T.border,margin:m}}/>; }
function STitle({children}) {
  return <div style={{fontFamily:T.fontDisplay,fontSize:24,fontWeight:600,color:T.textPrimary,marginBottom:6}}>{children}</div>;
}
function SubT({children}) {
  return <div style={{fontSize:11,color:T.textMuted,letterSpacing:2,textTransform:"uppercase",fontWeight:600,marginBottom:20}}>{children}</div>;
}
function InfoBox({children, color="accent"}) {
  const c={accent:T.accentBg,blue:T.infoBg,green:T.successBg}[color]||T.accentBg;
  const b={accent:T.accentDim,blue:T.info,green:T.success}[color]||T.accentDim;
  return <div style={{background:c,border:`1px solid ${b}`,borderRadius:T.r8,
    padding:"12px 16px",fontSize:13,color:T.textSecondary,lineHeight:1.7}}>{children}</div>;
}
function PickCard({selected, onClick, children}) {
  const [h,sh] = useState(false);
  return <div onClick={onClick} onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
    style={{background:selected?T.bg2:T.bg1,cursor:"pointer",
      border:`1px solid ${selected?T.accent:h?T.borderHover:T.border}`,
      borderRadius:T.r12,padding:"16px 18px",
      boxShadow:selected?`0 0 0 1px ${T.accentBg} inset`:"none",transition:T.tr}}>
    {children}
  </div>;
}
function InfoPanel({children}) {
  return <div style={{background:T.bg2,border:`1px solid ${T.accentDim}`,
    borderRadius:T.r12,padding:"20px 22px",marginTop:16}}>{children}</div>;
}
function StepBar({steps, current}) {
  return <div style={{display:"flex",alignItems:"center"}}>
    {steps.map((s,i) => {
      const done=i<current, active=i===current;
      return <div key={i} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"auto"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
          <div style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:12,fontWeight:700,fontFamily:T.fontBody,flexShrink:0,
            background:done?T.accent:active?T.accentBg:T.bg2,
            border:`2px solid ${done||active?T.accent:T.border}`,
            color:done?"#181c1f":active?T.accent:T.textMuted,transition:T.tr}}>
            {done?"✓":i+1}
          </div>
          <span style={{fontSize:10,color:active?T.accent:T.textMuted,fontFamily:T.fontBody,
            whiteSpace:"nowrap",fontWeight:active?600:400}}>{s}</span>
        </div>
        {i<steps.length-1&&<div style={{flex:1,height:2,margin:"0 5px",marginBottom:22,
          background:done?T.accent:T.border,transition:T.tr}}/>}
      </div>;
    })}
  </div>;
}

// ─── WIZARD STEPS (identici alla versione standalone) ────────────────────────
const BOOKS_LS_KEY = "pf1e_books_v2";

function StepBooks({books, setBooks}) {
  return <div>
    <STitle>Selezione Manuali</STitle>
    <SubT>Scegli i manuali da usare nella creazione</SubT>
    <div style={{marginBottom:20}}>
      <InfoBox color="blue">
        <strong style={{color:T.info}}>Core Rulebook</strong> è sempre attivo.
        Abilita i manuali aggiuntivi per sbloccare razze e classi extra.
      </InfoBox>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {Object.values(BOOKS).map(b => {
        const active = books.includes(b.id);
        const raceCount = Object.values(RACES).filter(r=>r.book===b.id).length;
        const classCount= Object.values(CLASSES).filter(c=>c.book===b.id).length;
        return <div key={b.id}
          onClick={()=>!b.required&&setBooks(bs=>bs.includes(b.id)?bs.filter(x=>x!==b.id):[...bs,b.id])}
          style={{background:active?T.bg2:T.bg1,cursor:b.required?"default":"pointer",
            border:`1px solid ${active?b.color:T.border}`,borderRadius:T.r12,
            padding:"16px 20px",transition:T.tr,display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:20,height:20,borderRadius:4,flexShrink:0,
            background:active?b.color:T.bg3,border:`1.5px solid ${active?b.color:T.border}`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#181c1f",fontWeight:700}}>
            {active&&"✓"}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600,color:active?T.textPrimary:T.textSecondary,marginBottom:4}}>
              {b.name}{b.required&&<span style={{marginLeft:8,fontSize:10,color:T.accent}}>richiesto</span>}
            </div>
            <div style={{display:"flex",gap:8}}>
              {raceCount>0&&<Badge color="muted">{raceCount} razz{raceCount===1?"a":"e"}</Badge>}
              {classCount>0&&<Badge color="muted">{classCount} class{classCount===1?"e":"i"}</Badge>}
            </div>
          </div>
          <span style={{fontSize:13,fontWeight:700,color:active?b.color:T.textDisabled}}>{b.abbr}</span>
        </div>;
      })}
    </div>
  </div>;
}

function StepIdentity({char, set}) {
  return <div>
    <STitle>Identità del Personaggio</STitle>
    <SubT>Solo il nome è obbligatorio</SubT>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
      <TxtIn label="Nome" required placeholder="Es. Harsk" value={char.name} onChange={e=>set("name",e.target.value)}/>
      <TxtIn label="Giocatore" placeholder="Es. Marco" value={char.player||""} onChange={e=>set("player",e.target.value)}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
      <SelIn label="Allineamento" options={ALIGNMENTS.map(a=>({v:a.v,l:a.l}))}
        value={char.alignment} onChange={e=>set("alignment",e.target.value)}/>
      <SelIn label="Divinità" options={DEITIES} value={char.deity} onChange={e=>set("deity",e.target.value)}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
      <TxtIn label="Età" placeholder="Es. 28" value={char.age||""} onChange={e=>set("age",e.target.value)}/>
      <TxtIn label="Genere / Pronomi" placeholder="Es. Femminile" value={char.gender||""} onChange={e=>set("gender",e.target.value)}/>
    </div>
  </div>;
}

function StepRace({char, set, books}) {
  const available = Object.entries(RACES).filter(([,r])=>books.includes(r.book));
  const sel = char.race ? RACES[char.race] : null;
  function pick(key) { set("race",key); set("raceFreeBoost",null); }
  return <div>
    <STitle>Razza</STitle>
    <SubT>La stirpe del personaggio</SubT>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {available.map(([key,race])=>(
        <PickCard key={key} selected={char.race===key} onClick={()=>pick(key)}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{fontSize:15,fontWeight:600,fontFamily:T.fontDisplay,
              color:char.race===key?T.accent:T.textPrimary}}>{key}</div>
            <div style={{display:"flex",gap:4}}>
              <Badge color={char.race===key?"accent":"muted"}>{race.size}</Badge>
              <Badge color="muted">{BOOKS[race.book].abbr}</Badge>
            </div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
            {Object.entries(race.mods).map(([k,v])=>(
              <Badge key={k} color={v>0?"green":"red"}>{v>0?"+":""}{v} {STAT_SHORT[k]}</Badge>
            ))}
            {race.freeBoost>0&&<Badge color="muted">+2 libero</Badge>}
          </div>
          <div style={{fontSize:11,color:T.textMuted}}>⚡ {race.speed}ft · {race.vision}</div>
        </PickCard>
      ))}
    </div>
    {sel&&<InfoPanel>
      <div style={{fontSize:18,fontWeight:600,fontFamily:T.fontDisplay,color:T.accent,marginBottom:8}}>{char.race}</div>
      <div style={{fontSize:14,color:T.textSecondary,lineHeight:1.75,marginBottom:16}}>{sel.flavorText}</div>
      {sel.freeBoost>0&&<div style={{marginBottom:16}}>
        <Label>Bonus +2 a scelta *</Label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {STAT_KEYS.map(s=>{
            const isSel=char.raceFreeBoost===s;
            return <button key={s} onClick={()=>set("raceFreeBoost",s)}
              style={{padding:"9px 16px",borderRadius:T.r8,fontSize:13,fontFamily:T.fontBody,
                fontWeight:600,cursor:"pointer",transition:T.tr,
                background:isSel?T.accent:T.bg3,border:`1px solid ${isSel?T.accent:T.border}`,
                color:isSel?"#181c1f":T.textPrimary}}>
              +2 {STAT_LABELS[s]}
            </button>;
          })}
        </div>
      </div>}
      <Label>Tratti Razziali</Label>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
        {sel.traits.map((t,i)=>(
          <div key={i} style={{fontSize:13,color:T.textSecondary,padding:"8px 12px",
            background:T.bg3,borderRadius:T.r6,lineHeight:1.5}}>{t}</div>
        ))}
      </div>
      <div style={{padding:"10px 14px",background:T.accentBg,border:`1px solid ${T.accentDim}`,
        borderRadius:T.r6,fontSize:12,color:T.accent,lineHeight:1.6}}>
        <strong>Consiglio di Classe:</strong> {sel.classAdvice}
      </div>
    </InfoPanel>}
  </div>;
}

function StepClass({char, set, books}) {
  const available = Object.entries(CLASSES).filter(([,c])=>books.includes(c.book));
  const sel = char.class ? CLASSES[char.class] : null;
  const BAB_LBL = {"full":"Completo","3/4":"3/4","1/2":"1/2"};
  const SAVE_LBL = {good:"Buono",poor:"Scarso"};
  const BOOK_COLOR = {CRB:"#c87050",APG:"#5a96cc",UM:"#9a6cc8",UC:"#c84848",ACG:"#c8a050"};
  const alignOk = sel?.alignment ? sel.alignment.includes(char.alignment||"N") : true;
  const grouped = {};
  available.forEach(([k,c])=>{ if(!grouped[c.book])grouped[c.book]=[]; grouped[c.book].push([k,c]); });
  return <div>
    <STitle>Classe</STitle>
    <SubT>La vocazione del personaggio come avventuriero</SubT>
    {Object.entries(grouped).map(([bookId,classes])=>(
      <div key={bookId} style={{marginBottom:20}}>
        <div style={{fontSize:11,color:BOOK_COLOR[bookId]||T.textMuted,letterSpacing:2,
          fontWeight:600,textTransform:"uppercase",marginBottom:10}}>{BOOKS[bookId]?.name}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {classes.map(([key,cls])=>(
            <PickCard key={key} selected={char.class===key} onClick={()=>set("class",key)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{fontSize:15,fontWeight:600,fontFamily:T.fontDisplay,
                  color:char.class===key?T.accent:T.textPrimary}}>{key}</div>
                <div style={{display:"flex",gap:4}}>
                  <Badge color={char.class===key?"accent":"muted"}>d{cls.hd}</Badge>
                  {cls.spellcaster&&<Badge color="blue">✦</Badge>}
                </div>
              </div>
              <div style={{fontSize:12,color:T.textMuted,fontStyle:"italic",lineHeight:1.4,marginBottom:6}}>
                {cls.flavorText}
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                <Badge color="muted">BAB {BAB_LBL[cls.bab]}</Badge>
                <Badge color="muted">{cls.skills}+Int abilità</Badge>
              </div>
            </PickCard>
          ))}
        </div>
      </div>
    ))}
    {sel&&<InfoPanel>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{fontSize:19,fontWeight:600,fontFamily:T.fontDisplay,color:T.accent}}>{char.class}</div>
        <Badge color="blue">{BOOKS[sel.book]?.abbr}</Badge>
      </div>
      {!alignOk&&<div style={{background:T.dangerBg,border:`1px solid ${T.danger}`,
        borderRadius:T.r6,padding:"10px 14px",marginBottom:12,fontSize:13,color:T.danger}}>
        ⚠ Il {char.class} richiede allineamento <strong>{sel.alignNote}</strong>.
      </div>}
      <div style={{fontSize:14,color:T.textSecondary,lineHeight:1.8,marginBottom:16,whiteSpace:"pre-line"}}>
        {sel.description}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        {[["Dado Vita",`d${sel.hd}`],["BAB",BAB_LBL[sel.bab]],["Abilità/Lv",`${sel.skills}+Int`],
          ["Tempra",SAVE_LBL[sel.saves.fort]],["Riflessi",SAVE_LBL[sel.saves.ref]],["Volontà",SAVE_LBL[sel.saves.will]]
        ].map(([l,v])=>(
          <div key={l} style={{background:T.bg3,borderRadius:T.r6,padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:10,color:T.textMuted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{l}</div>
            <div style={{fontSize:15,fontWeight:700,color:T.textPrimary}}>{v}</div>
          </div>
        ))}
      </div>
      {sel.spellcaster&&<div style={{marginBottom:14}}>
        <Label>Magia</Label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Badge color="blue">Tipo: {sel.spellType}</Badge>
          <Badge color="blue">Stile: {sel.castingType}</Badge>
          <Badge color="blue">Stat: {STAT_LABELS[sel.spellStat]}</Badge>
        </div>
      </div>}
      <Label>Capacità al 1° Livello</Label>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
        {sel.features.map((f,i)=>(
          <div key={i} style={{fontSize:13,color:T.textSecondary,padding:"8px 12px",
            background:T.bg3,borderRadius:T.r6,lineHeight:1.5}}>{f}</div>
        ))}
      </div>
      {sel.tip&&<div style={{padding:"10px 14px",background:T.accentBg,border:`1px solid ${T.accentDim}`,
        borderRadius:T.r6,fontSize:12,color:T.accent,lineHeight:1.6}}>{sel.tip}</div>}
    </InfoPanel>}
  </div>;
}

function StepAbilities({char, set}) {
  const method = char.abilityMethod||"Standard Array";
  const pbPool = char.pbPool||"Fantasy Alta (20)";
  const baseStats = char.baseStats||{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10};
  const arrayAssigned = char.arrayAssigned||{};
  const pbValues = char.pbValues||{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10};
  const rollResults = char.rollResults||[null,null,null,null,null,null];

  function setMethod(m) {
    set("abilityMethod",m); set("arrayAssigned",{}); set("rollAssigned",{});
    set("pbValues",{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10});
    set("rollResults",[null,null,null,null,null,null]);
    set("baseStats",{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10});
  }
  const usedVals = Object.values(arrayAssigned);
  function assignArray(stat,value) {
    const n={...arrayAssigned,[stat]:value}; set("arrayAssigned",n);
    const bs={STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10};
    STAT_KEYS.forEach(k=>{if(n[k]!==undefined)bs[k]=n[k];}); set("baseStats",bs);
  }
  function unassignArray(stat) {
    const n={...arrayAssigned}; delete n[stat]; set("arrayAssigned",n);
    const bs={STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10};
    STAT_KEYS.forEach(k=>{if(n[k]!==undefined)bs[k]=n[k];}); set("baseStats",bs);
  }
  const maxPts = PB_POOLS[pbPool];
  const spent = STAT_KEYS.reduce((a,k)=>a+(PB_COST[pbValues[k]||10]||0),0);
  const remaining = maxPts - spent;
  function pbChange(stat,delta) {
    const cur=pbValues[stat]||10, next=cur+delta;
    if(next<7||next>18)return;
    if(remaining-(PB_COST[next]||0)+(PB_COST[cur]||0)<0&&delta>0)return;
    const nv={...pbValues,[stat]:next}; set("pbValues",nv); set("baseStats",{...nv});
  }
  function rollDie(){return Math.floor(Math.random()*6)+1;}
  function rollStat(){const d=[rollDie(),rollDie(),rollDie(),rollDie()];d.sort((a,b)=>b-a);return d.slice(0,3).reduce((a,b)=>a+b,0);}
  function rollAll(){
    const r=[rollStat(),rollStat(),rollStat(),rollStat(),rollStat(),rollStat()];
    set("rollResults",r); set("rollAssigned",{}); set("baseStats",{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10});
  }
  const usedRollIdxs = Object.values(char.rollAssigned||{});
  function assignRoll(stat,idx) {
    const n={...(char.rollAssigned||{}),[stat]:idx}; set("rollAssigned",n);
    const bs={STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10};
    STAT_KEYS.forEach(k=>{if(n[k]!==undefined)bs[k]=(char.rollResults||[])[n[k]]||10;}); set("baseStats",bs);
  }
  const finalPrev = applyRace(baseStats, char.race, char.raceFreeBoost);
  const METHODS = ["Standard Array","Point Buy","Tiro di Dado"];
  return <div>
    <STitle>Punteggi di Caratteristica</STitle>
    <SubT>Scegli il metodo di generazione</SubT>
    <div style={{display:"flex",gap:10,marginBottom:24}}>
      {METHODS.map(m=>(
        <button key={m} onClick={()=>setMethod(m)}
          style={{flex:1,padding:"11px 8px",borderRadius:T.r8,fontSize:12,fontFamily:T.fontBody,
            fontWeight:600,cursor:"pointer",transition:T.tr,
            background:method===m?T.accent:T.bg2,border:`1px solid ${method===m?T.accent:T.border}`,
            color:method===m?"#181c1f":T.textPrimary}}>{m}</button>
      ))}
    </div>
    {method==="Standard Array"&&<div>
      <InfoBox color="blue">Assegna [15,14,13,12,10,8] alle sei caratteristiche. Clicca un valore, poi la caratteristica.</InfoBox>
      <Divider m="16px 0"/>
      <Label>Valori disponibili</Label>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {STANDARD_ARRAY.map((v,i)=>{
          const used=usedVals.filter(x=>x===v).length>=STANDARD_ARRAY.filter(x=>x===v).length;
          return <div key={i} onClick={()=>!used&&set("_selArrVal",char._selArrVal===v?null:v)}
            style={{padding:"10px 16px",borderRadius:T.r8,fontSize:16,fontWeight:700,minWidth:48,
              textAlign:"center",cursor:used?"default":"pointer",transition:T.tr,
              background:used?T.bg3:char._selArrVal===v?T.accent:T.bg2,
              border:`1px solid ${used?T.border:char._selArrVal===v?T.accent:T.borderHover}`,
              color:used?T.textDisabled:char._selArrVal===v?"#181c1f":T.textPrimary,opacity:used?.4:1}}>{v}</div>;
        })}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {STAT_KEYS.map(k=>{
          const assigned=arrayAssigned[k];
          return <div key={k} onClick={()=>{ if(assigned)unassignArray(k); else if(char._selArrVal!=null){assignArray(k,char._selArrVal);set("_selArrVal",null);}}}
            style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:T.r8,
              background:assigned?T.bg2:T.bg1,border:`1px solid ${assigned?T.accentDim:T.border}`,cursor:"pointer",transition:T.tr}}>
            <div style={{width:90,fontSize:14,color:T.textPrimary,fontWeight:600}}>{STAT_LABELS[k]}</div>
            <div style={{width:36,fontSize:22,fontWeight:700,textAlign:"center",color:assigned?T.textPrimary:T.textDisabled}}>{assigned||"—"}</div>
            <div style={{fontSize:14,fontWeight:600,color:assigned?(modOf(assigned)>=0?T.success:T.danger):T.textDisabled}}>
              {assigned?fmod(modOf(assigned)):""}
            </div>
            {assigned&&<div style={{marginLeft:"auto",fontSize:11,color:T.textMuted}}>clicca per rimuovere</div>}
          </div>;
        })}
      </div>
    </div>}
    {method==="Point Buy"&&<div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {Object.keys(PB_POOLS).map(p=>(
          <button key={p} onClick={()=>set("pbPool",p)}
            style={{padding:"8px 14px",borderRadius:T.r6,fontSize:12,fontFamily:T.fontBody,fontWeight:600,cursor:"pointer",transition:T.tr,
              background:pbPool===p?T.accent:T.bg2,border:`1px solid ${pbPool===p?T.accent:T.border}`,color:pbPool===p?"#181c1f":T.textPrimary}}>{p}</button>
        ))}
      </div>
      <div style={{background:T.bg2,border:`1px solid ${remaining<0?T.danger:T.border}`,borderRadius:T.r8,
        padding:"12px 16px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:14,color:T.textSecondary}}>Punti rimanenti</span>
        <span style={{fontSize:24,fontWeight:700,color:remaining<0?T.danger:remaining===0?T.success:T.textPrimary}}>{remaining}/{maxPts}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {STAT_KEYS.map(k=>{
          const v=pbValues[k]||10;
          return <div key={k} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:T.r8,background:T.bg2,border:`1px solid ${T.border}`}}>
            <div style={{width:100,fontSize:14,color:T.textPrimary,fontWeight:600}}>{STAT_LABELS[k]}</div>
            <button onClick={()=>pbChange(k,-1)} disabled={v<=7}
              style={{width:32,height:32,borderRadius:T.r6,border:`1px solid ${T.border}`,background:T.bg3,color:T.textPrimary,fontSize:18,cursor:v<=7?"not-allowed":"pointer",opacity:v<=7?.4:1,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
            <div style={{fontSize:22,fontWeight:700,width:36,textAlign:"center",color:T.textPrimary}}>{v}</div>
            <button onClick={()=>pbChange(k,+1)} disabled={v>=18}
              style={{width:32,height:32,borderRadius:T.r6,border:`1px solid ${T.border}`,background:T.bg3,color:T.textPrimary,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            <div style={{fontSize:14,fontWeight:600,color:modOf(v)>=0?T.success:T.danger,width:32}}>{fmod(modOf(v))}</div>
            <div style={{marginLeft:"auto",fontSize:11,color:T.textMuted}}>Costo: {PB_COST[v]||0}pt</div>
          </div>;
        })}
      </div>
    </div>}
    {method==="Tiro di Dado"&&<div>
      <InfoBox color="blue">4d6, scarta il dado più basso, somma i 3 restanti. Ripeti 6 volte.</InfoBox>
      <Divider m="16px 0"/>
      <div style={{marginBottom:16}}><Btn variant="primary" onClick={rollAll}>🎲 Tira tutti e 6</Btn></div>
      {rollResults.some(r=>r!==null)&&<>
        <Label>Risultati ({usedRollIdxs.length}/6 assegnati)</Label>
        <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
          {rollResults.map((v,i)=>{
            const used=usedRollIdxs.includes(i);
            return <div key={i} onClick={()=>!used&&set("_selRollIdx",char._selRollIdx===i?null:i)}
              style={{padding:"10px 16px",borderRadius:T.r8,fontSize:20,fontWeight:700,minWidth:52,textAlign:"center",cursor:used?"default":"pointer",transition:T.tr,
                background:used?T.bg3:char._selRollIdx===i?T.accent:T.bg2,
                border:`1px solid ${used?T.border:char._selRollIdx===i?T.accent:T.borderHover}`,
                color:used?T.textDisabled:char._selRollIdx===i?"#181c1f":T.textPrimary,opacity:used?.4:1}}>{v||"—"}</div>;
          })}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {STAT_KEYS.map(k=>{
            const ai=char.rollAssigned?.[k], assigned=ai!==undefined?(char.rollResults||[])[ai]:null;
            return <div key={k} onClick={()=>{
              if(assigned!==null&&ai!==undefined){const n={...char.rollAssigned};delete n[k];set("rollAssigned",n);const bs={STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10};STAT_KEYS.forEach(kk=>{if(n[kk]!==undefined)bs[kk]=(char.rollResults||[])[n[kk]]||10;});set("baseStats",bs);}
              else if(char._selRollIdx!=null){assignRoll(k,char._selRollIdx);set("_selRollIdx",null);}
            }}
            style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:T.r8,
              background:assigned?T.bg2:T.bg1,border:`1px solid ${assigned?T.accentDim:T.border}`,cursor:"pointer",transition:T.tr}}>
              <div style={{width:90,fontSize:14,color:T.textPrimary,fontWeight:600}}>{STAT_LABELS[k]}</div>
              <div style={{width:36,fontSize:22,fontWeight:700,textAlign:"center",color:assigned?T.textPrimary:T.textDisabled}}>{assigned||"—"}</div>
              <div style={{fontSize:14,fontWeight:600,color:assigned&&modOf(assigned)>=0?T.success:T.danger}}>{assigned?fmod(modOf(assigned)):""}</div>
            </div>;
          })}
        </div>
      </>}
    </div>}
    {char.race&&<>
      <Divider m="28px 0 20px"/>
      <Label>Anteprima statistiche finali con modificatori razziali</Label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
        {STAT_KEYS.map(k=>{
          const final=finalPrev[k]||10;
          const rm=computeRaceMods(char.race,char.raceFreeBoost)[k]||0;
          return <div key={k} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:T.r8,padding:"12px 6px",textAlign:"center"}}>
            <div style={{fontSize:9,color:T.textMuted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{STAT_SHORT[k]}</div>
            <div style={{fontSize:22,fontWeight:700,color:T.textPrimary,lineHeight:1}}>{final}</div>
            <div style={{fontSize:12,fontWeight:600,color:T.accent}}>{fmod(modOf(final))}</div>
            {rm!==0&&<div style={{fontSize:10,color:rm>0?T.success:T.danger,marginTop:3}}>{rm>0?`+${rm}`:rm} razza</div>}
          </div>;
        })}
      </div>
    </>}
  </div>;
}

function StepSkillsFeats({char, set}) {
  const finalStats = char.finalStats||{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10};
  const cls = char.class ? CLASSES[char.class] : null;
  const ranks = skillRanksAvailable(char);
  const spent = Object.values(char.skillRanks||{}).reduce((a,b)=>a+(b||0),0);
  const remRanks = ranks - spent;
  function changeRank(skill,delta) {
    const cur=(char.skillRanks||{})[skill]||0, next=cur+delta;
    if(next<0||next>1||( delta>0&&remRanks<=0))return;
    set("skillRanks",{...(char.skillRanks||{}),[skill]:next});
  }
  const featCount = 1+(char.race==="Umano"?1:0)+(char.class==="Guerriero"?1:0);
  const chosen = char.feats||[];
  function toggleFeat(f){ if(chosen.includes(f))set("feats",chosen.filter(x=>x!==f)); else if(chosen.length<featCount)set("feats",[...chosen,f]); }
  const skillTotal = skill=>{
    const sd=SKILLS_DATA.find(s=>s.key===skill); if(!sd)return 0;
    const rank=(char.skillRanks||{})[skill]||0, isClass=cls?.classSkills?.includes(skill);
    return rank+modOf(finalStats[sd.stat]||10)+(isClass&&rank>0?3:0);
  };
  const [ff,sff] = useState("tutti");
  return <div>
    <STitle>Abilità e Talenti</STitle>
    <SubT>Gradi e doti al 1° livello</SubT>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <Label>Gradi di Abilità</Label>
      <div style={{fontSize:13,color:remRanks<0?T.danger:T.textSecondary}}>{spent}/{ranks} gradi</div>
    </div>
    <InfoBox color="blue">Le <strong style={{color:T.info}}>abilità di classe</strong> ottengono +3 con almeno 1 grado. Max 1 grado per abilità al 1° livello.{char.race==="Umano"&&<span style={{color:T.accent}}> Umano: +1 grado/livello.</span>}</InfoBox>
    <Divider m="14px 0"/>
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {SKILLS_DATA.map(({key:skill,stat,trainedOnly})=>{
        const rank=(char.skillRanks||{})[skill]||0, isClass=cls?.classSkills?.includes(skill), total=skillTotal(skill);
        return <div key={skill} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:T.r8,
          background:rank>0?T.bg2:T.bg1,border:`1px solid ${rank>0?T.accentDim:T.border}`,transition:T.tr}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,color:rank>0?T.textPrimary:T.textSecondary,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              {skill}{isClass&&<Badge color="accent">Classe</Badge>}{trainedOnly&&<Badge color="muted">Add.</Badge>}
            </div>
            <div style={{fontSize:10,color:T.textMuted}}>{STAT_SHORT[stat]}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>changeRank(skill,-1)} disabled={rank<=0}
              style={{width:26,height:26,borderRadius:T.r4,border:`1px solid ${T.border}`,background:T.bg3,color:T.textPrimary,fontSize:16,cursor:rank<=0?"not-allowed":"pointer",opacity:rank<=0?.3:1,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
            <div style={{width:20,textAlign:"center",fontSize:14,fontWeight:700,color:rank>0?T.accent:T.textMuted}}>{rank}</div>
            <button onClick={()=>changeRank(skill,+1)} disabled={rank>=1||remRanks<=0}
              style={{width:26,height:26,borderRadius:T.r4,border:`1px solid ${T.border}`,background:T.bg3,color:T.textPrimary,fontSize:16,cursor:rank>=1||remRanks<=0?"not-allowed":"pointer",opacity:rank>=1||remRanks<=0?.3:1,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            <div style={{width:32,textAlign:"right",fontSize:14,fontWeight:600,color:total>=0?T.textPrimary:T.danger}}>{fmod(total)}</div>
          </div>
        </div>;
      })}
    </div>
    <Divider m="28px 0"/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <Label>Talenti ({chosen.length}/{featCount})</Label>
      <div style={{fontSize:12,color:T.textMuted}}>{char.race==="Umano"&&"Umano: +1 · "}{char.class==="Guerriero"&&"Guerriero: +1 da combattimento"}</div>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      {["tutti","combattimento","generale"].map(f=>(
        <button key={f} onClick={()=>sff(f)}
          style={{padding:"6px 14px",borderRadius:T.r6,fontSize:12,fontFamily:T.fontBody,fontWeight:600,cursor:"pointer",transition:T.tr,
            background:ff===f?T.accent:T.bg2,border:`1px solid ${ff===f?T.accent:T.border}`,color:ff===f?"#181c1f":T.textPrimary}}>
          {f.charAt(0).toUpperCase()+f.slice(1)}
        </button>
      ))}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {Object.entries(FEATS).filter(([,f])=>ff==="tutti"||f.type===ff).map(([name,feat])=>{
        const isSel=chosen.includes(name);
        return <div key={name} onClick={()=>toggleFeat(name)}
          style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 14px",borderRadius:T.r8,cursor:"pointer",
            background:isSel?T.bg2:T.bg1,border:`1px solid ${isSel?T.accentDim:T.border}`,transition:T.tr}}>
          <div style={{width:16,height:16,borderRadius:4,flexShrink:0,marginTop:2,background:isSel?T.accent:T.bg3,border:`1px solid ${isSel?T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#181c1f"}}>{isSel&&"✓"}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:isSel?T.textPrimary:T.textSecondary,marginBottom:2}}>{name}</div>
            <div style={{fontSize:12,color:T.textMuted,lineHeight:1.5}}>{feat.desc}</div>
            {feat.prereq&&<div style={{fontSize:11,color:T.info,marginTop:3}}>Prerequisito: {feat.prereq}</div>}
          </div>
          <Badge color={feat.type==="combattimento"?"accent":"muted"}>{feat.type}</Badge>
        </div>;
      })}
    </div>
  </div>;
}

function StepSummary({char}) {
  const d = useMemo(()=>derivedStats(char),[char]);
  const cls = char.class ? CLASSES[char.class] : null;
  const skillTotal = skill=>{
    const sd=SKILLS_DATA.find(s=>s.key===skill); if(!sd)return null;
    const rank=(char.skillRanks||{})[skill]||0, isClass=cls?.classSkills?.includes(skill);
    return rank+modOf(d.stats[sd.stat]||10)+(isClass&&rank>0?3:0);
  };
  const trained = SKILLS_DATA.filter(s=>(char.skillRanks||{})[s.key]>0);
  return <div>
    <STitle>Riepilogo</STitle>
    <SubT>Il personaggio è pronto per l'avventura</SubT>
    <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:T.r12,padding:"20px 22px",marginBottom:20}}>
      <div style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:600,color:T.textPrimary,marginBottom:4}}>{char.name||"Senza Nome"}</div>
      <div style={{fontSize:15,color:T.textSecondary,marginBottom:6}}>{[char.race,char.class,"Livello 1"].filter(Boolean).join(" ")}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {char.alignment&&<Badge color="muted">{ALIGNMENTS.find(a=>a.v===char.alignment)?.l}</Badge>}
        {char.deity&&char.deity!=="Nessuno"&&<Badge color="muted">⚜ {char.deity}</Badge>}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:20}}>
      {STAT_KEYS.map(k=>(
        <div key={k} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:T.r8,padding:"12px 6px",textAlign:"center"}}>
          <div style={{fontSize:9,color:T.textMuted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{STAT_SHORT[k]}</div>
          <div style={{fontSize:22,fontWeight:700,color:T.textPrimary,lineHeight:1}}>{d.stats[k]}</div>
          <div style={{fontSize:12,fontWeight:600,color:T.accent}}>{fmod(modOf(d.stats[k]))}</div>
        </div>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
      {[["PF",d.hpMax,T.success],["CA",d.ac,T.textPrimary],["Iniziativa",fmod(d.init),T.textPrimary],
        ["Tempra",fmod(d.fort),T.textPrimary],["Riflessi",fmod(d.ref),T.textPrimary],["Volontà",fmod(d.will),T.textPrimary],
        ["BAB",fmod(d.bab),T.textPrimary],["CMB",fmod(d.cmb),T.textPrimary],["CMD",d.cmd,T.textPrimary]
      ].map(([l,v,c])=>(
        <div key={l} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:T.r8,padding:"12px 8px",textAlign:"center"}}>
          <div style={{fontSize:10,color:T.textMuted,letterSpacing:1.4,textTransform:"uppercase",marginBottom:4}}>{l}</div>
          <div style={{fontSize:22,fontWeight:700,color:c||T.textPrimary,lineHeight:1}}>{v}</div>
        </div>
      ))}
    </div>
    {trained.length>0&&<>
      <Divider m="0 0 16px"/>
      <Label>Abilità Addestrate</Label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:20}}>
        {trained.map(({key:sk})=>{
          const t=skillTotal(sk), isClass=cls?.classSkills?.includes(sk);
          return <div key={sk} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:T.r8,background:T.bg2,border:`1px solid ${T.accentDim}`}}>
            <div style={{flex:1,fontSize:13,color:T.textPrimary}}>{sk}</div>
            {isClass&&<Badge color="accent">CS</Badge>}
            <div style={{fontSize:14,fontWeight:700,color:T.accent}}>{fmod(t)}</div>
          </div>;
        })}
      </div>
    </>}
    {chosen?.length>0&&<>
      <Label>Talenti</Label>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {(char.feats||[]).map(f=>(
          <div key={f} style={{padding:"8px 14px",borderRadius:T.r8,background:T.bg2,border:`1px solid ${T.accentDim}`,fontSize:14,color:T.textPrimary,fontWeight:600}}>
            {f}<div style={{fontSize:12,color:T.textMuted,fontWeight:400,marginTop:2}}>{FEATS[f]?.desc}</div>
          </div>
        ))}
      </div>
    </>}
    <div style={{height:16}}/>
    <InfoBox><strong style={{color:T.accent}}>Pronto! </strong>Premi <strong>Salva Personaggio</strong> per salvarlo nel cloud.</InfoBox>
  </div>;
}

// ─── WIZARD ───────────────────────────────────────────────────────────────────
const STEPS = ["Manuali","Identità","Razza","Classe","Caratteristiche","Abilità & Talenti","Riepilogo"];

function canProceed(step, char, books) {
  if(step===0) return books.length>0;
  if(step===1) return !!char.name?.trim();
  if(step===2) { const r=char.race?RACES[char.race]:null; return r&&(r.freeBoost===0||char.raceFreeBoost); }
  if(step===3) { if(!char.class)return false; const c=CLASSES[char.class]; return !(c?.alignment&&!c.alignment.includes(char.alignment||"N")); }
  if(step===4) {
    const m=char.abilityMethod||"Standard Array";
    if(m==="Standard Array") return Object.keys(char.arrayAssigned||{}).length===6;
    if(m==="Point Buy") return STAT_KEYS.reduce((a,k)=>a+(PB_COST[(char.pbValues||{})[k]||10]||0),0)<=PB_POOLS[char.pbPool||"Fantasy Alta (20)"];
    return Object.keys(char.rollAssigned||{}).length===6;
  }
  if(step===5) {
    const ranks=skillRanksAvailable(char);
    const spent=Object.values(char.skillRanks||{}).reduce((a,b)=>a+(b||0),0);
    const fc=1+(char.race==="Umano"?1:0)+(char.class==="Guerriero"?1:0);
    return spent<=ranks&&(char.feats||[]).length===fc;
  }
  return true;
}

function buildFinalChar(char) {
  const base = char.baseStats||{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10};
  const final = applyRace(base, char.race, char.raceFreeBoost);
  const withF = {...char, finalStats:final};
  const d = derivedStats(withF);
  return {...withF, id:char.id||genId(), level:1,
    hp:{current:d.hpMax,max:d.hpMax,temp:0},
    createdAt:char.createdAt||new Date().toISOString()};
}

function PF1eWizard({onSave, onCancel, editChar=null, savedBooks}) {
  const [books, setBooks] = useState(()=>{
    try { return JSON.parse(localStorage.getItem(BOOKS_LS_KEY)||"null")||["CRB"]; }
    catch { return ["CRB"]; }
  });
  const [step, setStep] = useState(editChar ? 1 : 0);
  const [char, setChar] = useState(editChar || {
    name:"", player:"", age:"", gender:"", alignment:"N", deity:"Nessuno",
    race:null, raceFreeBoost:null, class:null,
    abilityMethod:"Standard Array", pbPool:"Fantasy Alta (20)",
    baseStats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},
    arrayAssigned:{}, pbValues:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},
    rollResults:[null,null,null,null,null,null], rollAssigned:{},
    finalStats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},
    skillRanks:{}, feats:[],
  });

  function set(k,v) { setChar(c=>({...c,[k]:v})); }

  useEffect(()=>{
    if(char.race&&char.baseStats) {
      const final = applyRace(char.baseStats, char.race, char.raceFreeBoost);
      setChar(c=>({...c,finalStats:final}));
    }
  }, [char.baseStats, char.race, char.raceFreeBoost]);

  useEffect(()=>{ localStorage.setItem(BOOKS_LS_KEY, JSON.stringify(books)); }, [books]);

  const steps = [
    <StepBooks key={0} books={books} setBooks={setBooks}/>,
    <StepIdentity key={1} char={char} set={set}/>,
    <StepRace key={2} char={char} set={set} books={books}/>,
    <StepClass key={3} char={char} set={set} books={books}/>,
    <StepAbilities key={4} char={char} set={set}/>,
    <StepSkillsFeats key={5} char={char} set={set}/>,
    <StepSummary key={6} char={char}/>,
  ];
  const ok = canProceed(step, char, books);

  return <div style={{minHeight:"100vh",background:T.bg0,fontFamily:T.fontBody,color:T.textPrimary}}>
    <div style={{position:"sticky",top:0,zIndex:100,background:`${T.bg0}f0`,backdropFilter:"blur(12px)",
      borderBottom:`1px solid ${T.border}`,padding:"14px 24px"}}>
      <div style={{maxWidth:720,margin:"0 auto"}}>
        <StepBar steps={STEPS} current={step}/>
      </div>
    </div>
    <div style={{maxWidth:720,margin:"0 auto",padding:"40px 24px 110px"}}>{steps[step]}</div>
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:`${T.bg0}f0`,
      backdropFilter:"blur(12px)",borderTop:`1px solid ${T.border}`,padding:"14px 24px"}}>
      <div style={{maxWidth:720,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Btn variant="secondary" onClick={step===0?onCancel:()=>setStep(s=>s-1)}>
          {step===0?"✕ Annulla":"← Indietro"}
        </Btn>
        <span style={{fontSize:12,color:T.textMuted}}>{step+1}/{STEPS.length}</span>
        {step<STEPS.length-1
          ?<Btn variant="primary" onClick={()=>setStep(s=>s+1)} disabled={!ok}>Avanti →</Btn>
          :<Btn variant="primary" onClick={()=>onSave(buildFinalChar(char))}>✓ Salva Personaggio</Btn>}
      </div>
    </div>
  </div>;
}

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
function HomeScreen({user, chars, loading, onCreate, onSelect, onDelete}) {
  const [deleting, setDeleting] = useState(null);
  async function confirmDelete(id) {
    setDeleting(id);
    await onDelete(id);
    setDeleting(null);
  }
  return <div style={{minHeight:"100vh",background:T.bg0,fontFamily:T.fontBody,color:T.textPrimary}}>
    {/* Top bar */}
    <div style={{borderBottom:`1px solid ${T.border}`,padding:"14px 24px",
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontFamily:T.fontDisplay,fontSize:20,fontWeight:600,color:T.textPrimary}}>
        Pathfinder 1e
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontSize:13,color:T.textMuted}}>{user.email}</div>
        <Btn variant="ghost" size="sm" onClick={()=>signOut(auth)}>Esci</Btn>
      </div>
    </div>
    <div style={{maxWidth:720,margin:"0 auto",padding:"40px 24px"}}>
      <div style={{marginBottom:40}}>
        <div style={{fontSize:10,color:T.accentDim,letterSpacing:3.5,textTransform:"uppercase",fontWeight:600,marginBottom:10}}>
          I tuoi Personaggi
        </div>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16}}>
          <h1 style={{margin:0,fontSize:38,fontFamily:T.fontDisplay,fontWeight:600,color:T.textPrimary,lineHeight:1.05}}>
            {loading ? "Caricamento..." : chars.length===0 ? "Nessun personaggio" : `${chars.length} personagg${chars.length===1?"io":"i"}`}
          </h1>
          <Btn variant="primary" onClick={onCreate}>+ Crea Nuovo</Btn>
        </div>
      </div>

      {loading && (
        <div style={{textAlign:"center",padding:"40px 0",color:T.textMuted,fontSize:14}}>
          Caricamento personaggi...
        </div>
      )}

      {!loading && chars.length===0 && (
        <div style={{background:T.bg1,border:`1px solid ${T.border}`,borderRadius:T.r12,
          padding:"48px 24px",textAlign:"center"}}>
          <div style={{fontFamily:T.fontDisplay,fontSize:28,color:T.textPrimary,marginBottom:8}}>
            Crea il tuo primo personaggio
          </div>
          <div style={{fontSize:14,color:T.textSecondary,marginBottom:24,lineHeight:1.7}}>
            La creazione guidata ti accompagnerà passo per passo attraverso<br/>
            le regole di Pathfinder 1a Edizione.
          </div>
          <Btn variant="primary" size="lg" onClick={onCreate}>Inizia la Creazione</Btn>
        </div>
      )}

      {!loading && chars.length>0 && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {chars.map(c=>{
            const d = derivedStats(c);
            return <div key={c.id}
              style={{background:T.bg1,border:`1px solid ${T.border}`,borderRadius:T.r12,
                padding:"18px 20px",display:"flex",alignItems:"center",gap:16,
                cursor:"pointer",transition:T.tr}}
              onClick={()=>onSelect(c)}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHover}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:20,fontWeight:600,fontFamily:T.fontDisplay,
                  color:T.textPrimary,marginBottom:2}}>{c.name}</div>
                <div style={{fontSize:13,color:T.textSecondary}}>
                  {[c.race, c.class, "Livello "+c.level].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div style={{display:"flex",gap:14,alignItems:"center",flexShrink:0}}>
                {[["PF",d.hpMax,T.success],["CA",d.ac,T.textPrimary],["BAB",fmod(d.bab),T.accent]].map(([l,v,col])=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:700,color:col}}>{v}</div>
                    <div style={{fontSize:9,color:T.textMuted,letterSpacing:1,textTransform:"uppercase"}}>{l}</div>
                  </div>
                ))}
                <button
                  onClick={e=>{e.stopPropagation();confirmDelete(c.id);}}
                  disabled={deleting===c.id}
                  style={{background:T.dangerBg,border:"1px solid rgba(200,72,72,.3)",
                    color:T.danger,padding:"6px 10px",borderRadius:T.r6,
                    cursor:"pointer",fontSize:13,opacity:deleting===c.id?.5:1}}>
                  {deleting===c.id?"...":"✕"}
                </button>
              </div>
            </div>;
          })}
        </div>
      )}
    </div>
  </div>;
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user,    setUser]    = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [chars,   setChars]   = useState([]);
  const [charsLoading, setCharsLoading] = useState(false);
  const [screen,  setScreen]  = useState("home");
  const [editing, setEditing] = useState(null);

  // Ascolta i cambi di autenticazione
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      setAuthLoading(false);
      if(u) {
        setCharsLoading(true);
        const loaded = await loadUserChars(u.uid);
        setChars(loaded);
        setCharsLoading(false);
      } else {
        setChars([]);
      }
    });
    return unsub;
  }, []);

  async function handleSave(char) {
    const final = buildFinalChar(char);
    await saveChar(user.uid, final);
    setChars(cs => {
      const i = cs.findIndex(c=>c.id===final.id);
      if(i>=0) { const n=[...cs]; n[i]=final; return n; }
      return [final, ...cs];
    });
    setScreen("home"); setEditing(null);
  }

  async function handleDelete(id) {
    await deleteChar(user.uid, id);
    setChars(cs => cs.filter(c=>c.id!==id));
  }

  // Loading iniziale
  if(authLoading) {
    return <div style={{minHeight:"100vh",background:T.bg0,display:"flex",
      alignItems:"center",justifyContent:"center",color:T.textMuted,fontFamily:T.fontBody}}>
      Caricamento...
    </div>;
  }

  // Non autenticato → schermata login
  if(!user) return <AuthScreen/>;

  // Wizard creazione/modifica
  if(screen==="create"||screen==="edit") {
    return <PF1eWizard
      editChar={editing}
      onSave={handleSave}
      onCancel={()=>{ setScreen("home"); setEditing(null); }}/>;
  }

  // Home
  return <HomeScreen
    user={user}
    chars={chars}
    loading={charsLoading}
    onCreate={()=>{ setEditing(null); setScreen("create"); }}
    onSelect={c=>{ setEditing(c); setScreen("edit"); }}
    onDelete={handleDelete}/>;
}
