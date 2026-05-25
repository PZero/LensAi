# LensAI 📸✨

> **Progetto Esplorativo di Sperimentazione Multimodale e Sviluppo Multi-Agentico**
> 
> *Nota: Questo repository rappresenta un prototipo concettuale e didattico con finalità puramente esplorative. Non ha ambizioni né finalità commerciali di diventare un prodotto industriale o di produzione reale.*

---

## 🌟 Benvenuto in LensAI

**LensAI** è una sandbox fotografica intelligente ed estetica che fonde la fotografia analogica e ritrattistica con l'intelligenza artificiale multimodale. Consente di catturare immagini in tempo reale, ottenerne una descrizione narrata e profonda da parte di **Gemini**, ed eseguire uno "sviluppo artistico" d'autore applicando stili di famosi fotografi (come Steve McCurry, Ansel Adams, Annie Leibovitz, Daido Moriyama, Tim Flach) o filtri personalizzati creati dall'utente.

Tutto il flusso di elaborazione è sincronizzato in tempo reale con il tuo **Google Drive** personale e indicizzato in sicurezza su **Google Firebase**.

---

## 🤖 La Genesi del Progetto: L'Esperienza Multi-Agentica

La caratteristica più straordinaria di LensAI non risiede solo nelle sue capacità tecnologiche, ma nel **metodo in cui è stata ideata, programmata e rifinita**. 

L'intero codice di questa applicazione full-stack è stato concepito ed implementato in modo autonomo e collaborativo attraverso il sistema **Multi-Agentico di Google AI Studio Build**.

### Come ha funzionato la sinergia uomo-macchina:
1. **L'Uomo come Regista e Product Owner**: L'utente si è limitato a tracciare la visione, descrivere le funzionalità desiderate (es. *"voglio lo sviluppo fotografico"*, *"integriamo Google Drive per il salvataggio"*), e gestire le credenziali dal proprio pannello di controllo.
2. **Gli Agenti come Sviluppatori Software Autonomi**: Un team di agenti AI specializzati operanti sotto il framework *Antigravity* e alimentati dai modelli di frontiera di Google (Gemini) ha:
   - **Pianificato l'architettura**: Ideato lo schema dati per Firestore (`src/types.ts`) e la transizione degli scenari.
   - **Tradotto i requisiti in codice**: Scritto tutte le linee di codice React, Express, e gli integratori d'API.
   - **Garantito l'integrità del codice**: Eseguito cicli continui di "compile & linting" per correggere autonomamente errori di sintassi o tipi non definiti prima di proporre il codice.
   - **Gestito la sicurezza**: Identificato secret sensibili nel repository (es. il file di configurazione `firebase-applet-config.json` che è stato rimosso dai log remoti e inserito in `.gitignore`) e strutturato regole di Firebase per l'isolamento dei dati.
   - **Integrato architetture complesse di fallback**: Formulato una "cascade pipeline" di quattro modelli alternativi di generazione immagini nel server per evitare disservizi in caso di rate-limit.

Questo progetto testimonia come lo sviluppo software moderno possa evolvere verso un modello in cui il programmatore umano non scrive materialmente la sintassi, ma guida l'orchestrazione energetica e semantica dell'AI.

---

## 🛠️ Stack Tecnologico e Architettura Integrata

LensAI si avvale di tecnologie moderne ed efficienti sia a livello client che server, coordinate mediante un sistema decentralizzato basato sulle risorse dell'utente (Bring-Your-Own-Credentials):

```
                     ┌──────────────────────────────────────────────┐
                     │          LENS AI CLIENT (React 19)           │
                     └──────┬────────────────────┬────────────▲─────┘
                            │                    │            │
                            │ 1. Auth            │ 3. Salva   │ 4. Legge
                            ▼                    ▼  Immagini  │  Galleria
                   ┌─────────────────┐         ┌──────┐       │
                   │  FIREBASE SUITE │         │DRIVE │───────┘
                   │ (Auth, Firestore│         └──────┘
                   │  & Online Stats)│        (User Folder)
                   └──────┬──────────┘
                          │
                          │ 2. Proxy Richieste con API Key Utente
                          ▼
                     ┌──────────────────────────────────────────────┐
                     │          LENS AI SERVER (Express)            │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            │ Esegue Cascade Pipeline
                                            ▼
                               ┌──────────────────────────┐
                               │     GEMINI API SUITE     │
                               │ (describe & image gen)   │
                               └──────────────────────────┘
```

### 💻 Stack Tecnologico Core:
* **Frontend**: **React 19** e **TypeScript** per una gestione tipizzata e reattiva dello stato.
* **Styling**: **Tailwind CSS v4** integrato nativamente tramite plugin Vite per interfacce fluide con temi scuri e un design ad altissimo contrasto.
* **Animazioni**: **Motion** (da `motion/react`) per micro-interazioni, gallerie animate ed effetti di dissolvenza.
* **Backend**: **Express (Node.js)** compilato e compresso in produzione in un unico bundle autogestito (`dist/server.cjs`) tramite **esbuild**.

### 🔥 Architettura dei Componenti Firebase:
L'integrazione di Firebase è organizzata in modo sincrono per proteggere ed ospitare i singoli dati dei diversi utenti:
1. **Firebase Authentication (Google Provider)**: Consente l'autenticazione sicura tramite popup, ottenendo i token necessari sia per l'identificazione che per le chiamate autorizzate a Google Drive.
2. **Cloud Firestore (Database NoSQL)**:
   - **`/users/{userId}`**: Memorizza le impostazioni dell'utente (come la Gemini API Key privata in modo crittografato ed isolato).
   - **`/presence/{userId}`**: Utilizzato per registrare l'heartbeat di presenza in tempo reale dell'utente attivo.
   - **`/scans/{scanId}`**: Catalogo indicizzato delle immagini scattate e generate con i relativi metadati stilistici e descrittivi.

### 🧠 Modelli di Intelligenza Artificiale (Gemini APIs):
L'elaborazione delle immagini e la visione artificiale sono implementate attraverso l'SDK ufficiale `@google/genai`:
* **Modello di Visione (Analisi)**: `gemini-3.5-flash` per l'interpretazione critica delle foto inviate e la stesura in linguaggio naturale delle descrizioni d'autore.
* **Cascata Generativa (Sviluppo Artistico)**: Pipeline di generazione immagini con fallback automatico e tolleranza ai guasti:
  1. `gemini-2.5-flash-image` (Generazione primaria)
  2. `imagen-3.0-generate-002` (Primo fallback)
  3. `imagen-3.0-fast-generate-001` (Secondo fallback)
  4. `gemini-3.1-flash-image-preview` (Fallback d'emergenza)

---

## 🗺️ Collegamenti Rapidi alla Documentazione

Per comprendere a fondo tutti i dettagli tecnici dell'infrastruttura, delle interfacce, della sicurezza e delle integrazioni di LensAI, consulta il documento dettagliato appositamente creato:

👉 [**LEGGI LA DOCUMENTAZIONE DETTAGLIATA (LENS_AI_DETTAGLI.md)**](./LENS_AI_DETTAGLI.md)

---

## 📝 Licenza e Limitazione d'Uso
*Trattandosi di un'applicazione sperimentale ad uso personale ed esplorativo per testare l'efficacia dei modelli multimodali di Google Gemini e l'automazione dei sistemi multi-agentici, il software viene fornito "così com'è" senza alcuna garanzia implicita o esplicita di stabilità, sicurezza o manutenibilità commerciale.*
