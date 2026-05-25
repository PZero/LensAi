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

## 🗺️ Collegamenti Rapidi alla Documentazione

Per comprendere a fondo tutti i dettagli tecnici dell'infrastruttura, delle interfacce, della sicurezza e delle integrazioni di LensAI, consulta il documento dettagliato appositamente creato:

👉 [**LEGGI LA DOCUMENTAZIONE DETTAGLIATA (LENS_AI_DETTAGLI.md)**](./LENS_AI_DETTAGLI.md)

---

## ⚙️ Come Avviare il Progetto (Quick Start)

Se desideri eseguire il progetto localmente o caricarlo su piattaforme di hosting cloud (come **Render.com**), segui questi passaggi:

### 1. Requisiti
- **Node.js** (v18 o superiore)
- **Firebase Project ID** e credenziali Firestore/Auth
- Un account Google (per l'accesso e l'integrazione Google Drive)
- Una **Gemini API Key** personale (inseribile direttamente nell'interfaccia utente in sicurezza)

### 2. Installazione delle dipendenze
```bash
npm install
```

### 3. Configurazione dell'Ambiente
Crea un file `.env` nella directory radice copiandolo da `.env.example`:
```bash
cp .env.example .env
```
Popola le variabili d'ambiente necessarie (specialmente se distribuisci l'applicazione su Render o server esterni):
```env
VITE_FIREBASE_API_KEY=LaTuaChiaveFirebase
VITE_FIREBASE_AUTH_DOMAIN=tuo-progetto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tuo-progetto
VITE_FIREBASE_STORAGE_BUCKET=tuo-progetto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tuo-id
VITE_FIREBASE_APP_ID=tuo-id-app
VITE_FIREBASE_DATABASE_ID=(default)
```

### 4. Avvio in Sviluppo
```bash
npm run dev
```
L'applicazione Express + Vite partirà all'indirizzo `http://localhost:3000`.

### 5. Compilazione per la Produzione
```bash
npm run build
```
Questo comando genererà i file client ottimizzati in `dist/` e compilerà il server Express in un singolo bundle altamente performante `dist/server.cjs` via `esbuild`.

### 6. Avvio in Produzione
```bash
npm run start
```

---

## 📝 Licenza e Limitazione d'Uso
*Trattandosi di un'applicazione sperimentale ad uso personale ed esplorativo per testare l'efficacia dei modelli multimodali di Google Gemini e l'automazione dei sistemi multi-agentici, il software viene fornito "così com'è" senza alcuna garanzia implicita o esplicita di stabilità, sicurezza o manutenibilità commerciale.*
