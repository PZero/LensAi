# LensAI - Guida Tecnica di Archiettura e Sviluppo 🛠️📐

> **Documentazione Dettagliata delle Funzionalità e dell'Architettura Full-Stack**
> 
> *Questo documento offre un viaggio approfondito nell'ingegneria software di LensAI, analizzando ogni singolo blocco costruttivo, dallo stile delle interfacce fino alla gestione dei flussi transitori nel cloud.*

---

## 🔎 Indice Documentale
1. **Nome, Filosofia e Ambito del Progetto**
2. **L'Esperienza Utente Passo-Dopo-Passo (User Flow)**
3. **Architettura Backend (Express + Vite + Cascade Model Execution)**
4. **Architettura Frontend (React 19 + Motion + Tailwind v4)**
5. **Integrazione Integrale con le API di Google Workspace (Drive)**
6. **Infrastruttura Dati Sincrona (Google Firebase Suite)**
7. **Politica di Sicurezza Informatica (API key, Firestore Rules, .gitignore)**

---

## 1. 📸 Nome, Filosofia e Ambito del Progetto
**LensAI** nasce con l'obiettivo di abbattere il confine tra la fotografia istantanea e il conceptual design artistico guidato dai modelli generativi multimodali. 

Il progetto non mira ad essere un prodotto pronto per il mercato (manca di finalità commerciali, scale-up infrastrutturali automatiche o compliance industriali), ma serve a dimostrare la potenza di una **sandbox personale combinata**, in cui l'utente porta i propri canali e chiavi di accesso (il proprio Google Drive, la propria API key di Gemini) per creare un ecosistema di elaborazione fotografica ad costo zero per l'hoster.

---

## 2. 🚶‍♀️ L'Esperienza Utente Passo-Dopo-Passo (User Flow)

Il flusso operativo è lineare, poetico e altamente documentato per guidare l'utente attraverso lo stato della fotografia:

```
[Accesso Google OAuth] 
         │
         ▼
[Verifica Profilo + Heartbeat Presenza] (Firestore online stats)
         │
         ▼
[Cattura Immagine o Drag-and-Drop File] (Crea record con stato 'scattata')
         │
         ▼
[Analisi Multimodale] (Gemini 3.5-Flash -> Genera descrizione 'descritto')
         │
         ▼
[Sviluppo Artistico d'Autore] (Filtro d'Autore o Custom -> Genera Prompt)
         │
         ▼
[Cascata Generativa (Cascade Pipeline)] (Sviluppa immagine -> stato 'completato')
         │
         ▼
[Salvataggio Incrociato Cloud] (Archiviazione su Google Drive & Firestore)
```

1. **Autenticazione Fluida**: L'utente fa l'accesso usando il proprio account Google, concedendo via OAuth i permessi per la visualizzazione/scrittura dei propri file Drive.
2. **Acquisizione dello Scatto**: 
   - Utilizzando l'API `navigator.mediaDevices.getUserMedia` (con l'apposita autorizzazione concessa in `metadata.json`), l'utente può scattare un selfie o una foto ambientale in tempo reale direttamente in-app.
   - In alternativa, l'interfaccia implementa una robusta area di upload drag-and-drop con anteprima interattiva.
3. **Analisi Multimodale (Fase 'descrivendo')**: Lo scatto (trattato nativamente sul client come URL Base64) viene spedito al server. Il modello `gemini-3.5-flash` analizza l'immagine ed elabora una straordinaria, fluida descrizione narrata in prosa italiana (senza punti freddi o diciture robotiche) soffermandosi su volti, vestiti, dettagli spaziali, composizione cromatica e dinamica delle ombre.
4. **Scelta dello Stile Fotografico**: L'utente può scegliere tra 5 stili leggendari preconfigurati:
   - **Tim Flach**: Sfondo nero ad alto contrasto, luci professionali, e un vincolo speciale: *sostituisce i volti umani con musi di animali opportunamente selezionati ad hoc per fisionomia ed espressione*.
   - **Steve McCurry**: Fotogiornalismo National Geographic, caldi toni carichi, sguardi penetranti.
   - **Ansel Adams**: Paesaggio magniloquente in un bianco e nero analogico ad estesissima gamma dinamica.
   - **Annie Leibovitz**: Ritrattistica editoriale sofisticata ed elegante dalle luci soffuse e pennellate classiche.
   - **Daido Moriyama**: Street photography giapponese grezza ad altissimo contrasto con vistosa grana analogica d'argento d'alogenuro.
   - *Oppure un filtro custom scritto in linguaggio naturale dall'utente stesso*.
5. **Configurazione Custom & Sviluppo (Fase 'sviluppando')**: Il server fonde la descrizione meticolosa generata da Gemini con i codici stilistici scelti dall'utente e attiva la pipeline generativa.
6. **Archiviazione Multi-Canale**: L'immagine sviluppata viene trasformata in byte e salvata direttamente in una cartella appositamente creata in automatico all'interno del Google Drive dell'utente ("Sviluppo Foto AI") e contemporaneamente indicizzata in tempo reale su Google Firestore.

---

## 3. 🧠 Architettura Backend (Express + Vite + Cascata Generativa)

Il backend è scritto interamente in TypeScript, gestito su piattaforma Node.js attraverso il framework **Express**.

### Punti Chiave dell'Ingegneria Backend:
* **Payload Massivi**: Configurato per accogliere body JSON fino a `50mb` (`app.use(express.json({ limit: '50mb' }))`) indispensabili per l'invio e la conversione di flussi di immagini fotografiche in formato Base64 a risoluzione nativa.
* **Compilazione standalone ad alte prestazioni**: In fase di build, `esbuild` converte l'entrypoint `server.ts` in un singolo file bundled (`dist/server.cjs`) escludendo i moduli di terze parti con `--packages=external`. Questo garantisce avviamenti ultra-rapidi nei container senza conflitti di percorsi ESModules su Node.
* **Orchestra di Riserva (The Cascade Model Engine)**: 
  La rotta `/api/gemini/develop` per la generazione di immagini d'arte implementa un algoritmo sofisticato di fallback automatico (Cascata Generativa) per aggirare in modo invisibile all'utente eventuali rate-limit temporanei o indisponibilità dei singoli modelli di Google Cloud:
  1. **Tentativo 1**: Modello ufficiale `gemini-2.5-flash-image` (via chiamata `generateContent` del nuovo SDK `@google/genai`).
  2. **Tentativo 2 (Fallback 1)**: Modello dedicato `imagen-3.0-generate-002` (via chiamata nativa `generateImages`).
  3. **Tentativo 3 (Fallback 2)**: Modello rapido `imagen-3.0-fast-generate-001`.
  4. **Tentativo 4 (Fallback Estremo)**: Modello preview `gemini-3.1-flash-image-preview` impostato in calcolo 1K.
  *Se un gradino fallisce, l'errore viene catturato in diagnostica silenziosa e l'algoritmo passa immediatamente al livello successivo in una frazione di secondo.*

---

## 4. 🎨 Architettura Frontend (React 19 + Motion + Tailwind v4)

L'interfaccia di LensAI è minimalista, ad altissimo contrasto, ispirata alle gallerie d'arte moderna.

* **React 19 & TypeScript**: Sfrutta le ultime dichiarazioni stabili per la gestione dello stato e degli hook.
* **Tailwind CSS v4 (Compilato via Vite)**: Utilizza la nuovissima architettura di Tailwind v4, che abbandona i file di configurazione pesanti per integrarsi nativamente nel file CSS globale `@import "tailwindcss";` con modificatori `@theme` personalizzati.
* **Micro-Animazioni Reattive**: Utilizza `motion` (importato da `motion/react`) per animazioni cinematiche, dissolvenze incrociate nel caricamento delle foto dei singoli utenti e transizioni fluide dei menu.
* **Icone Vettoriali Universali**: Importate rigorosamente da `lucide-react` per mantenere pulizia visiva e coerenza nel caricamento, impostazioni, cattura e gestione del database.
* **Zero Layout Fisso (Sizing Dinamico)**: Il canvas per la fotocamera e l'allineamento delle griglie sfruttano un design completamente responsivo basato su flexbox e grid fluide per adattarsi a desktop larghi, monitor ultra-wide, tablet e schermi di smartphone.

---

## 5. 📂 Integrazione Integrale con Google Workspace (Google Drive)

LensAI usa i flussi OAuth di Google non solo per identificare l'utente, ma per operare direttamente sul suo spazio cloud personale a costo infrastrutturale nullo per il proprietario dell'app.

* **Permessi Mirati (`scopes`)**: L'app richiede la visibilità esclusiva dei file creati da essa stessa mediante lo scope `https://www.googleapis.com/auth/drive.file`. Questo protegge l'utente evitando di concedergli accesso all'intero Drive personale privato dell'utente.
* **Gestione della Cartella Automatica**: All'avvio, l'app interroga Drive alla ricerca della cartella radice `'Sviluppo Foto AI'`. Se non la trova, la crea in frazioni di secondo, annotando l'ID del Folder.
* **Upload multipart Base64**: Il client e il server eseguono un caricamento multipart strutturato inviando metadata JSON ed i byte binari codificati in Base64 in un'unica chiamata HTTP POST verso gli endpoint di Google API:
  ```ts
  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink';
  ```
* **Streaming e download On-the-Fly**: Quando l'utente scorre la propria galleria, per aggirare i limiti di blocco delle immagini esterne nei browser e rispettare le regole sui cookie di terze parti, l'app scarica i binari via blob dall'ID del file Drive e li converte localmente in stream Base64:
  ```ts
  const blob = await response.blob();
  const base64 = await toBase64(blob);
  ```

---

## 6. 🔥 Infrastruttura Dati Sincrona (Google Firebase Suite)

Tutto l'indice del catalogo, dei profili e della telemetria delle impostazioni è pilotato da Firebase:

* **Authentication**: Login nativo tramite Google Auth popup integrato con recupero dei Token di accesso workspace.
* **Real-time Heartbeat Presence**: Implementa un ciclo di telemetria dinamica in background in cui il client registra costantemente la propria presenza fisica aggiornando il record `/presence/{userId}` con il timestamp del server (`request.time`). Questo consente all'app di computare e visualizzare in tempo reale sulla UI quanti utenti globali sono online simultaneamente in tutto il mondo in quel preciso istante.
* **Catalogo Foto e Stili Custom**: Persistenza delle recensioni multimodali e dei percorsi remoti delle foto originali e sviluppate, in modo da consentire all'utente di riaprire l'applicazione da qualsiasi browser o dispositivo ritrovando l'esatto catalogo d'arte intatto.

---

## 7. 🔐 Politica di Sicurezza Informatica e Tutela della Privacy

La sicurezza e l'assenza di compromissioni dei dati è l'architrave di LensAI.

### A. Gestione della Chiave di Gemini Utente (Zero Secret Leak)
Il server non memorizza o utilizza una chiave segreta di Gemini cablata nel codice o nelle variabili d'ambiente del server per erogare il servizio ad utenti non fidati. 
1. L'utente digita la propria API key di Gemini (prelevabile da Google AI Studio) direttamente nel pannello **Impostazioni** dell'applicazione.
2. Questa chiave è protetta e legata al profilo utente archiviato nel proprio record privato su Firestore `/users/{userId}`.
3. Ad ogni chiamata verso `/api/gemini/describe` o `/api/gemini/develop`, il client invia temporaneamente via header HTTP sicuri l'API Key usando l'attributo `'x-gemini-api-key'`.
4. Il server istanzia l'oggetto `GoogleGenAI` in modo del tutto effimero e volatile, limitato al ciclo di vita della sola richiesta HTTP corrente. La chiave non viene loggata, persistita sul disco del server o condivisa, proteggendo la privacy e il portafoglio dell'utente.

### B. Isolamento Ermetico dei Dati in Firestore (`firestore.rules`)
Il database Firestore è blindato da un esteso set di regole dichiarative di sicurezza che impediscono accessi indesiderati ad attaccanti remoti:
* **Niente letture selvagge**: Di default, ogni lettura e scrittura è vietata (`allow read, write: if false;`).
* **Isolamento per Proprietario**: Un utente autenticato può accedere unicamente alle risorse in cui il campo `userId` corrisponde al suo identificativo di autenticazione (`request.auth.uid`):
  ```js
  match /users/{userId} {
    allow get, create, update: if request.auth != null && userId == request.auth.uid;
  }
  ```
* **Validazione Struttura Dati**: Le regole non controllano solo l'identità, ma convalidano la dimensione dei dati inseriti, la correttezza formale delle API Key, e l'esatta stringenza degli stati dei processi di sviluppo (ammettendo esclusivamente `'scattata' | 'descrivendo' | 'descritto' | 'sviluppando' | 'completato'`).

### C. Isolamento dei Secret locali per Distribuzioni Esterne (.gitignore)
Per consentire lo sviluppo collaborativo su GitHub evitando l'allerta di credenziali esposte e la compromissione delle chiavi di sviluppo, il repository esclude rigorosamente i file contenenti impostazioni infrastrutturali locali:
* Il file `.gitignore` impedisce il tracciamento di `firebase-applet-config.json` e di qualsiasi profilo `.env*` privato.
* **Deployment flessibile su Render.com**: Nel caso in cui si voglia ospitare l'app in ambienti esterni come Render, dove il file `firebase-applet-config.json` non è presente o non può essere caricato per motivi di sicurezza, l'applicazione è stata riscritta con percorsi di fallback intelligenti:
  - All'avvio, `vite.config.ts` verifica la presenza fisica locale del file configurazione. Se manca, non fallisce la compilazione, ma restituisce un oggetto vuoto.
  - Al contempo, il file `/src/lib/firebase.ts` è predisposto per pescare i parametri di inizializzazione direttamente dalle variabili d'ambiente del server di hosting via `VITE_FIREBASE_API_KEY` ecc., configurabili comodamente dalla GUI di Render, garantendo compilazione fluida e successo della build in produzione in ogni scenario tecnologico.
