import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import readmeText from '../README.md?raw';
// @ts-ignore
import dettagliText from '../LENS_AI_DETTAGLI.md?raw';
// @ts-ignore
import aiStudioGuide1 from './assets/images/ai_studio_guide_1_1780001294224.png';
// @ts-ignore
import aiStudioGuide2 from './assets/images/ai_studio_guide_2_1780001515769.png';
// @ts-ignore
import aiStudioGuide3 from './assets/images/ai_studio_guide_3_1780001662530.png';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  Settings, 
  LogOut, 
  Database, 
  Users, 
  Sparkles, 
  Trash2, 
  RotateCcw, 
  CheckCircle, 
  FileText, 
  ChevronRight, 
  ExternalLink,
  Plus,
  Compass,
  Layout,
  Info,
  KeyRound,
  Eye,
  RefreshCw,
  HelpCircle,
  Heart,
  Share2,
  Copy,
  X
} from 'lucide-react';

import { db, auth, initAuth, googleSignIn, logout, handleFirestoreError, OperationType } from './lib/firebase';
import { getOrCreateDevelopFolder, uploadBase64ToDrive, listFilesFromFolder, downloadFileAsBase64, deleteFileFromDrive } from './lib/drive';
import { 
  PhotoItem, 
  PhotoStatus, 
  CustomStyle, 
  PhotographerStyle, 
  PRESET_PHOTOGRAPHERS 
} from './types';

// Smart Google Drive Image loader with auto fallback and on-demand download capabilities
function DriveImg({ 
  src, 
  driveId, 
  alt, 
  className, 
  fallbackLabel,
  accessToken
}: { 
  src?: string; 
  driveId?: string; 
  alt: string; 
  className?: string; 
  fallbackLabel: string;
  accessToken: string | null;
}) {
  const [loadedSrc, setLoadedSrc] = useState<string>('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (src && src.startsWith('data:')) {
      setLoadedSrc(src);
      setErrorVisible(false);
      return;
    }

    let active = true;
    if (driveId && accessToken) {
      setLoading(true);
      setErrorVisible(false);
      downloadFileAsBase64(accessToken, driveId)
        .then(base64 => {
          if (active) {
            setLoadedSrc(base64);
            setLoading(false);
          }
        })
        .catch(err => {
          console.warn(`DriveImg failed to download ID: ${driveId}`, err);
          if (active) {
            if (src) {
              setLoadedSrc(src);
            } else {
              setErrorVisible(true);
            }
            setLoading(false);
          }
        });
    } else if (src) {
      setLoadedSrc(src);
      setErrorVisible(false);
    } else {
      setErrorVisible(true);
    }

    return () => {
      active = false;
    };
  }, [src, driveId, accessToken]);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950/80 text-zinc-550 font-mono text-[10.5px] gap-2 p-3 text-center">
        <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
        <span>Download da Drive...</span>
      </div>
    );
  }

  if (errorVisible || !loadedSrc) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-zinc-650 text-xs font-mono p-3 text-center">
        {fallbackLabel}
      </div>
    );
  }

  return (
    <img 
      src={loadedSrc} 
      alt={alt} 
      className={className} 
      referrerPolicy="no-referrer" 
    />
  );
}

// Simple cross-dissolve overlay component for developed photos
function DissolveCard({ 
  original, 
  originalDriveId,
  developed, 
  developedDriveId,
  sideBySide,
  accessToken
}: { 
  original?: string; 
  originalDriveId?: string;
  developed?: string; 
  developedDriveId?: string;
  sideBySide: boolean;
  accessToken: string | null;
}) {
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (sideBySide || (!developed && !developedDriveId)) return;
    const interval = setInterval(() => {
      setShowOriginal(prev => !prev);
    }, 3500);
    return () => clearInterval(interval);
  }, [sideBySide, developed, developedDriveId]);

  if (sideBySide) {
    return (
      <div className="grid grid-cols-2 gap-2 h-64 md:h-80 w-full overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800">
        <div className="relative h-full w-full">
          <DriveImg 
            src={original} 
            driveId={originalDriveId} 
            alt="Scatto Originale" 
            className="h-full w-full object-cover" 
            fallbackLabel="Nessuna immagine originale" 
            accessToken={accessToken} 
          />
          <span className="absolute bottom-2 left-2 bg-black/80 text-[10px] uppercase font-mono px-2 py-1 rounded text-zinc-300 z-10">Originale</span>
        </div>
        <div className="relative h-full w-full">
          <DriveImg 
            src={developed} 
            driveId={developedDriveId} 
            alt="Sviluppo AI" 
            className="h-full w-full object-cover" 
            fallbackLabel="In attesa di sviluppo artistico..." 
            accessToken={accessToken} 
          />
          <span className="absolute bottom-2 left-2 bg-indigo-950/90 text-[10px] uppercase font-mono px-2 py-1 rounded text-indigo-200 border border-indigo-500/30 z-10">AI Foto Art</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-64 md:h-80 w-full overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800">
      <DriveImg 
        src={original} 
        driveId={originalDriveId} 
        alt="Originale" 
        className="absolute inset-0 h-full w-full object-cover" 
        fallbackLabel="Nessuna immagine originale" 
        accessToken={accessToken} 
      />
      
      {(developed || developedDriveId) && (
        <div className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out ${showOriginal ? 'opacity-0' : 'opacity-100'}`}>
          <DriveImg 
            src={developed} 
            driveId={developedDriveId} 
            alt="Developed" 
            className="h-full w-full object-cover" 
            fallbackLabel="In attesa di sviluppo..." 
            accessToken={accessToken} 
          />
        </div>
      )}

      {(developed || developedDriveId) && (
        <div className="absolute bottom-2 left-3 flex gap-1.5 z-10">
          <span className="bg-black/75 text-[9px] uppercase font-mono tracking-wider px-2 py-0.5 rounded text-zinc-300">
            {showOriginal ? 'Scatto Originale' : 'AI Sviluppo Artistico'}
          </span>
          <span className="bg-zinc-900/95 text-[9px] font-mono px-1.5 py-0.5 rounded text-zinc-500">
            Dissolvenza attiva (3.5s)
          </span>
        </div>
      )}
    </div>
  );
}

export const DEFAULT_SYSTEM_PROMPT = `Descrivi minuziosamente questa fotografia in ogni singolo dettaglio per consentire a un generatore di immagini AI di ricrearla in modo eccezionale. 
Analizza attentamente e descrivi esaurientemente nel testo:
1. Il soggetto principale (se ci sono persone o animali descrivi espressioni del viso, emozioni, sorrisi, fisionomia, pose, umori ed interazioni).
2. L'abbigliamento e vestiti (colori, tessuti, stile, accessori, texture).
3. L'ambiente spaziale e lo sfondo (interno/esterno, oggetti sullo sfondo, dinamica, elementi naturali, architetture).
4. Le luci e l'illuminazione (direzione della luce, ombre, intensità, luci dorate, soffuse o flash, ora del giorno).
5. I colori dominanti (saturazione, contrasto energetico o tonalità tenui, palette cromatica).
6. Le prospettive e la composizione d'inquadratura (distanza, angolazione, profondità di campo sfocata, grana cinematografica).

Scrivi la descrizione interamente in lingua italiana, in modo fluido, narrativo, ricco e suggestivo, senza fare elenchi puntati o riepiloghi freddi. Crea una vera e propria opera poematica di descrizione visuale.`;

export const getSafeTime = (date: any): number => {
  if (!date) return 0;
  if (typeof date.toDate === 'function') {
    return date.toDate().getTime();
  }
  if (date.seconds) {
    return date.seconds * 1000;
  }
  const t = new Date(date).getTime();
  return isNaN(t) ? 0 : t;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [activeLandingSection, setActiveLandingSection] = useState<'home' | 'guide' | 'pwa_guide'>('home');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [saveKeyError, setSaveKeyError] = useState<string | null>(null);
  const [loadConfigError, setLoadConfigError] = useState<string | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [appNotification, setAppNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  // GitHub Pages Readme Only view configs
  const [docTab, setDocTab] = useState<'readme' | 'dettagli'>('readme');
  const [forceSandbox, setForceSandbox] = useState(false);
  const isGithubPages = typeof window !== 'undefined' && (
    window.location.hostname.includes('pzero.github.io') ||
    window.location.hostname.includes('github.io') ||
    new URLSearchParams(window.location.search).has('readme')
  );

  // Custom Prompt Description configurations
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState<string>('');

  useEffect(() => {
    setEditablePrompt(customSystemPrompt || DEFAULT_SYSTEM_PROMPT);
  }, [customSystemPrompt]);

  const [localPhotos, setLocalPhotos] = useState<PhotoItem[]>([]);
  const [workflowLogs, setWorkflowLogs] = useState<{ id: string; time: string; text: string; type: 'info' | 'success' | 'warning' | 'error' }[]>([]);
  const [terminalExpanded, setTerminalExpanded] = useState(false);

  const addLog = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('it-IT');
    setWorkflowLogs(prev => [
      { id: Math.random().toString(), time, text, type },
      ...prev
    ].slice(0, 50));
  };

  const showNotification = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setAppNotification({ message, type });
    setTimeout(() => {
      setAppNotification(prev => prev?.message === message ? null : prev);
    }, 8500);
  };

  // statistics
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [globalPhotos, setGlobalPhotos] = useState(0);

  // App state
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<(PhotographerStyle | CustomStyle)[]>([PRESET_PHOTOGRAPHERS[0]]);
  const [loadedSelectedStyleIds, setLoadedSelectedStyleIds] = useState<string[] | null>(null);
  const [dbFirebaseStatus, setDbFirebaseStatus] = useState<'connected' | 'offline' | 'checking'>('checking');
  const [photoIdToDelete, setPhotoIdToDelete] = useState<string | null>(null);
  const [styleIdToDelete, setStyleIdToDelete] = useState<string | null>(null);

  // States for shared/composite clipboard feature
  const [sharingPhotoId, setSharingPhotoId] = useState<string | null>(null);
  const [sharedModalPhoto, setSharedModalPhoto] = useState<PhotoItem | null>(null);
  const [sharedModalImgSrc, setSharedModalImgSrc] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const saveSelectedStyleIdsToCloud = async (stylesList: (PhotographerStyle | CustomStyle)[]) => {
    if (!user) return;
    const ids = stylesList.map(s => 'id' in s ? s.id : s.styleId);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        selectedStyleIds: ids,
        updatedAt: new Date().toISOString()
      });
      setLoadedSelectedStyleIds(ids);
    } catch (err) {
      console.warn("Saving selectedStyleIds to cloud failed (offline):", err);
    }
  };

  const handleToggleStyle = async (style: PhotographerStyle | CustomStyle) => {
    const isPreset = 'id' in style;
    const styleId = isPreset ? (style as PhotographerStyle).id : (style as CustomStyle).styleId;
    
    let next: (PhotographerStyle | CustomStyle)[] = [];
    setSelectedStyles(prev => {
      const exists = prev.some(s => {
        const sId = 'id' in s ? s.id : s.styleId;
        return sId === styleId;
      });
      
      if (exists) {
        if (prev.length <= 1) {
          next = prev;
          return prev; // Keep at least one
        }
        next = prev.filter(s => {
          const sId = 'id' in s ? s.id : s.styleId;
          return sId !== styleId;
        });
      } else {
        next = [...prev, style];
      }
      return next;
    });

    // Calculate next list block safely for cloud save
    const exists = selectedStyles.some(s => {
      const sId = 'id' in s ? s.id : s.styleId;
      return sId === styleId;
    });
    
    let nextSavedList: (PhotographerStyle | CustomStyle)[] = [];
    if (exists) {
      if (selectedStyles.length <= 1) return;
      nextSavedList = selectedStyles.filter(s => {
        const sId = 'id' in s ? s.id : s.styleId;
        return sId !== styleId;
      });
    } else {
      nextSavedList = [...selectedStyles, style];
    }
    
    await saveSelectedStyleIdsToCloud(nextSavedList);
  };

  const getBlendedStyle = (): { name: string; prompt: string; description: string } => {
    if (selectedStyles.length === 0) {
      return {
        name: 'Nessuno stile',
        prompt: '',
        description: 'Nessuno stile selezionato. Seleziona almeno uno stile.'
      };
    }
    if (selectedStyles.length === 1) {
      const single = selectedStyles[0];
      return {
        name: single.name,
        prompt: single.prompt,
        description: 'description' in single ? (single as any).description : 'Stile d\'arte creato dall\'utente.'
      };
    }
    
    // Multiple styles
    const names = selectedStyles.map(s => s.name).join(' + ');
    const prompts = selectedStyles.map(s => `[Stile ${s.name}: ${s.prompt}]`).join(', ');
    const description = `Mix d'autore personalizzato che fonde ${selectedStyles.length} stili selezionati: ${selectedStyles.map(s => s.name).join(', ')}`;
    return {
      name: `Mix: ${names}`,
      prompt: `An artistic blend that fuses the following style prompts: ${prompts}`,
      description
    };
  };
  
  // Custom Style creator
  const [newStyleName, setNewStyleName] = useState('');
  const [newStylePrompt, setNewStylePrompt] = useState('');
  const [showStyleCreator, setShowStyleCreator] = useState(false);

  // Camera & upload
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [userPromptModifier, setUserPromptModifier] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Gallery Display
  const [displaySideBySide, setDisplaySideBySide] = useState(false);
  const [editingDescriptions, setEditingDescriptions] = useState<{ [photoId: string]: string }>({});
  const [savingDescriptions, setSavingDescriptions] = useState<{ [photoId: string]: boolean }>({});

  // Active workflow status
  const [actionLoading, setActionLoading] = useState<string | null>(null); // holds photoId being processed

  // Drag and Drop
  const [isDragging, setIsDragging] = useState(false);

  // Load local photos on mount or user change
  useEffect(() => {
    if (!user) {
      setLocalPhotos([]);
      return;
    }
    addLog(`Caricamento degli scatti locali dal browser...`, "info");
    const stored = localStorage.getItem(`local_photos_${user.uid}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setLocalPhotos(parsed);
        addLog(`Caricati ${parsed.length} scatti memorizzati in locale nel browser.`, "success");
      } catch (e: any) {
        console.error("Local photos parse failed:", e);
        addLog("Errore nel recuperare gli scatti dal browser. Reset della cache locale.", "error");
      }
    } else {
      addLog(`Nessuno scatto precedentemente registrato su questo dispositivo.`, "info");
    }
  }, [user]);

  // Resilient helper to save local photos list to localStorage under the 5MB quota limit
  const safeSaveLocalPhotos = (userId: string, list: PhotoItem[]): PhotoItem[] => {
    try {
      localStorage.setItem(`local_photos_${userId}`, JSON.stringify(list));
      return list;
    } catch (err) {
      console.warn("localStorage quota exceeded! Stripping large base64 image data to fit under the limit...", err);
      addLog("[Quota Browser] Memoria cache locale del browser piena. Ottimizzazione automatica delle immagini locali...", "warning");
      
      let pruned = [...list];
      let strippedCount = 0;
      
      // Loop from oldest (end of the array or older by date) to newest, stripping large data URIs
      // until JSON stringifying fits safely.
      for (let i = pruned.length - 1; i >= 0; i--) {
        const item = { ...pruned[i] };
        let modified = false;
        
        if (item.originalPhotoUrl && item.originalPhotoUrl.startsWith("data:")) {
          item.originalPhotoUrl = ""; // clear base64 content to save space (since files are safely backed up in cloud/Drive)
          modified = true;
        }
        if (item.developedPhotoUrl && item.developedPhotoUrl.startsWith("data:")) {
          item.developedPhotoUrl = ""; // clear base64 content
          modified = true;
        }
        
        if (modified) {
          pruned[i] = item;
          strippedCount++;
          try {
            localStorage.setItem(`local_photos_${userId}`, JSON.stringify(pruned));
            addLog(`[Quota Risolta] Cache locale liberata e compressa con successo per ${strippedCount} scatti storici.`, "success");
            return pruned;
          } catch (innerErr) {
            // still too big, continue stripping older images
          }
        }
      }
      
      // If we stripped all base64 and it STILL doesn't fit, we keep only the 10 most recent photos metadata
      try {
        const superPruned = pruned.slice(0, 10).map(item => {
          const minimal = { ...item };
          if (minimal.originalPhotoUrl?.startsWith("data:")) minimal.originalPhotoUrl = "";
          if (minimal.developedPhotoUrl?.startsWith("data:")) minimal.developedPhotoUrl = "";
          return minimal;
        });
        localStorage.setItem(`local_photos_${userId}`, JSON.stringify(superPruned));
        return superPruned;
      } catch (finalErr) {
        console.error("Critical: Could not fit local photos in localStorage even with aggressive pruning.", finalErr);
        try {
          localStorage.removeItem(`local_photos_${userId}`);
        } catch {}
        return [];
      }
    }
  };

  // Helper to save local photos
  const saveLocalPhoto = (photo: PhotoItem) => {
    if (!user) return;
    setLocalPhotos(prev => {
      const idx = prev.findIndex(p => p.photoId === photo.photoId);
      let updated;
      if (idx > -1) {
        updated = [...prev];
        updated[idx] = photo;
      } else {
        updated = [photo, ...prev];
      }
      const pruned = safeSaveLocalPhotos(user.uid, updated);
      return pruned;
    });
  };

  // Helper to delete local photo
  const deleteLocalPhoto = (photoId: string) => {
    if (!user) return;
    setLocalPhotos(prev => {
      const updated = prev.filter(p => p.photoId !== photoId);
      const pruned = safeSaveLocalPhotos(user.uid, updated);
      return pruned;
    });
  };

  // Merge Firestore photos and Local photos, keeping the most recent copy by photoId
  const getMergedPhotos = (): PhotoItem[] => {
    const map = new Map<string, PhotoItem>();
    
    // 1. Put local photos first safely
    if (Array.isArray(localPhotos)) {
      localPhotos.forEach(p => {
        if (p && p.photoId) {
          map.set(p.photoId, p);
        }
      });
    }
    
    // 2. Overwrite or add with Firestore photos (source of truth if cloud is reachable)
    if (Array.isArray(photos)) {
      photos.forEach(p => {
        if (p && p.photoId) {
          const existing = map.get(p.photoId);
          // Only overwrite if either it doesn't exist, or Firestore is newer (or Firestore matches status and detail)
          if (!existing) {
            map.set(p.photoId, p);
          } else {
            // If Firestore status is further ahead or has more description details, prefer Firestore
            const isFirestoreMoreCurrent = (p.status !== 'scattata' && existing.status === 'scattata') ||
                                           (p.status === 'completato' && existing.status !== 'completato') ||
                                           (p.developedPhotoUrl && !existing.developedPhotoUrl) ||
                                           (p.description && !existing.description);
            if (isFirestoreMoreCurrent || getSafeTime(p.updatedAt) >= getSafeTime(existing.updatedAt)) {
              map.set(p.photoId, p);
            }
          }
        }
      });
    }
    
    // 3. Convert back to array sorted by createdAt / updatedAt desc
    return Array.from(map.values())
      .filter(p => p && p.photoId) // extra defense
      .sort((a, b) => {
        const timeA = getSafeTime(a.createdAt || a.updatedAt);
        const timeB = getSafeTime(b.createdAt || b.updatedAt);
        return timeB - timeA;
      });
  };

  // Initialize Authentication & presence on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setNeedsAuth(false);
        addLog(`Accesso autenticato con successo come ${currentUser.displayName || currentUser.email}`, "success");
        // Sync active presence heartbeat
        writePresence(currentUser.uid);
        
        // Sincronizzazione automatica all'avvio con Google Drive (silenziosa)
        setTimeout(() => {
          syncPhotosWithDrive(true, currentUser, token);
        }, 500);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setGeminiApiKey('');
        setShowKeyForm(false);
        setPhotos([]);
        setLocalPhotos([]);
        setCustomStyles([]);
        setLoadedSelectedStyleIds(null);
        setSelectedStyles([PRESET_PHOTOGRAPHERS[0]]);
        setLoadConfigError(null);
        setSaveKeyError(null);
        setNeedsAuth(true);
        addLog("Nessuna sessione attiva rilevata. Richiesto l'accesso con Google.", "warning");
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    addLog("Disconnessione in corso...", "info");
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setGeminiApiKey('');
      setShowKeyForm(false);
      setPhotos([]);
      setLocalPhotos([]);
      setCustomStyles([]);
      setLoadedSelectedStyleIds(null);
      setSelectedStyles([PRESET_PHOTOGRAPHERS[0]]);
      setLoadConfigError(null);
      setSaveKeyError(null);
      addLog("Disconnesso correttamente. Sessione terminata.", "info");
    } catch (err: any) {
      console.error("Logout failed:", err);
      addLog(`Errore durante la disconnessione: ${err.message || err}`, "error");
    }
  };

  // Presence Heartbeat Loop (creates real-time statistics of online users)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      writePresence(user.uid);
    }, 45000);
    return () => clearInterval(interval);
  }, [user]);

  // Read Gemini API Key from `/users/{userId}` once authenticated
  useEffect(() => {
    if (!user) return;

    // Fallback locale immediato all'avvio per prevenire sfarfallii dell'interfaccia e mostrare la chiave istantaneamente.
    const instantLocalKey = localStorage.getItem(`gemini_api_key_${user.uid}`) || localStorage.getItem('gemini_api_key_global_fallback');
    if (instantLocalKey) {
      setGeminiApiKey(instantLocalKey);
      setShowKeyForm(false);
      addLog("Caricata preventivamente la chiave API locale salvata nel browser.", "info");
    }

    const instantLocalPrompt = localStorage.getItem(`custom_system_prompt_${user.uid}`) || DEFAULT_SYSTEM_PROMPT;
    setCustomSystemPrompt(instantLocalPrompt);

    const loadUserConfig = async () => {
      addLog("Verifica connessione cloud e caricamento API Key...", "info");
      try {
        setLoadConfigError(null);
        
        // Use a 15-second timeout for checking Firestore, so we don't aggressively block if there is a network issue
        const userDocPromise = getDoc(doc(db, 'users', user.uid));
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout di risposta del database Cloud")), 15000)
        );
        
        const userDoc = await Promise.race([userDocPromise, timeoutPromise]);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.geminiApiKey) {
            setGeminiApiKey(data.geminiApiKey);
            localStorage.setItem(`gemini_api_key_${user.uid}`, data.geminiApiKey);
            localStorage.setItem('gemini_api_key_global_fallback', data.geminiApiKey);
            setShowKeyForm(false);
            addLog("Chiave API di Gemini trovata e sincronizzata con il database Cloud!", "success");
          } else {
            // Check if there is a local key fallback
            const localKey = localStorage.getItem(`gemini_api_key_${user.uid}`) || localStorage.getItem('gemini_api_key_global_fallback');
            if (localKey) {
              setGeminiApiKey(localKey);
              setShowKeyForm(false);
              addLog("Chiave API di Gemini caricata dalla cache locale del browser.", "success");
            } else {
              addLog("Chiave API di Gemini mancante nel profilo. Compila il modulo di configurazione.", "warning");
              setShowKeyForm(true); // Ask them to enter their key first
            }
          }

          if (data.customSystemPrompt) {
            setCustomSystemPrompt(data.customSystemPrompt);
            localStorage.setItem(`custom_system_prompt_${user.uid}`, data.customSystemPrompt);
            addLog("Prompt personalizzato Gemini Vision caricato e sincronizzato dal database Cloud!", "success");
          } else {
            const localPrompt = localStorage.getItem(`custom_system_prompt_${user.uid}`);
            if (localPrompt) {
              setCustomSystemPrompt(localPrompt);
            } else {
              setCustomSystemPrompt(DEFAULT_SYSTEM_PROMPT);
            }
          }

          if (data.selectedStyleIds && Array.isArray(data.selectedStyleIds)) {
            setLoadedSelectedStyleIds(data.selectedStyleIds);
          } else {
            setLoadedSelectedStyleIds([PRESET_PHOTOGRAPHERS[0].id]);
          }
        } else {
          addLog("Primo accesso rilevato. Inizializzazione profilo utente nel cloud...", "info");
          // Setup initial user doc in Firestore with timeout
          const newUserPromise = setDoc(doc(db, 'users', user.uid), {
            userId: user.uid,
            email: user.email || '',
            name: user.displayName || 'Ospite',
            customSystemPrompt: DEFAULT_SYSTEM_PROMPT,
            selectedStyleIds: [PRESET_PHOTOGRAPHERS[0].id],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          await Promise.race([newUserPromise, new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 15000))])
            .then(() => addLog("Profilo utente registrato con successo nel database Cloud!", "success"))
            .catch(() => addLog("Database Cloud non raggiungibile prima del timeout. Registrazione profilo rinviata.", "warning"));
          
          const localKey = localStorage.getItem(`gemini_api_key_${user.uid}`) || localStorage.getItem('gemini_api_key_global_fallback');
          if (localKey) {
            setGeminiApiKey(localKey);
            setShowKeyForm(false);
            addLog("Chiave API di Gemini caricata dalla memoria locale del browser.", "success");
          } else {
            setShowKeyForm(true);
          }

          const localPrompt = localStorage.getItem(`custom_system_prompt_${user.uid}`);
          if (localPrompt) {
            setCustomSystemPrompt(localPrompt);
          } else {
            setCustomSystemPrompt(DEFAULT_SYSTEM_PROMPT);
          }

          setLoadedSelectedStyleIds([PRESET_PHOTOGRAPHERS[0].id]);
        }
      } catch (err: any) {
        // Fallback to local storage copy silently if the connection timed out, preventing distracting console errors/warnings
        const localKey = localStorage.getItem(`gemini_api_key_${user.uid}`) || localStorage.getItem('gemini_api_key_global_fallback');
        if (localKey) {
          setGeminiApiKey(localKey);
          setShowKeyForm(false);
          addLog("Database Cloud non raggiungibile in tempo utile (timeout). Utilizzo la chiave API locale già configurata.", "success");
        } else {
          setLoadConfigError(`Impossibile ricevere le impostazioni utente dal database: ${err.message || err}. (Verrà usato il salvataggio locale se digiti la chiave e premi Salva)`);
          addLog(`Errore nel caricamento del profilo utente: ${err.message || err}. Richiesta chiave manuale.`, "error");
          setShowKeyForm(true); // Still show key form so they can input it!
        }

        const localPrompt = localStorage.getItem(`custom_system_prompt_${user.uid}`);
        if (localPrompt) {
          setCustomSystemPrompt(localPrompt);
        } else {
          setCustomSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        }

        setLoadedSelectedStyleIds([PRESET_PHOTOGRAPHERS[0].id]);
      }
    };
    loadUserConfig();
  }, [user]);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    if (!user) return;

    // Sub 1: Photos taken by this user
    const qPhotos = query(
      collection(db, 'photos'), 
      where('userId', '==', user.uid)
    );
    const unsubPhotos = onSnapshot(qPhotos, (snapshot) => {
      setDbFirebaseStatus('connected');
      const list: PhotoItem[] = [];
      snapshot.forEach(doc => {
        list.push({ photoId: doc.id, ...doc.data() } as PhotoItem);
      });
      // Sort client-side safely via getSafeTime
      const sortedPhotos = list.sort((a, b) => {
        return getSafeTime(b.createdAt || b.updatedAt) - getSafeTime(a.createdAt || a.updatedAt);
      });
      setPhotos(sortedPhotos);
    }, (err) => {
      setDbFirebaseStatus('offline');
      handleFirestoreError(err, OperationType.LIST, 'photos');
    });

    // Sub 2: Custom user styles
    const qStyles = query(
      collection(db, 'styles'),
      where('userId', '==', user.uid)
    );
    const unsubStyles = onSnapshot(qStyles, (snapshot) => {
      setDbFirebaseStatus('connected');
      const list: CustomStyle[] = [];
      snapshot.forEach(doc => {
        list.push({ styleId: doc.id, ...doc.data() } as CustomStyle);
      });
      // Sort client-side safely via getSafeTime
      const sortedStyles = list.sort((a, b) => {
        return getSafeTime(b.createdAt) - getSafeTime(a.createdAt);
      });
      setCustomStyles(sortedStyles);
    }, (err) => {
      setDbFirebaseStatus('offline');
      handleFirestoreError(err, OperationType.LIST, 'styles');
    });

    // Sub 3: Presence heartbeats for active user count
    const qPresence = query(collection(db, 'presence'));
    const unsubPresence = onSnapshot(qPresence, (snapshot) => {
      setDbFirebaseStatus('connected');
      const now = Date.now();
      let activeCount = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.lastActive) {
          const activeTime = data.lastActive.toDate ? data.lastActive.toDate().getTime() : new Date(data.lastActive).getTime();
          if (now - activeTime < 300000) { // 5 minutes window
            activeCount++;
          }
        }
      });
      setOnlineUsers(activeCount || 1);
    }, (err) => {
      setDbFirebaseStatus('offline');
      handleFirestoreError(err, OperationType.LIST, 'presence');
    });

    // Sub 4: Global Photo stats counter
    const unsubStats = onSnapshot(doc(db, 'stats', 'global'), (docSnap) => {
      setDbFirebaseStatus('connected');
      if (docSnap.exists()) {
        setGlobalPhotos(docSnap.data().totalPhotos || 0);
      }
    }, (err) => {
      setDbFirebaseStatus('offline');
      handleFirestoreError(err, OperationType.GET, 'stats/global');
    });

    return () => {
      unsubPhotos();
      unsubStyles();
      unsubPresence();
      unsubStats();
    };
  }, [user]);

  // Reconcile loaded selection IDs with actual style objects (presets + custom)
  useEffect(() => {
    if (!loadedSelectedStyleIds) return;

    const resolved: (PhotographerStyle | CustomStyle)[] = [];
    let hasCustomIds = false;

    loadedSelectedStyleIds.forEach(id => {
      const preset = PRESET_PHOTOGRAPHERS.find(p => p.id === id);
      if (preset) {
        resolved.push(preset);
      } else {
        hasCustomIds = true;
        const custom = customStyles.find(c => c.styleId === id);
        if (custom) {
          resolved.push(custom);
        }
      }
    });

    // If we have custom style IDs loaded, but haven't found any of them yet in customStyles
    // and we are still in checking status, let's wait first before falling back so we don't drop them
    if (hasCustomIds && resolved.length === 0 && dbFirebaseStatus === 'checking') {
      return;
    }

    if (resolved.length > 0) {
      setSelectedStyles(resolved);
    } else {
      setSelectedStyles([PRESET_PHOTOGRAPHERS[0]]);
    }
  }, [loadedSelectedStyleIds, customStyles, dbFirebaseStatus]);

  const writePresence = async (uid: string) => {
    try {
      await setDoc(doc(db, 'presence', uid), {
        userId: uid,
        lastActive: serverTimestamp()
      });
    } catch (err) {
      console.warn('Silent presence update failure:', err);
    }
  };

  // Google Login handling
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login flow failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Save Gemini Key
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!geminiApiKey.trim()) {
      setSaveKeyError("Fornisci una API Key valida per proseguire.");
      return;
    }
    setSavingKey(true);
    setSaveKeyError(null);

    // Save locally immediately to prevent losing input of the key if network is restricted
    localStorage.setItem(`gemini_api_key_${user.uid}`, geminiApiKey.trim());
    localStorage.setItem('gemini_api_key_global_fallback', geminiApiKey.trim());

    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Use race with timeout to prevent hanging on Firestore read
      const userDocPromise = getDoc(userRef);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout di risposta del database Cloud")), 15000)
      );
      
      const userDoc = await Promise.race([userDocPromise, timeoutPromise]);
      
      let writePromise;
      if (!userDoc.exists()) {
        writePromise = setDoc(userRef, {
          userId: user.uid,
          email: user.email || '',
          name: user.displayName || 'Ospite',
          geminiApiKey: geminiApiKey.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        writePromise = updateDoc(userRef, {
          geminiApiKey: geminiApiKey.trim(),
          updatedAt: serverTimestamp()
        });
      }
      
      const writeTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout di scrittura sul database Cloud")), 15000)
      );
      
      await Promise.race([writePromise, writeTimeoutPromise]);

      setShowKeyForm(false);
      showNotification("Chiave API salvata con successo nel cloud e localmente!", "success");
      addLog("Chiave API di Gemini salvata nel cloud e localmente.", "success");
    } catch (err: any) {
      console.warn("Save API Key on Cloud failed. Graceful local storage override activated:", err);
      // Since we successfully stored it in localStorage, we can safely allow the user to proceed!
      setShowKeyForm(false);
      showNotification("Database cloud non raggiungibile (offline). La chiave è stata caricata con successo in locale nel browser per permetterti di procedere!", "success");
      addLog("Chiave API di Gemini salvata in locale (Database Cloud non ha risposto).", "warning");
    } finally {
      setSavingKey(false);
    }
  };

  // Save Custom Description Prompt for Gemini Vision
  const handleSaveCustomPrompt = async (promptText: string) => {
    if (!user) return;
    setSavingPrompt(true);
    
    // Save locally immediately to guarantee offline/local usability
    localStorage.setItem(`custom_system_prompt_${user.uid}`, promptText);
    setCustomSystemPrompt(promptText);

    try {
      const userRef = doc(db, 'users', user.uid);
      
      const writePromise = updateDoc(userRef, {
        customSystemPrompt: promptText,
        updatedAt: serverTimestamp()
      });
      
      const writeTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout di scrittura sul database Cloud")), 15000)
      );
      
      await Promise.race([writePromise, writeTimeoutPromise]);
      
      showNotification("Prompt personalizzato salvato con successo nel database Cloud e localmente!", "success");
      addLog("Prompt di descrizione Gemini Vision salvato con successo nel database Cloud.", "success");
    } catch (err: any) {
      console.warn("Save Custom Prompt on Cloud failed. Graceful local storage override activated:", err);
      showNotification("Database cloud non raggiungibile. Il prompt personalizzato è stato salvato localmente nel browser!", "success");
      addLog("Prompt di descrizione Gemini Vision salvato localmente (Database Cloud non ha risposto).", "warning");
    } finally {
      setSavingPrompt(false);
    }
  };

  // Sincronizzazione automatica/manuale con Google Drive
  const syncPhotosWithDrive = async (silent = false, overrideUser = user, overrideToken = accessToken) => {
    const activeUser = overrideUser;
    const activeToken = overrideToken;
    if (!activeUser || !activeToken) {
      if (!silent) {
        addLog("Sincronizzazione impossibile: login o token non disponibili.", "error");
      }
      return;
    }

    setIsSyncingDrive(true);
    if (!silent) {
      addLog("[Sync Drive] Avvio sincronizzazione approfondita con Google Drive...", "info");
    }

    try {
      const folderId = await getOrCreateDevelopFolder(activeToken);
      const driveFiles = await listFilesFromFolder(activeToken, folderId);
      
      if (!silent) {
        addLog(`[Sync Drive] Trovati ${driveFiles.length} file complessivi nella cartella Drive.`, "info");
      }

      // Group Drive files by Photo ID (extracted from filenames like "Scatto_foto_X.jpg", "Sviluppato_foto_X.png")
      const originals = new Map<string, any>();
      const developeds = new Map<string, any>();

      driveFiles.forEach(file => {
        const nameUpper = file.name.toUpperCase();
        // Case-insensitive regex to match "foto_[id]" or indeed "foto_XXXX"
        const match = file.name.match(/foto_([A-Za-z0-9_\-]+)/i);
        if (match) {
          const photoId = `foto_${match[1]}`.toLowerCase();
          if (nameUpper.includes("SVILUPPATO") || nameUpper.includes("DEVELOPED")) {
            developeds.set(photoId, file);
          } else {
            originals.set(photoId, file);
          }
        }
      });

      // Fetch existing local list
      const stored = localStorage.getItem(`local_photos_${activeUser.uid}`);
      let currentLocalList: PhotoItem[] = [];
      if (stored) {
        try { currentLocalList = JSON.parse(stored); } catch {}
      }

      const allUniquePhotoIds = new Set<string>([
        ...Array.from(originals.keys()),
        ...Array.from(developeds.keys())
      ]);

      let updatedCount = 0;
      let newlyCreatedCount = 0;

      const mergedList = [...currentLocalList];

      for (const photoId of allUniquePhotoIds) {
        const driveOrig = originals.get(photoId);
        const driveDev = developeds.get(photoId);

        // Thumbnail with fallback and resolution booster
        const origUrl = driveOrig?.thumbnailLink 
          ? driveOrig.thumbnailLink.replace(/=s\d+$/, '=s1000') 
          : (driveDev?.thumbnailLink ? driveDev.thumbnailLink.replace(/=s\d+$/, '=s1000') : '');

        const devUrl = driveDev?.thumbnailLink 
          ? driveDev.thumbnailLink.replace(/=s\d+$/, '=s1000') 
          : undefined;

        // Date extraction
        let parsedDate = new Date().toISOString();
        const timestampMatch = photoId.match(/\d+/);
        if (timestampMatch) {
          const tsNum = parseInt(timestampMatch[0], 10);
          if (tsNum > 1000000000000 && tsNum < 3000000000000) {
            parsedDate = new Date(tsNum).toISOString();
          }
        }

        const existingIdx = mergedList.findIndex(p => p.photoId === photoId);

        if (existingIdx > -1) {
          // Photo exists - update any missing original/developed Drive info
          const existing = { ...mergedList[existingIdx] };
          let changed = false;

          if (driveOrig && existing.originalDriveId !== driveOrig.id) {
            existing.originalDriveId = driveOrig.id;
            if (!existing.originalPhotoUrl || !existing.originalPhotoUrl.startsWith("data:")) {
              existing.originalPhotoUrl = origUrl;
            }
            changed = true;
          }

          if (driveDev) {
            if (existing.developedDriveId !== driveDev.id || 
                !existing.developedPhotoUrl || 
                existing.status !== 'completato') {
              existing.developedDriveId = driveDev.id;
              if (!existing.developedPhotoUrl || !existing.developedPhotoUrl.startsWith("data:")) {
                existing.developedPhotoUrl = devUrl;
              }
              existing.status = 'completato';
              changed = true;
            }
          }

          // Force automatic match pairing for pending status
          // "se trovi la coppia di file senza domandarmi azioni manuali"
          // If BOTH files are present on Google Drive, we automatically mark the photo as complete!
          if (driveOrig && driveDev) {
            if (existing.status !== 'completato') {
              existing.status = 'completato';
              if (!existing.developedPhotoUrl) {
                existing.developedPhotoUrl = devUrl;
              }
              if (!existing.developedDriveId) {
                existing.developedDriveId = driveDev.id;
              }
              existing.updatedAt = new Date().toISOString();
              changed = true;
              if (!silent) {
                addLog(`[Coppia Rilevata] Trovata la coppia di file Originale + Sviluppo su Drive per ${photoId}. Completato in automatico senza richiesta manuale!`, "success");
              }
            }
          }

          if (changed) {
            existing.updatedAt = new Date().toISOString();
            mergedList[existingIdx] = existing;
            updatedCount++;

            // Update in Firestore silently
            try {
              await setDoc(doc(db, 'photos', photoId), existing, { merge: true });
            } catch {}
          }
        } else {
          // Completely new photo sync
          const newPhoto: PhotoItem = {
            photoId,
            userId: activeUser.uid,
            originalPhotoUrl: origUrl,
            originalDriveId: driveOrig?.id,
            developedPhotoUrl: devUrl,
            developedDriveId: driveDev?.id,
            status: (driveOrig && driveDev) || driveDev ? 'completato' : 'scattata',
            styleName: 'Sincronizzato da Drive',
            stylePrompt: 'Importato automaticamente da Google Drive',
            createdAt: parsedDate,
            updatedAt: new Date().toISOString()
          };

          mergedList.push(newPhoto);
          newlyCreatedCount++;

          try {
            await setDoc(doc(db, 'photos', photoId), newPhoto);
          } catch {}
        }
      }

      const pruned = safeSaveLocalPhotos(activeUser.uid, mergedList);
      setLocalPhotos(pruned);

      if (!silent) {
        addLog(`[Sync Drive] Sincronizzazione completata: creati ${newlyCreatedCount} nuovi scatti, aggiornati ${updatedCount} scatti esistenti!`, "success");
        showNotification(`Sincronizzazione completata: ${newlyCreatedCount} nuovi, ${updatedCount} aggiornati!`, "success");
      }
    } catch (err: any) {
      console.error("syncPhotosWithDrive error:", err);
      if (!silent) {
        addLog(`[Sync Drive Fallito] Errore di sincronizzazione: ${err.message || err}`, "error");
        showNotification(`Sincronizzazione Google Drive fallita: ${err.message || err}`, "error");
      }
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Turn Camera On with clean stream handling
  const startCamera = async (facing: 'user' | 'environment' = cameraFacingMode) => {
    setCapturedImage(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: facing } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access failed:", err);
      showNotification("Impossibile accedere alla webcam. Puoi comunque trascinare o caricare un file immagine dal tuo dispositivo usando l'area di caricamento.", "info");
    }
  };

  // Switch camera between front and rear
  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextFacing);
    if (cameraActive) {
      await startCamera(nextFacing);
    }
  };

  // Turn Camera Off and clean tracks
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Capture Image from Webcam stream via HTML5 canvas
  const capturePhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip horizontal for mirroring style camera only when in 'user' mode
        if (cameraFacingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    } catch (err) {
      console.error("Capture image execution error:", err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle local file uploads (supports drag and drop pattern)
  const handleFileRead = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotification('Seleziona esclusivamente file immagine (JPEG/PNG).', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCapturedImage(e.target.result as string);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileRead(e.dataTransfer.files[0]);
    }
  };

  // Step 1: Initialize Photo, upload to Drive, and save meta, and automatically chain description & development!
  const handleSubmitPhoto = async () => {
    if (!user || !capturedImage || !accessToken) {
      addLog("Salvataggio impossibile: dati utente o autorizzazioni mancanti.", "error");
      return;
    }
    
    const photoId = 'foto_' + Date.now();
    addLog(`[Inizio] Avvio processo automatico integrato per lo scatto ID: ${photoId}`, "info");
    
    setActionLoading(photoId);
    let currentPhotoItem: PhotoItem | null = null;
    
    try {
      // PHASE 1: Upload original shot to Google Drive and register in Local & Cloud
      addLog("[Drive] Connessione a Google Drive in corso. Verifica cartella dell'applicazione...", "info");
      const folderId = await getOrCreateDevelopFolder(accessToken);
      addLog(`[Drive] Cartella verificata (ID: ${folderId}). Preparazione file immagine...`, "info");
      
      const filename = `Scatto_${photoId}.jpg`;
      addLog(`[Drive] Caricamento dello scatto originale "${filename}" su Google Drive...`, "info");
      const driveUpload = await uploadBase64ToDrive(accessToken, folderId, filename, capturedImage);
      addLog(`[Drive] Upload scatto originale completato! File registrato (ID: ${driveUpload.id})`, "success");
      
      const blended = getBlendedStyle();
      const stylePromptVal = userPromptModifier.trim() ? `${blended.prompt} (Note utente scatto: ${userPromptModifier.trim()})` : blended.prompt;
      
      const newPhotoItem: PhotoItem = {
        photoId,
        userId: user.uid,
        originalPhotoUrl: capturedImage,
        originalDriveId: driveUpload.id,
        status: 'scattata',
        styleName: blended.name,
        stylePrompt: stylePromptVal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      currentPhotoItem = newPhotoItem;

      // Save locally immediately to update the list view
      addLog("[Offline-Safe] Archiviazione nella memoria locale del browser completata.", "success");
      saveLocalPhoto(newPhotoItem);

      addLog("[Firestore] Caricamento nel database Cloud Firestore in corso...", "info");
      try {
        const firestoreWritePromise = setDoc(doc(db, 'photos', photoId), newPhotoItem);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Database Cloud non ha risposto in tempo utile (offline)")), 15000)
        );
        await Promise.race([firestoreWritePromise, timeoutPromise]);
        addLog("[Firestore] Sincronizzazione scatto nel Cloud completata con successo!", "success");

        // Try updating global stats with a fast timeout
        const statsPromise = setDoc(doc(db, 'stats', 'global'), { 
          totalPhotos: increment(1) 
        }, { merge: true });
        await Promise.race([statsPromise, new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout stats")), 5000))]).catch(() => {});
      } catch (dbErr: any) {
        console.warn("Firestore save failed/timed out. Continuing with local storage:", dbErr);
        addLog(`[Modalità Offline] Il database cloud non ha risposto in tempo. Lo scatto è salvato in locale nel browser.`, "warning");
      }

      // Reset standard webcam captured values to clear inputs for the next photo
      setCapturedImage(null);
      setUserPromptModifier('');

      // Check for API Key for automated steps
      if (!geminiApiKey) {
        addLog("Sviluppo automatico sospeso: API Key di Gemini non configurata. Configurala in alto per procedere.", "warning");
        showNotification("Sviluppo automatico sospeso: API Key non configurata. Puoi procedere manualmente dopo aver inserito una chiave valida nel pannello.", "info");
        setActionLoading(null);
        return;
      }

      // PHASE 2: Gemini Vision Description Analysis
      addLog(`[Automatico] Avvio analisi descrittiva con Gemini Vision per lo scatto: ${photoId}`, "info");
      
      const describingPhotoItem: PhotoItem = {
        ...currentPhotoItem,
        status: 'descrivendo',
        updatedAt: new Date().toISOString()
      };
      saveLocalPhoto(describingPhotoItem);
      currentPhotoItem = describingPhotoItem;

      try {
        await updateDoc(doc(db, 'photos', photoId), {
          status: 'descrivendo',
          updatedAt: new Date().toISOString()
        });
      } catch {}

      addLog("[Gemini AI] Invio immagine guidata a Gemini Multimodal Vision...", "info");
      const descResponse = await fetch('/api/gemini/describe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': geminiApiKey
        },
        body: JSON.stringify({
          originalPhotoUrl: describingPhotoItem.originalPhotoUrl,
          userPromptModifier: describingPhotoItem.stylePrompt,
          customSystemPrompt: customSystemPrompt
        })
      });

      if (!descResponse.ok) {
        const errData = await descResponse.json();
        throw new Error(errData.error || "Impossibile ottenere la descrizione di visione.");
      }

      const descResult = await descResponse.json();
      addLog("[Gemini AI] Risposta ricevuta! Descrizione e dettagli d'ambiente decifrati sapientemente.", "success");

      const describedPhotoItem: PhotoItem = {
        ...describingPhotoItem,
        description: descResult.description,
        status: 'descritto',
        updatedAt: new Date().toISOString()
      };
      saveLocalPhoto(describedPhotoItem);
      currentPhotoItem = describedPhotoItem;

      try {
        await updateDoc(doc(db, 'photos', photoId), {
          description: descResult.description,
          status: 'descritto',
          updatedAt: new Date().toISOString()
        });
      } catch {}

      // PHASE 3: Imagen 3 Generative Artistic Development
      addLog(`[Automatico] Avvio sviluppo artistico con il modello generativo Imagen 3...`, "info");
      
      const developingPhotoItem: PhotoItem = {
        ...describedPhotoItem,
        status: 'sviluppando',
        updatedAt: new Date().toISOString()
      };
      saveLocalPhoto(developingPhotoItem);
      currentPhotoItem = developingPhotoItem;

      try {
        await updateDoc(doc(db, 'photos', photoId), {
          status: 'sviluppando',
          updatedAt: new Date().toISOString()
        });
      } catch {}

      addLog(`[Imagen AI] Richiesta elaborazione del pennello generativo Imagen con descrizione e stile selezionato...`, "info");
      const devResponse = await fetch('/api/gemini/develop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': geminiApiKey
        },
        body: JSON.stringify({
          description: describedPhotoItem.description,
          stylePrompt: describedPhotoItem.stylePrompt
        })
      });

      if (!devResponse.ok) {
        const errData = await devResponse.json();
        throw new Error(errData.error || "Impossibile sviluppare l'immagine.");
      }

      const devResult = await devResponse.json();
      addLog("[Imagen AI] Immagine artistica sviluppata con successo! Salvataggio del file...", "success");
      const developedUrl = `data:image/png;base64,${devResult.imageBytes}`;

      // Upload derived developed piece to Google Drive
      addLog("[Drive] Connessione a Google Drive in corso per caricamento dell'immagine sviluppata...", "info");
      const devFilename = `Sviluppato_${photoId}.png`;
      const driveUploadDev = await uploadBase64ToDrive(accessToken, folderId, devFilename, developedUrl);
      addLog(`[Drive] Sviluppo d'arte salvato con successo! Google Drive File ID: ${driveUploadDev.id}`, "success");

      const completedPhotoItem: PhotoItem = {
        ...developingPhotoItem,
        developedPhotoUrl: developedUrl,
        developedDriveId: driveUploadDev.id,
        status: 'completato',
        updatedAt: new Date().toISOString()
      };
      saveLocalPhoto(completedPhotoItem);
      currentPhotoItem = completedPhotoItem;

      try {
        await updateDoc(doc(db, 'photos', photoId), {
          developedPhotoUrl: developedUrl,
          developedDriveId: driveUploadDev.id,
          status: 'completato',
          updatedAt: new Date().toISOString()
        });
        addLog("[Firestore] Sincronizzazione scatto modificato nel Cloud completata con successo!", "success");
      } catch {}

      addLog(`[Automatico Completato] Il processo di descrizione e sviluppo artistico è terminato per lo scatto ID: ${photoId}!`, "success");
      showNotification(`Sviluppo artistico completato con successo!`, "success");

    } catch (err: any) {
      console.error(err);
      addLog(`[Errore Processo Chained] Si è verificato un errore: ${err.message || err}`, "error");
      showNotification(`Errore nel processo di elaborazione: ${err.message || err}`, "error");
      
      // Revert phase gracefully so they can manually resume
      if (currentPhotoItem) {
        const fallbackStatus = currentPhotoItem.status === 'descrivendo' ? 'scattata' : 'descritto';
        const revertedPhoto: PhotoItem = {
          ...currentPhotoItem,
          status: fallbackStatus,
          updatedAt: new Date().toISOString()
        };
        saveLocalPhoto(revertedPhoto);
        try {
          await updateDoc(doc(db, 'photos', photoId), {
            status: fallbackStatus,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        } catch {}
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Recover base64 image data dynamically if missing or pruned locally
  const ensureOriginalPhotoUrl = async (photo: PhotoItem): Promise<string> => {
    if (photo.originalPhotoUrl && photo.originalPhotoUrl.startsWith("data:")) {
      return photo.originalPhotoUrl;
    }
    if (photo.originalDriveId && accessToken) {
      addLog(`[Drive API] Recupero sorgente scatto originale da Google Drive (ID: ${photo.originalDriveId})...`, "info");
      const base64 = await downloadFileAsBase64(accessToken, photo.originalDriveId);
      return base64;
    }
    throw new Error("L'immagine originale non è disponibile né localmente né nel tuo account Google Drive.");
  };

  // Recover base64 image data dynamically if missing or pruned locally for AI developed photos
  const ensureDevelopedPhotoUrl = async (photo: PhotoItem): Promise<string> => {
    if (photo.developedPhotoUrl && photo.developedPhotoUrl.startsWith("data:")) {
      return photo.developedPhotoUrl;
    }
    if (photo.developedDriveId && accessToken) {
      addLog(`[Drive API] Recupero sviluppo artistico da Google Drive (ID: ${photo.developedDriveId})...`, "info");
      const base64 = await downloadFileAsBase64(accessToken, photo.developedDriveId);
      return base64;
    }
    throw new Error("L'immagine sviluppata non è disponibile né localmente né nel tuo account Google Drive.");
  };

  // Generate a composite image with Original + Developed details under the applied style and write to clipboard
  const handleShareComposite = async (photo: PhotoItem) => {
    if (sharingPhotoId) return;
    setSharingPhotoId(photo.photoId);
    setCopySuccess(false);
    addLog(`[Condivisione] Preparazione dell'immagine composita per lo scatto "${photo.photoId}"...`, "info");

    try {
      // 1. Recover the original image base64
      let originalBase64 = '';
      try {
        originalBase64 = await ensureOriginalPhotoUrl(photo);
      } catch (err: any) {
        throw new Error(`Impossibile recuperare lo scatto originale: ${err.message}`);
      }

      // 2. Recover the developed image base64
      let developedBase64 = '';
      try {
        developedBase64 = await ensureDevelopedPhotoUrl(photo);
      } catch (err: any) {
        throw new Error(`Impossibile recuperare l'immagine sviluppata AI: ${err.message}`);
      }

      // 3. Create canvas and draw images side-by-side
      addLog(`[Condivisione] Elaborazione composizione ed allineamento su Canvas...`, "info");

      const loadImg = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Mancato caricamento delle sorgenti visuali."));
          img.src = src;
        });
      };

      const [imgOrig, imgDev] = await Promise.all([
        loadImg(originalBase64),
        loadImg(developedBase64)
      ]);

      // Normalize heights for side-by-side alignment to a premium 800px standard
      const targetHeight = 800;
      const scaleOrig = targetHeight / imgOrig.naturalHeight;
      const scaleDev = targetHeight / imgDev.naturalHeight;

      const wOrig = Math.round(imgOrig.naturalWidth * scaleOrig);
      const wDev = Math.round(imgDev.naturalWidth * scaleDev);

      const canvas = document.createElement('canvas');
      const bannerHeight = 85; 

      canvas.width = wOrig + wDev;
      canvas.height = targetHeight + bannerHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Errore nell'allocazione del framework 2D di composizione.");
      }

      // Solid background
      ctx.fillStyle = "#09090b"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw original on left
      ctx.drawImage(imgOrig, 0, 0, wOrig, targetHeight);

      // Draw developed on right
      ctx.drawImage(imgDev, wOrig, 0, wDev, targetHeight);

      // Label overlays on image borders
      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      ctx.fillRect(15, targetHeight - 45, 110, 30);
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#e4e4e7"; 
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ORIGINALE", 15 + 55, targetHeight - 45 + 15);

      // AI development tag
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)"; 
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(99, 102, 241, 0.35)"; 
      ctx.fillRect(wOrig + 15, targetHeight - 45, 125, 30);
      ctx.strokeRect(wOrig + 15, targetHeight - 45, 125, 30);
      ctx.fillStyle = "#c7d2fe"; 
      ctx.fillText("AI SVILUPPO ARTISTICO", wOrig + 15 + 62.5, targetHeight - 45 + 15);

      // Bottom banner line separator
      ctx.beginPath();
      ctx.moveTo(0, targetHeight);
      ctx.lineTo(canvas.width, targetHeight);
      ctx.strokeStyle = "#1e1b4b"; 
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Dual-tone bottom signature area background
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, targetHeight, canvas.width, bannerHeight);

      // Title (Left side)
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("LENSAI CAMERA COLLABORATIVA", 30, targetHeight + 32);

      ctx.font = "10.5px monospace, Courier New, sans-serif";
      ctx.fillStyle = "#52525b"; 
      ctx.fillText("OPERA DIGITALE INTERATTIVA COMPOSITA • GOOGLE DRIVE BACKUP VERIFIED", 30, targetHeight + 54);

      // Style overlay (Right side)
      const appliedStyleName = (photo.styleName || "Stile Libero").toUpperCase();
      ctx.textAlign = "right";

      ctx.font = "bold 11px monospace, Courier New, sans-serif";
      ctx.fillStyle = "#818cf8"; 
      ctx.fillText("STILE ARTISTICO APPLICATO :", canvas.width - 30, targetHeight + 30);

      ctx.font = "bold 19px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#e4e4e7"; 
      ctx.fillText(appliedStyleName, canvas.width - 30, targetHeight + 54);

      // Convert canvas to Blob PNG and copy to clipboard
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error("Impossibile comprimere la memoria del canvas in formato PNG.");
        }

        const dataUrl = canvas.toDataURL('image/png');

        try {
          // Attempt default browser clipboard API
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
          ]);
          setCopySuccess(true);
          addLog(`[Clipboard] Immagine composta copiata con successo negli appunti del dispositivo.`, "success");
          showNotification("Immagine di confronto copiata negli appunti! Ora puoi incollarla su WhatsApp o altre app.", "success");
        } catch (clipboardErr: any) {
          console.warn("Direct clipboard write blocked, showing dialog manual helper modal:", clipboardErr);
          addLog(`[Clipboard Bloat] Blocco delle policy di sicurezza. Visualizzo overlay di copia manuale.`, "warning");
          showNotification("Immagine composta creata! Usa il pannello interattivo per la copia manuale.", "info");
        }

        // Open beautiful confirmation and manual clipboard helper overlay
        setSharedModalPhoto(photo);
        setSharedModalImgSrc(dataUrl);
      }, 'image/png');

    } catch (err: any) {
      console.error("handleShareComposite error:", err);
      addLog(`[Errore Condivisione] ${err.message || err}`, "error");
      showNotification(`Errore di condensazione file: ${err.message || err}`, "error");
    } finally {
      setSharingPhotoId(null);
    }
  };

  // Step 2: Call Gemini Vision to create the meticulous Text Description
  const describePhoto = async (photo: PhotoItem) => {
    if (!geminiApiKey) {
      addLog("Descrizione fallita: API Key di Gemini non configurata.", "error");
      setShowKeyForm(true);
      return;
    }
    
    addLog(`[Decifrazione AI] Inizio descrizione analitica per lo scatto: ${photo.photoId}`, "info");
    setActionLoading(photo.photoId);
    
    try {
      // 1. Update status locally to 'descrivendo'
      const updatedPhoto: PhotoItem = {
        ...photo,
        status: 'descrivendo',
        updatedAt: new Date().toISOString()
      };
      saveLocalPhoto(updatedPhoto);
      addLog(`[Local] Stato scatto impostato su "In descrizione..."`, "info");

      // 2. Try writing to Firestore with 15s timeout
      try {
        const promise = updateDoc(doc(db, 'photos', photo.photoId), {
          status: 'descrivendo',
          updatedAt: new Date().toISOString()
        });
        await Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 15000))]);
        addLog(`[Firestore] Stato scatto sincronizzato nel Cloud ("In descrizione...").`, "success");
      } catch (dbErr) {
        console.warn("Firestore sync delayed:", dbErr);
        addLog("[Firestore Offline] Registrazione su Cloud ritardata. Procedo con la descrizione AI locale.", "warning");
      }

      // Ensure we have the base64 of the original photo before calling Gemini
      let base64Original = '';
      try {
        base64Original = await ensureOriginalPhotoUrl(photo);
      } catch (err: any) {
        addLog(`[Errore Sorgente] Impossibile recuperare l'immagine originale: ${err.message}`, "error");
        throw err;
      }

      // 3. Make Gemini Multimodal request
      addLog("[Gemini AI] Invio immagine guidata a Gemini Multimodal Vision...", "info");
      const response = await fetch('/api/gemini/describe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': geminiApiKey
        },
        body: JSON.stringify({
          originalPhotoUrl: base64Original,
          userPromptModifier: photo.stylePrompt,
          customSystemPrompt: customSystemPrompt
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Impossibile ottenere la descrizione.");
      }

      const result = await response.json();
      addLog("[Gemini AI] Risposta ricevuta! Descrizione e dettagli dello stile elaborati correttamente.", "success");

      // 4. Update status locally to 'descritto' and include description
      const completedPhoto: PhotoItem = {
        ...updatedPhoto,
        description: result.description,
        status: 'descritto',
        updatedAt: new Date().toISOString()
      };
      saveLocalPhoto(completedPhoto);
      addLog(`[Local] Descrizione testuale memorizzata nella cache locale.`, "success");

      // 5. Try writing back to Firestore with 15s timeout
      try {
        const promise = updateDoc(doc(db, 'photos', photo.photoId), {
          description: result.description,
          status: 'descritto',
          updatedAt: new Date().toISOString()
        });
        await Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 15000))]);
        addLog(`[Firestore] Descrizione dello scatto sincronizzata con successo nel Cloud!`, "success");
      } catch (dbErr) {
        console.warn("Firestore sync delayed:", dbErr);
        addLog("[Firestore Offline] Record non salvato in tempo reale nel cloud. Disponibile in locale.", "warning");
      }

    } catch (err: any) {
      console.error(err);
      addLog(`[Errore Gemini] Decifrazione fallita: ${err.message || err}`, "error");
      showNotification(`Errore Gemini: ${err.message}`, "error");
      
      // Revert status to retry locally
      const revertedPhoto: PhotoItem = {
        ...photo,
        status: 'scattata',
        updatedAt: new Date().toISOString()
      };
      saveLocalPhoto(revertedPhoto);
      
      try {
        await updateDoc(doc(db, 'photos', photo.photoId), {
          status: 'scattata',
          updatedAt: new Date().toISOString()
        });
      } catch {}
    } finally {
      setActionLoading(null);
    }
  };

  // Step 3: Enable the user to save changes to the description before initiating AI Development
  const saveDescription = async (photoId: string, currentText: string) => {
    setSavingDescriptions(prev => ({ ...prev, [photoId]: true }));
    addLog(`[Salvataggio] Registrazione modifiche manuali per la descrizione ${photoId}...`, "info");
    
    try {
      // Find and update locally
      const existing = getMergedPhotos().find(p => p.photoId === photoId);
      if (existing) {
        const updated = {
          ...existing,
          description: currentText,
          updatedAt: new Date().toISOString()
        };
        saveLocalPhoto(updated);
        addLog("[Local] Descrizione manuale modificata memorizzata nel browser.", "success");
      }

      // Try writing to cloud
      const promise = updateDoc(doc(db, 'photos', photoId), {
        description: currentText,
        updatedAt: new Date().toISOString()
      });
      await Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 3000))]);
      addLog("[Firestore] Modifiche alla descrizione caricate con successo nel cloud.", "success");
    } catch (err: any) {
      console.error("Save description error:", err);
      addLog(`[Offline-Safe] Aggiornamento cloud rimandato per salvataggio descrizione: ${err.message || err}`, "warning");
    } finally {
      setSavingDescriptions(prev => ({ ...prev, [photoId]: false }));
    }
  };

  // Step 4: Develope Photo using Imagen to generate high-fidelity artistic photo
  const developPhoto = async (photo: PhotoItem) => {
    const activeText = editingDescriptions[photo.photoId] || photo.description;
    if (!activeText) {
      addLog("Sviluppo fallito: nessuna descrizione della foto disponibile.", "error");
      showNotification("Nessun testo descrittivo valido trovato. Assicurati che lo scatto sia stato descritto.", "error");
      return;
    }
    if (!geminiApiKey) {
      addLog("Sviluppo fallito: API Key di Gemini non configurata.", "error");
      setShowKeyForm(true);
      return;
    }
    if (!accessToken) {
      addLog("Sviluppo fallito: autorizzazione Google non rilevata.", "error");
      return;
    }

    addLog(`[Sviluppo AI] Avvio sviluppo artistico dello scatto: ${photo.photoId}`, "info");
    setActionLoading(photo.photoId);
    
    try {
      // 1. Set status to 'sviluppando' locally
      const updatedPhoto: PhotoItem = {
        ...photo,
        description: activeText,
        status: 'sviluppando',
        updatedAt: new Date().toISOString()
      };
      saveLocalPhoto(updatedPhoto);
      addLog(`[Local] Stato scatto impostato su "Sviluppo artistico in corso..."`, "info");

      // 2. Sync to cloud with timeout
      try {
        const promise = updateDoc(doc(db, 'photos', photo.photoId), {
          description: activeText,
          status: 'sviluppando',
          updatedAt: new Date().toISOString()
        });
        await Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 3000))]);
        addLog(`[Firestore] Stato scatto sincronizzato nel Cloud ("In sviluppo...")`, "success");
      } catch (dbErr) {
        console.warn("Firestore sync delayed:", dbErr);
        addLog("[Firestore Offline] Stato scatto non caricato. Sviluppo AI proceed offline in corso.", "warning");
      }

      addLog(`[Imagen AI] Richiesta elaborazione del modello generativo Imagen 3 con lo stile selezionato...`, "info");
      const response = await fetch('/api/gemini/develop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': geminiApiKey
        },
        body: JSON.stringify({
          description: activeText,
          stylePrompt: photo.stylePrompt
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Impossibile sviluppare l'immagine.");
      }

      const result = await response.json();
      addLog("[Imagen AI] Immagine artistica generata con successo! Preparazione del file...", "success");
      const developedUrl = `data:image/png;base64,${result.imageBytes}`;

      // 4. Upload the developed creative photo back to Google Drive
      addLog("[Drive] Connessione a Google Drive in corso per il salvataggio dell'immagine sviluppata...", "info");
      const folderId = await getOrCreateDevelopFolder(accessToken);
      const devFilename = `Sviluppato_${photo.photoId}.png`;
      
      addLog(`[Drive] Caricamento del file "${devFilename}" in corso su Drive...`, "info");
      const driveUpload = await uploadBase64ToDrive(accessToken, folderId, devFilename, developedUrl);
      addLog(`[Drive] Immagine artistica salvata con successo! Google Drive File ID: ${driveUpload.id}`, "success");

      // 5. Successfully complete development locally
      const completedPhoto: PhotoItem = {
        ...updatedPhoto,
        developedPhotoUrl: developedUrl,
        developedDriveId: driveUpload.id,
        status: 'completato',
        updatedAt: new Date().toISOString()
      };
      saveLocalPhoto(completedPhoto);
      addLog("[Local] Sviluppo fotografico registrato correttamente nel browser.", "success");

      // 6. Sync to cloud with timeout
      try {
        const promise = updateDoc(doc(db, 'photos', photo.photoId), {
          developedPhotoUrl: developedUrl,
          developedDriveId: driveUpload.id,
          status: 'completato',
          updatedAt: new Date().toISOString()
        });
        await Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 3500))]);
        addLog("[Firestore] Sviluppo ritratto sincronizzato con successo nel database Cloud!", "success");
      } catch (dbErr) {
        console.warn("Firestore sync delayed:", dbErr);
        addLog("[Firestore Offline] Salvataggio Cloud ritardato. Lo sviluppo è disponibile in locale nel browser.", "warning");
      }

    } catch (err: any) {
      console.error(err);
      addLog(`[Sviluppo Fallito] Si è verificato un errore: ${err.message || err}`, "error");
      showNotification(`Sviluppo fallito: ${err.message}`, "error");
      
      // Return status to edit state
      const revertedPhoto: PhotoItem = {
        ...photo,
        status: 'descritto',
        updatedAt: new Date().toISOString()
      };
      saveLocalPhoto(revertedPhoto);
      
      try {
        await updateDoc(doc(db, 'photos', photo.photoId), {
          status: 'descritto',
          updatedAt: new Date().toISOString()
        });
      } catch {}
    } finally {
      setActionLoading(null);
    }
  };

  // Delete item from app (includes warning alert first as mandated)
  const handleDeletePhoto = async (photo: PhotoItem) => {
    addLog(`[Rimozione] Eliminazione dello scatto: ${photo.photoId} in corso...`, "info");
    
    // 1. Delete associated files from Google Drive if authorized
    if (accessToken) {
      if (photo.originalDriveId) {
        try {
          addLog(`[Drive] Eliminazione file originale (ID: ${photo.originalDriveId}) su Google Drive...`, "info");
          await deleteFileFromDrive(accessToken, photo.originalDriveId);
          addLog(`[Drive] File originale eliminato correttamente da Google Drive.`, "success");
        } catch (driveErr: any) {
          console.error("Failed to delete original file from Drive:", driveErr);
          addLog(`[Drive Error] Errore nell'eliminare l'originale: ${driveErr.message || driveErr}`, "warning");
        }
      }
      if (photo.developedDriveId) {
        try {
          addLog(`[Drive] Eliminazione file di sviluppo (ID: ${photo.developedDriveId}) su Google Drive...`, "info");
          await deleteFileFromDrive(accessToken, photo.developedDriveId);
          addLog(`[Drive] File dello sviluppo artistico eliminato correttamente da Google Drive.`, "success");
        } catch (driveErr: any) {
          console.error("Failed to delete developed file from Drive:", driveErr);
          addLog(`[Drive Error] Errore nell'eliminare lo sviluppo: ${driveErr.message || driveErr}`, "warning");
        }
      }
    } else {
      addLog(`[Drive] Autorizzazione Google Drive non attiva. I file su Drive non possono essere rimossi direttamente in questa sessione.`, "warning");
    }

    try {
      // 2. Delete locally immediately
      deleteLocalPhoto(photo.photoId);
      addLog("[Local] Scatto rimosso con successo dalla cache locale del browser.", "success");

      // 3. Send delete query to Firestore with timeout
      const promise = deleteDoc(doc(db, 'photos', photo.photoId));
      await Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 3000))]);
      addLog("[Firestore] Scatto rimosso con successo dal database Cloud.", "success");
    } catch (err: any) {
      console.error(err);
      addLog(`[Rimozione Cloud Sospesa] Database Cloud non raggiungibile prima del timeout. La cancellazione è stata completata in locale.`, "warning");
    }
  };

  // Reset stuck photo status to previous stable state for user healing
  const resetPhotoStatus = async (photo: PhotoItem, targetStatus: PhotoStatus) => {
    addLog(`[Ripristino] Reimpostazione stato dello scatto ${photo.photoId} a "${targetStatus}"...`, "info");
    try {
      const updated: PhotoItem = {
        ...photo,
        status: targetStatus,
        updatedAt: new Date().toISOString()
      };
      
      // Update local state instantly
      saveLocalPhoto(updated);
      addLog(`[Local] Stato scatto ripristinato a "${targetStatus}" nel browser.`, "success");
      
      // Sync cloud safely
      try {
        await updateDoc(doc(db, 'photos', photo.photoId), {
          status: targetStatus,
          updatedAt: new Date().toISOString()
        });
        addLog(`[Cloud] Stato scatto ripristinato a "${targetStatus}" nel Cloud.`, "success");
      } catch (dbErr) {
        console.warn("Firestore status reset delayed (offline):", dbErr);
      }
    } catch (err: any) {
      console.error(err);
      addLog(`Errore nel ripristinare lo stato dello scatto: ${err.message}`, "error");
    }
  };

  // Save customized user style to collection
  const handleCreateStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newStyleName.trim() || !newStylePrompt.trim()) {
      showNotification("Inserisci un nome e una descrizione dello stile prima di salvare.", "error");
      return;
    }

    const styleId = 'style_' + Date.now();
    try {
      const newStyle: CustomStyle = {
        styleId,
        userId: user.uid,
        name: newStyleName.trim(),
        prompt: newStylePrompt.trim(),
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'styles', styleId), newStyle);
      
      // Append the new custom style to selections instead of overwriting previous styles completely
      const nextSelection = [...selectedStyles.filter(s => {
        const sId = 'id' in s ? s.id : s.styleId;
        return sId !== styleId;
      }), newStyle];
      
      setSelectedStyles(nextSelection);
      await saveSelectedStyleIdsToCloud(nextSelection);
      
      setNewStyleName('');
      setNewStylePrompt('');
      setShowStyleCreator(false);
      addLog(`Stile d'autore custom "${newStyle.name}" salvato ed applicato con successo!`, "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `styles/${styleId}`);
    }
  };

  // Delete custom style helper
  const handleDeleteStyle = async (styleId: string) => {
    try {
      await deleteDoc(doc(db, 'styles', styleId));
      
      const nextSelection = selectedStyles.filter(s => !('styleId' in s && s.styleId === styleId));
      const resolvedSelection = nextSelection.length > 0 ? nextSelection : [PRESET_PHOTOGRAPHERS[0]];
      
      setSelectedStyles(resolvedSelection);
      await saveSelectedStyleIdsToCloud(resolvedSelection);
      addLog("Stile d'autore custom rimosso con successo.", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `styles/${styleId}`);
    }
  };

  // Render only the Readme documentation hub when on GitHub Pages
  if (isGithubPages && !forceSandbox) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
        {/* Header */}
        <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-4 py-3.5">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-900/10">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                  LensAI
                  <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono font-normal">
                    Sandbox Multimodale
                  </span>
                </h1>
                <p className="text-[10px] text-zinc-500 font-mono">Sviluppo Multi-Agentico Google AI Studio</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDocTab('readme');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  docTab === 'readme' 
                    ? 'bg-zinc-900 text-white border border-zinc-855 shadow-lg shadow-zinc-950/50' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Benvenuto (README)
              </button>
              <button
                onClick={() => {
                  setDocTab('dettagli');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  docTab === 'dettagli' 
                    ? 'bg-zinc-900 text-white border border-zinc-855 shadow-lg shadow-zinc-950/50' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Guida Architettura
              </button>
              <a 
                href="https://github.com/pzero/LensAI" 
                target="_blank" 
                rel="noreferrer"
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Sorgente GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </header>

        {/* Hero banner for Multi-agent experience decoration */}
        <div className="bg-gradient-to-b from-zinc-900/60 to-zinc-950 border-b border-zinc-900/80 py-12 px-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="max-w-3xl mx-auto space-y-3 relative z-10">
            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full font-mono uppercase tracking-wider font-bold">
              Esplorazione Tecnologica Attiva
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">Il Futuro dello Sviluppo Software Collaborativo</h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl mx-auto font-sans">
              Questo portale documentale presenta le caratteristiche di **LensAI**, interamente programmato in modalità autonoma da agenti AI collaborativi sotto la supervisione del Product Owner umano.
            </p>
          </div>
        </div>

        {/* Content Container */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10">
          <article className="prose prose-invert max-w-none bg-zinc-900/30 border border-zinc-900/60 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-xs">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-8 mb-4 border-b border-zinc-850 pb-3 flex items-center gap-2 font-sans">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg sm:text-xl font-bold text-zinc-100 mt-8 mb-3 border-l-2 border-indigo-500 pl-3 font-sans">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold text-zinc-200 mt-6 mb-2 font-sans">{children}</h3>,
                p: ({ children }) => <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4 font-sans">{children}</p>,
                li: ({ children }) => <li className="text-xs sm:text-sm text-zinc-400 mb-2 list-disc ml-5 font-sans leading-relaxed">{children}</li>,
                ul: ({ children }) => <ul className="my-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="my-4 space-y-1.5 list-decimal ml-5">{children}</ol>,
                strong: ({ children }) => <strong className="font-semibold text-zinc-200">{children}</strong>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-500 pl-4 py-1.5 my-4 italic text-zinc-350 bg-zinc-950/30 rounded-r-lg font-sans text-xs sm:text-sm">{children}</blockquote>,
                code: ({ inline, className, children, ...props }: any) => {
                  return inline 
                    ? <code className="bg-zinc-900 border border-zinc-800 text-indigo-400 rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>
                    : <pre className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 my-4 overflow-x-auto text-[11px] font-mono text-zinc-400 leading-relaxed shadow-inner">{children}</pre>
                },
                a: ({ href, children }) => {
                  return (
                    <a 
                      href={href} 
                      onClick={(e) => {
                        if (href && (href.includes('LENS_AI_DETTAGLI') || href.includes('dettagli'))) {
                          e.preventDefault();
                          setDocTab('dettagli');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else if (href && (href.includes('README.md') || href === './README.md')) {
                          e.preventDefault();
                          setDocTab('readme');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-4 font-medium"
                      target={href && href.startsWith('http') ? '_blank' : undefined}
                      rel={href && href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {children}
                    </a>
                  )
                }
              }}
            >
              {docTab === 'readme' ? readmeText : dettagliText}
            </ReactMarkdown>
          </article>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-900 bg-zinc-950 py-8 px-4 text-center text-xs text-zinc-500 font-mono mt-auto">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 LensAI • Progetto di sperimentazione didattica</p>
            <button
              onClick={() => setForceSandbox(true)}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg text-[10px] text-zinc-400 font-mono transition-all cursor-pointer active:scale-95"
            >
              Entra nella Sandbox App
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // Renders a beautiful public Landing Page if user needs to sign in
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-black flex flex-col text-zinc-100 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden pt-4">
        {/* Ambient cosmic backgrounds */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-950/15 blur-[130px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-950/15 blur-[130px] rounded-full pointer-events-none z-0" />

        {/* Public Header Area */}
        <header className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-zinc-900/60 z-10 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center relative group">
              <img 
                src="/logo.png" 
                alt="LensAI Logo" 
                className="w-full h-full object-cover rounded-xl transition-all duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-indigo-500/5 mix-blend-overlay"></div>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-zinc-400 bg-clip-text text-transparent">
                LensAI
              </span>
              <span className="block text-[9px] font-mono text-indigo-400 tracking-widest uppercase leading-none mt-0.5">🔬 Studio Sperimentale</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => setActiveLandingSection('home')}
              className={`text-xs font-mono transition-all cursor-pointer ${
                activeLandingSection === 'home' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Cos'è LensAI?
            </button>
            <button 
              onClick={() => setActiveLandingSection('guide')}
              className={`text-xs font-mono transition-all cursor-pointer ${
                activeLandingSection === 'guide' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Guida Chiave API (Gratis)
            </button>
            <button 
              onClick={() => setActiveLandingSection('pwa_guide')}
              className={`text-xs font-mono transition-all cursor-pointer ${
                activeLandingSection === 'pwa_guide' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Aggiungi alla Home
            </button>
          </nav>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 text-xs font-mono font-medium rounded-xl border border-zinc-800/80 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            {isLoggingIn ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <>
                <span>Accedi</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </>
            )}
          </button>
        </header>

        {/* Dynamic Section Viewer */}
        <main className="flex-grow w-full max-w-5xl mx-auto px-6 py-10 sm:py-16 z-10 relative flex flex-col justify-center">
          {/* Responsive Mobile Tab Navigation list */}
          <div className="flex md:hidden flex-wrap gap-2 items-center justify-center mb-8 border-b border-zinc-900/65 pb-5 z-20">
            <button 
              type="button"
              onClick={() => setActiveLandingSection('home')}
              className={`px-3.5 py-2 text-[11px] font-mono rounded-xl transition-all border cursor-pointer active:scale-95 ${
                activeLandingSection === 'home' 
                  ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30 font-bold' 
                  : 'bg-zinc-950/30 text-zinc-400 border-zinc-900 hover:text-zinc-200'
              }`}
            >
              Cos'è LensAI
            </button>
            <button 
              type="button"
              onClick={() => setActiveLandingSection('guide')}
              className={`px-3.5 py-2 text-[11px] font-mono rounded-xl transition-all border cursor-pointer active:scale-95 ${
                activeLandingSection === 'guide' 
                  ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30 font-bold' 
                  : 'bg-zinc-950/30 text-zinc-400 border-zinc-900 hover:text-zinc-200'
              }`}
            >
              Guida API Key
            </button>
            <button 
              type="button"
              onClick={() => setActiveLandingSection('pwa_guide')}
              className={`px-3.5 py-2 text-[11px] font-mono rounded-xl transition-all border cursor-pointer active:scale-95 ${
                activeLandingSection === 'pwa_guide' 
                  ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30 font-bold' 
                  : 'bg-zinc-950/30 text-zinc-400 border-zinc-900 hover:text-zinc-200'
              }`}
            >
              Aggiungi alla Home
            </button>
          </div>

          {activeLandingSection === 'home' && (
            <div className="space-y-12 md:space-y-16 animate-in fade-in slide-in-from-bottom-3 duration-300">
              
              {/* Hero presentation typography */}
              <div className="space-y-5 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wider uppercase">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Sguardo Poematico + Sviluppo d'Autore
                </div>
                
                <h1 className="text-4xl sm:text-5.5xl font-extrabold tracking-tight text-white leading-tight">
                  Lo scatto reale incontra l'immaginazione artificiale.
                </h1>
                
                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-3xl">
                  LensAI unisce la vista dettagliata di <strong className="text-indigo-300">Gemini Multimodal Vision</strong> alla fisionomia pittorica e cinematografica di <strong className="text-indigo-300 font-medium">Imagen 3</strong>. Scegli uno stile fotografico leggendario o definisci la tua estetica d'autore, scatta e guarda l'AI descrivere il mondo reale in versi poetici per poi ricrearne uno sviluppo d'arte incredibile.
                </p>
              </div>

              {/* Empathetic philosophy notice (No-Profit / Fun orientation) */}
              <div className="bg-zinc-950/70 border border-zinc-900 rounded-2xl p-6 md:p-8 space-y-4 relative overflow-hidden shadow-lg backdrop-blur-sm">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Heart className="w-24 h-24 text-red-500 fill-red-500" />
                </div>
                
                <div className="flex items-center gap-2 text-rose-400">
                  <Info className="w-5 h-5" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Un accordo trasparente di pura passione tecnologica</span>
                </div>
                
                <h3 className="text-lg font-bold text-zinc-100 font-sans">
                  ⚠️ Spoiler: siamo qui per divertirci, non per venderti qualcosa.
                </h3>
                
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans">
                  Questo non è un prodotto milionario pronto per essere quotato in borsa. È un <strong>laboratorio libero nato esclusivamente per sperimentare e testare queste incredibili tecnologie</strong> di visione ed immagine. Non troverai fastidiosa pubblicità, traccianti invasivi o abbonamenti a pagamento. 
                </p>
                <p className="text-zinc-500 text-xs leading-relaxed font-sans hidden sm:block">
                  Perché sia sostenibile per tutti e non ci porti sul lastrico, supportiamo l'inserimento della propria chiave API di Gemini personale. È gratuita, si genera in 30 secondi e ti permette di finanziare il calcolo dei tuoi scatti direttamente dai canali ufficiali Google senza pagare un solo centesimo.
                </p>

                <div className="pt-3 flex flex-col sm:flex-row gap-4 sm:gap-6 border-t border-zinc-900/40">
                  <button 
                    type="button"
                    onClick={() => setActiveLandingSection('guide')} 
                    className="text-indigo-400 hover:text-indigo-300 font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer underline hover:no-underline text-left"
                  >
                    <span>🔑 Come ottengo una chiave API gratuita? Scoprilo ora &rarr;</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveLandingSection('pwa_guide')} 
                    className="text-indigo-350 hover:text-indigo-200 font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer underline hover:no-underline text-left"
                  >
                    <span>📱 Come aggiungo la scorciatoia sul telefono? Guida Home &rarr;</span>
                  </button>
                </div>
              </div>

              {/* Interactive bento: I 4 passaggi dell'alchimia automatica */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Il Percorso Alchemico Continuo</h3>
                  <h4 className="text-lg font-bold text-zinc-200">Come funziona LensAI?</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Step 1 */}
                  <div className="p-5 bg-zinc-950/45 border border-zinc-900/85 rounded-xl space-y-3.5 hover:border-zinc-800/80 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-mono text-indigo-400 font-bold">1</div>
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-bold text-zinc-250 uppercase font-mono tracking-tight flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-zinc-400 inline" />
                        Scatto d'Autore
                      </h5>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        Seleziona una o più lenti d'autore (o creane una personalizzata). Sorridi alla webcam o carica un file fotografico originale.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-5 bg-zinc-950/45 border border-zinc-900/85 rounded-xl space-y-3.5 hover:border-zinc-800/80 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-mono text-indigo-400 font-bold">2</div>
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-bold text-zinc-250 uppercase font-mono tracking-tight flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-zinc-400 inline" />
                        Visione Poematica
                      </h5>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        In un istante, Gemini Vision analizza lo scatto traducendo la realtà in una descrizione in italiano dettagliata ed emotivamente ricca.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-5 bg-zinc-950/45 border border-zinc-900/85 rounded-xl space-y-3.5 hover:border-zinc-800/80 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center text-xs font-mono text-indigo-455 font-bold">3</div>
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-bold text-zinc-250 uppercase font-mono tracking-tight flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 inline" />
                        Sviluppo Chained
                      </h5>
                      <p className="text-zinc-400 text-[11px] leading-relaxed font-sans">
                        Senza fermate, il sistema invia la prosa ad Imagen 3 che plasma il dipinto e lo stile d'autore scelto. Tutto in un solo un clic!
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-5 bg-zinc-950/45 border border-zinc-900/85 rounded-xl space-y-3.5 hover:border-zinc-800/80 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-mono text-indigo-400 font-bold">4</div>
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-bold text-zinc-250 uppercase font-mono tracking-tight flex items-center gap-1">
                        <Database className="w-3.5 h-3.5 text-zinc-400 inline" />
                        Preservazione Drive
                      </h5>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        In totale sicurezza, la fotografia reale e lo sviluppo generato vengono caricate nella cartella dedicata del tuo Google Drive!
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Call to Actions main buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-zinc-900/80">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full sm:w-auto h-13 px-8 inline-flex items-center justify-center gap-3 bg-white text-zinc-950 font-bold rounded-xl hover:bg-zinc-100 text-sm hover:scale-[1.02] transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer shadow-xl shadow-indigo-950/20"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 animate-pulse">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>{isLoggingIn ? "Autenticazione in corso..." : "Inizia l'Esperimento con Google"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLandingSection('guide')}
                  className="w-full sm:w-auto h-13 px-6 inline-flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-mono transition-all active:scale-95 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  <span>Leggi Guida API Key</span>
                </button>
              </div>

            </div>
          )}

          {activeLandingSection === 'guide' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
              
              {/* API Key Guide View */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setActiveLandingSection('home')}
                  className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer font-mono"
                >
                  &larr; Torna alla Home
                </button>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 text-indigo-400 text-xs font-mono">
                    <KeyRound className="w-4 h-4" />
                    CHIAVE API REQUISITO (100% GRATIS)
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
                    Come Generare e Usare la chiave API Gemini in 60 secondi
                  </h2>
                  <p className="text-zinc-400 text-sm max-w-3xl leading-relaxed font-sans">
                    Google mette a disposizione di programmatori e curiosi un portale gratuito per sperimentare con l'intelligenza artificiale. Non preoccuparti, non ci sono vincoli, canoni mensili o contratti d'acquisto. È una chiave personale per divertirci insieme.
                  </p>
                </div>
              </div>

              {/* Step list wizard */}
              <div className="space-y-6 max-w-3xl">
                
                {/* Step guide 1 */}
                <div className="flex flex-col sm:flex-row gap-5 p-5 bg-zinc-950/60 border border-zinc-900 rounded-2xl align-top">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-900/30 flex items-center justify-center font-mono font-bold text-xs shrink-0">1</div>
                  <div className="space-y-3 flex-grow font-sans">
                    <h4 className="text-sm font-bold text-zinc-200 uppercase font-mono tracking-tight">Accedi a Google AI Studio</h4>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Fai clic per atterrare sul portale ufficiale di Google: <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-450 hover:text-indigo-400 underline font-mono inline-flex items-center gap-1">aistudio.google.com <ExternalLink className="w-3 h-3 text-indigo-450 inline" /></a>. Ti chiederà semplicemente un accesso rapido con il tuo account Google normale.
                    </p>
                    
                    {/* Real guide image for step 1 */}
                    <div className="w-full border border-zinc-850/60 rounded-xl overflow-hidden shadow-lg bg-zinc-950 flex flex-col items-center justify-center">
                      <img 
                        src={aiStudioGuide1} 
                        alt="Accedi a Google AI Studio - Schermata Iniziale" 
                        className="w-full h-auto object-cover max-h-[380px] rounded-lg" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>

                {/* Step guide 2 */}
                <div className="flex flex-col sm:flex-row gap-5 p-5 bg-zinc-950/60 border border-zinc-900 rounded-2xl align-top">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-805 flex items-center justify-center font-mono font-bold text-xs shrink-0">2</div>
                  <div className="space-y-3 flex-grow font-sans">
                    <h4 className="text-sm font-bold text-zinc-200 uppercase font-mono tracking-tight">Fai clic su "Get API Key"</h4>
                    <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                      All'interno del portale di Google, se la barra laterale non è già visibile, apri il menu di navigazione in alto a sinistra premendo sull'<strong>icona con le tre lineette orizzontali</strong>. Troverai la voce <strong>"Get API key"</strong> contrassegnata da un'icona a forma di chiave dorata. Cliccaci sopra per accedere al gestore chiavi.
                    </p>

                    {/* Real guide image for step 2 */}
                    <div className="w-full border border-zinc-850/60 rounded-xl overflow-hidden shadow-lg bg-zinc-950 flex flex-col items-center justify-center">
                      <img 
                        src={aiStudioGuide2} 
                        alt="Apri il menu e clicca su Get API Key" 
                        className="w-full h-auto object-cover max-h-[380px] rounded-lg" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>

                {/* Step guide 3 */}
                <div className="flex flex-col sm:flex-row gap-5 p-5 bg-zinc-950/60 border border-zinc-900 rounded-2xl align-top">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-805 flex items-center justify-center font-mono font-bold text-xs shrink-0">3</div>
                  <div className="space-y-3 flex-grow font-sans">
                    <h4 className="text-sm font-bold text-zinc-200 uppercase font-mono tracking-tight">Crea e Copia la Tua Chiave</h4>
                    <p className="text-zinc-400 text-xs leading-relaxed font-sans font-sans">
                      Fai clic sul pulsante per generare una nuova chiave API. Ti verrà mostrata una finestra in cui potrai assegnare un nome al token (es. <strong>"AK-lensAI"</strong>) e selezionare un progetto associato (es. <strong>"Gemini Project"</strong>). In seguito, premi sull'evidente pulsante azzurro <strong>"Crea chiave"</strong>. Copia poi la stringa d'accesso generata (inizia di solito con <code>AIzaSy...</code>) cliccando sull'icona di copia.
                    </p>

                    {/* Real guide image for step 3 */}
                    <div className="w-full border border-zinc-850/60 rounded-xl overflow-hidden shadow-lg bg-zinc-950 flex flex-col items-center justify-center">
                      <img 
                        src={aiStudioGuide3} 
                        alt="Crea una nuova chiave API con il nome desiderato" 
                        className="w-full h-auto object-cover max-h-[380px] rounded-lg" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>

                {/* Step guide 4 */}
                <div className="flex flex-col sm:flex-row gap-5 p-5 bg-zinc-950/60 border border-zinc-900 rounded-2xl align-top">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-805 flex items-center justify-center font-mono font-bold text-xs shrink-0">4</div>
                  <div className="space-y-3 flex-grow font-sans">
                    <h4 className="text-sm font-bold text-zinc-200 uppercase font-mono tracking-tight">Torna su LensAI ed Esplora</h4>
                    <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                      Accedi a LensAI cliccando su "Entra con Google". Incolla la tua chiave API nella barra di impostazione posta in cima alla galleria. La chiave resterà custodita esclusivamente dentro la memoria locale del tuo dispositivo nel browser e nel tuo account database personalizzato.
                    </p>
                  </div>
                </div>

              </div>

              {/* Empathetic recap reminder */}
              <div className="bg-amber-950/15 border border-amber-900/40 p-5 rounded-xl text-xs space-y-2.5 max-w-3xl font-sans">
                <div className="font-mono font-semibold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-500" />
                  Un Piccolo Patto di Sostenibilità Amichevole
                </div>
                <p className="text-zinc-450 leading-relaxed font-sans">
                  Imagen 3 e Gemini Vision esibiscono calcoli computazionali di proporzioni titaniche. Chiediamo a ciascuno la propria chiave API non per pigrizia, ma per permettere a questo esperimento no-profit di rimanere aperto e visitabile liberamente a vita da chiunque in modo sostenibile, sfidando finti paywall artificiali nel nome della pura curiosità scientifica!
                </p>
              </div>

              {/* Actions for stepper guide */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full sm:w-auto h-12 px-8 inline-flex items-center justify-center gap-2.5 bg-white text-zinc-950 font-bold rounded-xl hover:bg-zinc-100 text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-950/20 active:scale-95 animate-pulse"
                >
                  <span>Ho capito tutto, Accedi con Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLandingSection('home')}
                  className="w-full sm:w-auto text-xs text-zinc-400 hover:text-zinc-200 transition-all font-mono py-3 cursor-pointer text-center"
                >
                  Mostra di nuovo la presentazione
                </button>
              </div>

            </div>
          )}

          {activeLandingSection === 'pwa_guide' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300 font-sans">
              
              {/* Home shortcut / PWA Guide title */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setActiveLandingSection('home')}
                  className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer font-mono"
                >
                  &larr; Torna alla Home
                </button>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 text-indigo-400 text-xs font-mono">
                    <Camera className="w-4 h-4" />
                    PWA & SCORCIATOIE MOBILI PORTATILI
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
                    Come Aggiungere LensAI alla Home del tuo Telefono
                  </h2>
                  <p className="text-zinc-400 text-sm max-w-3xl leading-relaxed font-sans">
                    LensAI è pensata per essere una macchina fotografica da passeggio. Puoi installarla direttamente sul tuo iPhone o telefono Android in pochi secondi, facendola comportare come una vera e propria applicazione a tutto schermo senza barre del browser di disturbo!
                  </p>
                </div>
              </div>

              {/* Platforms splitting cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                
                {/* iOS Method Safari */}
                <div className="p-6 bg-zinc-950/60 border border-zinc-900 rounded-2xl space-y-5">
                  <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-3">
                    <span className="text-indigo-400 font-mono text-xs font-bold uppercase tracking-wide">Metodo Apple iPhone & iPad</span>
                  </div>

                  <div className="space-y-4 text-xs font-sans">
                    <div className="space-y-1">
                      <span className="text-zinc-200 font-semibold block">1. Apri questo sito su Safari</span>
                      <p className="text-zinc-400 leading-relaxed">
                        Visita **LensAI** usando il browser nativo **Safari** del tuo iPhone.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-200 font-semibold block">2. Premi l'icona di Condivisione</span>
                      <p className="text-zinc-400 leading-relaxed">
                        Fai tap sul tasto "Condividi" (il rettangolino con la freccia rivolta verso l'alto) dalla barra dei menu inferiore.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-200 font-semibold block">3. Seleziona "Aggiungi alla schermata Home"</span>
                      <p className="text-zinc-405 leading-relaxed">
                        Scorri il menu delle azioni verso il basso e premi su **"Aggiungi alla schermata Home"** (o *"Add to Home Screen"*).
                      </p>
                    </div>

                    {/* Image placeholder for iOS sharing */}
                    <div className="w-full aspect-[16/10] bg-zinc-900/40 border border-zinc-855 rounded-xl flex flex-col items-center justify-center p-4 text-center mt-3">
                      <div className="w-7 h-7 rounded-full bg-zinc-805 flex items-center justify-center text-zinc-500 mb-1">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">[Immagine Guida: Condividi su iOS Safari]</span>
                      <span className="text-[9px] text-zinc-650 font-mono italic">(In attesa di caricamento screenshot)</span>
                    </div>

                  </div>
                </div>

                {/* Android Method Chrome */}
                <div className="p-6 bg-zinc-950/60 border border-zinc-900 rounded-2xl space-y-5">
                  <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-3">
                    <span className="text-indigo-400 font-mono text-xs font-bold uppercase tracking-wide">Metodo Google Android Chrome</span>
                  </div>

                  <div className="space-y-4 text-xs font-sans">
                    <div className="space-y-1">
                      <span className="text-zinc-200 font-semibold block">1. Apri questo sito su Google Chrome</span>
                      <p className="text-zinc-400 leading-relaxed font-sans">
                        Visita **LensAI** tramite il browser **Google Chrome** sul tuo dispositivo mobile.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-200 font-semibold block">2. Premi l'icona coi tre punti &bull;&bull;&bull;</span>
                      <p className="text-zinc-400 leading-relaxed font-sans">
                        Fai tap sull'icona delle impostazioni di Chrome in alto a destra (tre pallini verticali).
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-200 font-semibold block">3. Seleziona "Aggiungi a schermata Home"</span>
                      <p className="text-zinc-400 leading-relaxed font-sans">
                        Fai tap su **"Aggiungi a schermata Home"** (oppure *"Installa applicazione"* o *"Crea collegamento"*).
                      </p>
                    </div>

                    {/* Image placeholder for Android Chrome */}
                    <div className="w-full aspect-[16/10] bg-zinc-900/40 border border-zinc-855 rounded-xl flex flex-col items-center justify-center p-4 text-center mt-3">
                      <div className="w-7 h-7 rounded-full bg-zinc-805 flex items-center justify-center text-zinc-500 mb-1">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">[Immagine Guida: Opzioni su Android Chrome]</span>
                      <span className="text-[9px] text-zinc-650 font-mono italic">(In attesa di caricamento screenshot)</span>
                    </div>

                  </div>
                </div>

              </div>

              {/* Empathetic benefit banner */}
              <div className="bg-indigo-950/15 border border-indigo-900/40 p-5 rounded-xl text-xs space-y-2.5 max-w-4xl font-sans text-left">
                <div className="font-mono font-semibold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Perché configurare la scorciatoia ti cambierà l'esperienza
                </div>
                <p className="text-zinc-440 leading-relaxed font-sans">
                  Quando LensAI viene avviata direttamente dalla Home screen del tuo smartphone, le barre degli indirizzi superiore e inferiore visibili nel browser si nascondono automaticamente. Avrai a disposizione un'interfaccia d'avanguardia a schermo intero come se fosse una fotocamera nativa d'autore, comoda e reattiva mentre scatti le tue opere all'aria aperta!
                </p>
              </div>

              {/* Actions for PWA guide */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full sm:w-auto h-12 px-8 inline-flex items-center justify-center gap-2.5 bg-white text-zinc-950 font-bold rounded-xl hover:bg-zinc-100 text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-950/20 active:scale-95 animate-pulse"
                >
                  <span>Inizia ed Accedi con Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLandingSection('home')}
                  className="w-full sm:w-auto text-xs text-zinc-400 hover:text-zinc-200 transition-all font-mono py-3 cursor-pointer text-center"
                >
                  Mostra di nuovo la presentazione
                </button>
              </div>

            </div>
          )}

        </main>

        {/* Public Landing Footer */}
        <footer className="bg-zinc-950/40 border-t border-zinc-900/60 px-6 py-8 text-center text-[10px] text-zinc-600 font-mono mt-auto z-10 relative">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="flex items-center gap-1.5 text-zinc-500 justify-center">
              LensAI — Laboratorio Libero di Arte & Fotografia Generativa 2026.
            </p>
            <div className="flex gap-4">
              <span>Nessun Fine di Lucro 🤍</span>
              <span>•</span>
              <span>Integrazione Google Drive Diretta</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      
      {/* 1. Header Toolbar */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center bg-zinc-950">
              <img 
                src="/logo.png" 
                alt="LensAI Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                LensAI
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono tracking-wider px-1.5 py-0.5 rounded border border-indigo-500/30">STUDIO PORTABLE</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono">
                Loggato come: <span className="text-zinc-300">{user?.displayName || 'Utente'}</span>
              </p>
            </div>
          </div>

          {/* Core Heartbeat Statistics Dashboard */}
          <div className="flex flex-wrap items-center gap-3 md:gap-5 bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80">
            <div className="flex items-center gap-2 px-2.5 py-1">
              <Users className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] font-mono text-zinc-500 leading-none">ONLINE ORA</div>
                <div className="text-xs font-mono font-bold text-emerald-300">{onlineUsers}</div>
              </div>
            </div>
            <div className="w-px h-5 bg-zinc-800 hidden md:block"></div>
            <div className="flex items-center gap-2 px-2.5 py-1">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="text-[10px] font-mono text-zinc-500 leading-none">MIE FOTO SUL DRIVE</div>
                <div className="text-xs font-mono font-bold text-zinc-200">{getMergedPhotos().length}</div>
              </div>
            </div>
            <div className="w-px h-5 bg-zinc-800 hidden md:block"></div>
            <div className="flex items-center gap-2 px-2.5 py-1">
              <Database className="w-4 h-4 text-violet-400" />
              <div>
                <div className="text-[10px] font-mono text-zinc-500 leading-none">TOTALE SVILUPPI COMMUNITY</div>
                <div className="text-xs font-mono font-bold text-zinc-200">{globalPhotos}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyForm(prev => !prev)}
              className={`p-2 rounded-lg border transition-all ${
                geminiApiKey 
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800' 
                  : 'bg-red-950/40 border-red-900/45 text-red-300 hover:bg-red-950 animate-pulse'
              }`}
              title="Configura la tua API Key Gemini"
            >
              <KeyRound className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
              title="Disconnetti"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Real-time Status Center banner indicating Firebase vs Local fallback */}
      <div className="bg-zinc-950/40 border-b border-zinc-900/80 px-4 py-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 uppercase">Stato Database:</span>
            {dbFirebaseStatus === 'connected' ? (
              <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Firebase Firestore (Sincronizzato/Cloud)</span>
              </div>
            ) : dbFirebaseStatus === 'offline' ? (
              <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-900/60 text-amber-400 px-2 py-0.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
                <span>Offline Cache (Local Storage Fallback Attivo)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full animate-pulse">
                <span>Verifica connessione database...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 uppercase">Spazio Immagini:</span>
            {dbFirebaseStatus === 'connected' ? (
              <div className="flex items-center gap-1.5 bg-indigo-950/40 border border-indigo-900/50 text-indigo-400 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                <span>Cloud Attivo (Salvataggio Drive + Firebase Sincronizzato)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-amber-950/30 border border-amber-900/40 text-amber-500 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                <span>Storage Locale (Quota limitata 5MB - Pruning Attivo)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:py-8 space-y-8">
        
        {/* API Key configuration alert panel */}
        {showKeyForm && (
          <div className="bg-zinc-950 rounded-2xl border border-zinc-900 p-6 space-y-4 relative overflow-hidden transition-all shadow-xl">
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-violet-600"></div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 shrink-0">
                <Settings className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Configura la tua API Key personale di Gemini</h3>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                  Per salvaguardare i crediti del proprietario e permetterti di utilizzare pienamente l'applicazione senza limiti artificiali di quota quotidiana, l'app richiede l'attivazione della tua API Key di Google AI Studio. 
                  L'API Key rimarrà caricata esclusivamente nel tuo profilo privato sicuro e crittografato su Firebase.
                </p>
              </div>
            </div>

            {loadConfigError && (
              <div className="bg-amber-950/30 border border-amber-900/50 text-amber-300 p-3.5 rounded-xl text-xs space-y-1.5 font-mono leading-relaxed">
                <p className="font-bold">⚠️ Avviso di caricamento configurazione:</p>
                <p>{loadConfigError}</p>
                <p className="text-[10px] text-zinc-500">Nota: Prova ad inserire e salvare la tua chiave qui sotto. Molti database Firestore nuovi richiedono che sia effettuata la prima scrittura per approvare l'utente.</p>
              </div>
            )}

            {saveKeyError && (
              <div className="bg-red-950/50 border border-red-900/50 text-red-200 p-4 rounded-xl text-xs space-y-1 font-mono leading-relaxed animate-pulse">
                <p className="font-bold text-red-400">🚨 Errore durante il Salvataggio:</p>
                <p>{saveKeyError}</p>
                <p className="pt-1.5 text-[10px] text-zinc-500">Istruzioni: Controlla che la tua connessione Internet sia attiva e che non ci siano limitazioni sulle regole di sicurezza del database Firebase.</p>
              </div>
            )}

            <form onSubmit={handleSaveApiKey} className="max-w-2xl flex flex-col sm:flex-row gap-3">
              <input 
                type="password"
                placeholder="Inserisci la tua API Key (es. AIzaSy...)"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="flex-1 h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-sm font-mono focus:border-indigo-500 focus:outline-none placeholder-zinc-600"
              />
              <button
                type="submit"
                disabled={savingKey}
                className="h-11 px-6 bg-indigo-600 hover:bg-indigo-500 transition-all font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 text-white whitespace-nowrap active:scale-95 disabled:opacity-50"
              >
                {savingKey ? 'Salvataggio...' : 'Conferma e Salva'}
              </button>
            </form>

            <div className="text-[11px] text-zinc-500 leading-relaxed space-y-1 pt-1 pb-3 border-t border-zinc-900/85">
              <p>
                <strong>Come ottenerne una gratuitamente?</strong> Accedi a <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-zinc-400 underline hover:text-white inline-flex items-center gap-0.5">Google AI Studio <ExternalLink className="w-3 h-3" /></a> con il tuo account Gmail e clicca su <strong>"Get API Key"</strong>. Di base, include importanti quote gratuite!
              </p>
              <p>
                <strong>Come caricare del credito?</strong> Se desideri superare le limitazioni di utilizzo gratuito, connetti un account di fatturazione (billing Cloud) sulla console Google Cloud/AI Studio per configurare il pagamento a consumo (poche frazioni di centesimo a scatto!).
              </p>
            </div>

            {/* Prompt Customization Segment */}
            <div className="border-t border-zinc-900/90 pt-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-1 w-full">
                  <h3 className="text-sm font-semibold text-white">Configuratore Prompt Gemini Vision (Descrizione Foto)</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed max-w-2xl">
                    Visualizza, modifica e salva il prompt di sistema multimediale inviato a Gemini per ricavare la descrizione delle immagini. Le modifiche verranno utilizzate per i prossimi processi di conversione delle fotografie in testo e salvate stabilmente sul tuo cloud.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="block text-[11px] font-medium text-zinc-400">
                  Istruzioni di Analisi Multimodale (Prompt AI)
                </label>
                <textarea
                  value={editablePrompt}
                  onChange={(e) => setEditablePrompt(e.target.value)}
                  rows={6}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-xs font-mono text-zinc-300 focus:border-indigo-500 focus:outline-none placeholder-zinc-650 leading-relaxed resize-y"
                  placeholder="Istruzioni strutturate per Gemini Vision..."
                />
                
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditablePrompt(DEFAULT_SYSTEM_PROMPT);
                      addLog("Prompt ripristinato ai parametri predefiniti (premi 'Salva' per rendere le modifiche effettive nel cloud).", "info");
                    }}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all rounded-xl text-xs font-medium active:scale-95"
                  >
                    Ripristina Default
                  </button>
                  <button
                    type="button"
                    disabled={savingPrompt}
                    onClick={() => handleSaveCustomPrompt(editablePrompt)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 transition-all text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {savingPrompt ? 'Salvataggio...' : 'Salva Modifiche Prompt'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Warning if no API configured */}
        {!geminiApiKey && !showKeyForm && (
          <div className="bg-amber-950/20 border border-amber-900/50 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-200">
                Non hai ancora inserito la tua API Key Gemini. Devi fornire una chiave personale per far descrivere e sviluppare i tuoi scatti con l'IA.
              </p>
            </div>
            <button 
              onClick={() => setShowKeyForm(true)}
              className="text-xs bg-amber-500 hover:bg-amber-400 transition-all text-black font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap"
            >
              Configura ora
            </button>
          </div>
        )}

        {/* 3. Section Grid: Camera capture on top, styles selector, and Gallery in wide panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Camera & Settings (Width: 5 Cols on large) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-zinc-950 rounded-2xl border border-zinc-900 p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">Ottica Sviluppo AI</h2>
                </div>
                
                {/* Fallback info */}
                <span className="text-[10px] text-zinc-500 font-mono">Camera o Carica File</span>
              </div>

              {/* Viewfinder block */}
              <div 
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`relative aspect-video rounded-xl overflow-hidden bg-zinc-900/50 border flex flex-col items-center justify-center transition-all ${
                  isDragging ? 'border-indigo-500 bg-indigo-950/10' : 'border-zinc-800'
                }`}
              >
                {cameraActive ? (
                  <video 
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current) {
                        el.srcObject = streamRef.current;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? '-scale-x-100' : ''}`}
                  />
                ) : capturedImage ? (
                  <img 
                    src={capturedImage}
                    alt="Acquisito dal sensore"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-500">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-300 font-medium">Trascina un file immagine qui</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">oppure scatta con la webcam</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-[11px] px-3 py-1.5 rounded transition-all">
                      Sfoglia dispositivo
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileRead(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}

                {/* Camera controller overlays */}
                {cameraActive && (
                  <>
                    {/* Floating camera switcher overlay */}
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="absolute top-3 left-3 p-2 bg-black/85 hover:bg-zinc-900 text-indigo-300 hover:text-white border border-zinc-800/80 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 text-[10px] uppercase tracking-wide font-mono font-bold z-10 cursor-pointer shadow-lg"
                      title="Cambia fotocamera (Frontale / Posteriore)"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-once" />
                      <span>{cameraFacingMode === 'user' ? 'Frontale' : 'Posteriore'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={isCapturing}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-white hover:bg-zinc-200 rounded-full flex items-center justify-center text-black border-4 border-black/40 transition-all active:scale-95 cursor-pointer z-10"
                      title="Scatta ora"
                    >
                      <div className="w-8 h-8 rounded-full border-2 border-dashed border-red-500/80 animate-spin" style={{ display: isCapturing ? 'block' : 'none' }}></div>
                      {!isCapturing && <div className="w-5 h-5 rounded-full bg-red-600"></div>}
                    </button>
                  </>
                )}

                {capturedImage && (
                  <button
                    type="button"
                    onClick={() => setCapturedImage(null)}
                    className="absolute top-3 right-3 p-1.5 bg-black/80 rounded-lg text-zinc-400 hover:text-white border border-zinc-800 transition-all cursor-pointer z-10"
                    title="Resetta l'acquisizione"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Interaction buttons underneath camera */}
              <div className="flex gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="flex-1 h-11 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-800 transition-all cursor-pointer active:scale-95"
                  >
                    <Camera className="w-4 h-4 text-zinc-400" />
                    Attiva Webcam
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="flex-grow h-11 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-350 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                    >
                      <RefreshCw className="w-4 h-4 text-indigo-400" />
                      <span>{cameraFacingMode === 'user' ? 'Usa Posteriore' : 'Usa Frontale'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 h-11 bg-red-950/45 border border-red-900/60 hover:bg-red-900/40 text-red-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                    >
                      Spegni
                    </button>
                  </>
                )}
              </div>

              {/* Style Selector */}
              <div className="space-y-3 pt-3 border-t border-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-500 uppercase">Stile d'Autore Applicato</span>
                  <button
                    onClick={() => setShowStyleCreator(prev => !prev)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Stile Personalizzato
                  </button>
                </div>

                {/* Preset List and custom user styles in single flow */}
                <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-56 pr-1">
                  {/* Preset photographers */}
                  {PRESET_PHOTOGRAPHERS.map((style) => {
                    const isSelected = selectedStyles.some(s => 'id' in s && s.id === style.id);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleToggleStyle(style)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-indigo-950/30 border-indigo-500/60 text-indigo-200 ring-1 ring-indigo-500/20' 
                            : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <div className="font-bold text-xs truncate">{style.name}</div>
                          {isSelected && (
                            <CheckCircle className="w-3 h-3 text-indigo-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[9px] text-zinc-500 truncate mt-1 w-full">{style.prompt.substring(0, 30)}...</div>
                      </button>
                    );
                  })}

                  {/* Custom user styles */}
                  {customStyles.map((style) => {
                    const isSelected = selectedStyles.some(s => 'styleId' in s && s.styleId === style.styleId);
                    const isConfirming = styleIdToDelete === style.styleId;
                    return (
                      <div 
                        key={style.styleId}
                        className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group ${
                          isSelected 
                            ? 'bg-indigo-950/30 border-indigo-500/60 text-indigo-200 ring-1 ring-indigo-500/20' 
                            : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {isConfirming ? (
                          <div className="absolute inset-0 bg-zinc-950/95 rounded-xl p-2 flex flex-col justify-between z-20 animate-in fade-in duration-150 border border-red-900/40">
                            <span className="text-[10px] text-red-300 font-mono font-bold leading-tight uppercase">Rimuovere stile?</span>
                            <div className="flex gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStyleIdToDelete(null);
                                }}
                                className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-850 rounded text-[9.5px] text-zinc-300 border border-zinc-800"
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStyle(style.styleId);
                                  setStyleIdToDelete(null);
                                }}
                                className="px-1.5 py-0.5 bg-red-900 hover:bg-red-700 text-white rounded text-[9.5px]"
                              >
                                Sì
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleStyle(style)}
                              className="w-full text-left flex flex-col justify-between h-full"
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <span className="font-bold text-xs truncate">{style.name}</span>
                                {isSelected ? (
                                  <CheckCircle className="w-3 h-3 text-indigo-400 shrink-0" />
                                ) : (
                                  <span className="text-[7.5px] tracking-wider uppercase bg-zinc-800 px-1 py-0.2 rounded text-zinc-500 shrink-0 font-mono">Custom</span>
                                )}
                              </div>
                              <div className="text-[9px] text-zinc-500 truncate mt-1 w-full">{style.prompt.substring(0, 30)}...</div>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStyleIdToDelete(style.styleId);
                              }}
                              className="absolute bottom-1 right-1 p-1 bg-zinc-950 rounded opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all border border-zinc-800 z-10"
                              title="Rimuovi stile"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Selected Style Detail view */}
                {(() => {
                  const blended = getBlendedStyle();
                  return (
                    <div className="bg-zinc-900/55 p-3 rounded-xl border border-zinc-800 text-[11px] leading-relaxed text-zinc-400 space-y-1.5">
                      <div className="flex items-center justify-between font-mono text-[9px] text-zinc-500 border-b border-zinc-850 pb-1">
                        <span>CONFIGURAZIONE STILI ({selectedStyles.length} SELEZIONATI)</span>
                        {selectedStyles.length > 1 && (
                          <span className="text-[8.5px] font-bold text-indigo-400 uppercase tracking-widest animate-pulse">MIX ATTIVO</span>
                        )}
                      </div>
                      <div className="font-mono font-bold text-zinc-200">
                        {blended.name}
                      </div>
                      <div className="text-zinc-400 text-[10.5px]">
                        {blended.description}
                      </div>
                      <div className="font-mono text-zinc-500 text-[9px] mt-1 break-all line-clamp-2 hover:line-clamp-none transition-all">
                        PROMPT: {blended.prompt}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Styled Save Dialogue */}
              {showStyleCreator && (
                <form onSubmit={handleCreateStyle} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <div className="text-xs font-mono font-bold text-zinc-300">NUOVO STILE PERSONALIZZATO</div>
                  <div className="space-y-2">
                    <input 
                      type="text"
                      placeholder="Nome stile (es. Neon Cyberpunk)"
                      value={newStyleName}
                      onChange={(e) => setNewStyleName(e.target.value)}
                      className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                    <textarea 
                      placeholder="Prompt dello stile (es. Cinematic soft glow, neon, heavy reflections on rainy street, extreme depth of field...)"
                      rows={3}
                      value={newStylePrompt}
                      onChange={(e) => setNewStylePrompt(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs focus:border-indigo-500 focus:outline-none placeholder-zinc-600 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowStyleCreator(false)}
                      className="flex-1 h-8 bg-zinc-800 hover:bg-zinc-700 transition-all text-zinc-400 hover:text-white rounded-lg text-[11px]"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-500 transition-all text-white font-medium rounded-lg text-[11px]"
                    >
                      Salva Stile
                    </button>
                  </div>
                </form>
              )}

              {/* Custom trigger parameters before upload */}
              <div className="space-y-2 pt-3 border-t border-zinc-900">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none">Note o prompt utente allo scatto (Opzionale)</span>
                <input 
                  type="text"
                  placeholder="Aggiungi una parola chiave o nota (es. 'sorridente, sotto la pioggia')"
                  value={userPromptModifier}
                  onChange={(e) => setUserPromptModifier(e.target.value)}
                  className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-xs focus:border-indigo-500 focus:outline-none placeholder-zinc-600"
                />
              </div>

              {/* Action save button */}
              <button
                onClick={handleSubmitPhoto}
                disabled={!capturedImage || actionLoading !== null}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvataggio foto su Google Drive...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Salva ed Inizia Sviluppo AI
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: Photography Gallery & Developments (Width: 7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-zinc-950 rounded-2xl border border-zinc-900 p-5 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">Galleria e Sviluppi AI</h2>
                </div>

                {/* Display settings */}
                <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => syncPhotosWithDrive(false)}
                      disabled={isSyncingDrive}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                        isSyncingDrive 
                          ? 'bg-zinc-900 border-zinc-850 text-zinc-500 animate-pulse' 
                          : 'bg-zinc-900 border-zinc-800 text-indigo-400 hover:bg-zinc-800/80 hover:text-indigo-300'
                      }`}
                      title="Sincronizza scatti storici e foto completate direttamente dalla cartella Google Drive"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                      {isSyncingDrive ? 'Sincronizzazione...' : 'Sincronizza con Drive'}
                    </button>

                    <button
                      onClick={() => setDisplaySideBySide(prev => !prev)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                        displaySideBySide 
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <Layout className="w-3.5 h-3.5" />
                      {displaySideBySide ? 'Originale/AI Affiancati' : 'Visualizzazione Sovrapposta'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Main List */}
              {getMergedPhotos().length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-650">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-zinc-400 font-bold text-sm">Nessuno scatto presente</h4>
                    <p className="text-xs text-zinc-650 mt-1 max-w-xs mx-auto">Scatta una foto dalla webcam o trascina un file per iniziare l'esperienza asincrona di sviluppo d'autore.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {getMergedPhotos().map((photo) => {
                    const isProcessing = actionLoading === photo.photoId;
                    const textDraft = editingDescriptions[photo.photoId] !== undefined 
                      ? editingDescriptions[photo.photoId] 
                      : photo.description || '';

                    return (
                      <div 
                        key={photo.photoId}
                        className="p-4 bg-zinc-900/35 border border-zinc-800/80 rounded-2xl space-y-4 hover:border-zinc-700/60 transition-all relative"
                      >
                        {photoIdToDelete === photo.photoId && (
                          <div className="absolute inset-0 bg-zinc-950/98 rounded-2xl p-6 flex flex-col justify-between z-30 animate-in fade-in duration-200 border border-red-950/80 backdrop-blur-sm shadow-2xl">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-red-400">
                                <Trash2 className="w-5 h-5 animate-pulse" />
                                <span className="text-sm font-bold tracking-tight uppercase font-mono">⚠️ RIMOZIONE DEFINITIVA</span>
                              </div>
                              <p className="text-zinc-350 text-xs sm:text-sm leading-relaxed font-sans mt-2">
                                Sei sicuro di voler rimuovere per sempre questo scatto dalla tua galleria? 
                              </p>
                              <p className="text-zinc-500 text-[11px] leading-relaxed font-mono">
                                Questa operazione eliminerà definitivamente lo scatto e il rispettivo sviluppo sia dal database locale/Firebase, sia dal tuo account Google Drive (rimozione definitiva dei file originali e sviluppati). L'azione non è reversibile.
                              </p>
                            </div>
                            <div className="flex justify-end gap-3 text-xs sm:text-sm pt-4 border-t border-zinc-900/80">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPhotoIdToDelete(null);
                                  addLog(`[UI] Eliminazione dello scatto ${photo.photoId} annullata.`, "info");
                                }}
                                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-all active:scale-95 font-mono cursor-pointer"
                              >
                                Annulla
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePhoto(photo);
                                  setPhotoIdToDelete(null);
                                }}
                                className="px-4 py-2 bg-red-650 hover:bg-red-500 text-white font-bold rounded-lg transition-all active:scale-95 font-mono cursor-pointer shadow-lg shadow-red-900/20"
                              >
                                Sì, Elimina definitivamente
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Title of style applied */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700/80">
                              {photo.styleName || 'Nessuno stile'}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">
                              ID: {photo.photoId}
                            </span>
                          </div>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addLog(`[UI] Tasto elimina cliccato per lo scatto ${photo.photoId}. Selezionare conferma sull'overlay per procedere.`, "warning");
                              setPhotoIdToDelete(photo.photoId);
                            }}
                            className="p-3.5 sm:p-2 rounded-lg border transition-all cursor-pointer bg-zinc-900/80 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 border border-zinc-800/80 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Elimina"
                          >
                            <Trash2 className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>

                        {/* Images dissolve container */}
                        <DissolveCard 
                          original={photo.originalPhotoUrl} 
                          originalDriveId={photo.originalDriveId}
                          developed={photo.developedPhotoUrl}
                          developedDriveId={photo.developedDriveId}
                          sideBySide={displaySideBySide} 
                          accessToken={accessToken}
                        />

                        {/* Drive action Links */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 py-1 font-mono">
                          {photo.originalDriveId && (
                            <a 
                              href={`https://docs.google.com/uc?export=download&id=${photo.originalDriveId}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-all bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800/65"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                              Originale su Drive
                            </a>
                          )}
                          {photo.developedDriveId && (
                            <a 
                              href={`https://docs.google.com/uc?export=download&id=${photo.developedDriveId}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-white transition-all bg-indigo-950/20 px-3 py-1.5 rounded-lg border border-indigo-900/40"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                              Sviluppo su Drive
                            </a>
                          )}

                          {/* Share Composite Button */}
                          {(photo.status === 'completato' || photo.developedPhotoUrl || photo.developedDriveId) ? (
                            <button
                              type="button"
                              onClick={() => handleShareComposite(photo)}
                              disabled={sharingPhotoId === photo.photoId}
                              className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white transition-all bg-emerald-950/25 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 hover:bg-emerald-600/20 shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                              title="Genera l'immagine composta affiancata con stile sovrapposto e copiala negli appunti"
                            >
                              {sharingPhotoId === photo.photoId ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              <span>Condividi (originale + AI) negli appunti</span>
                            </button>
                          ) : (
                            <div className="text-[10px] text-zinc-550 border border-zinc-850 bg-zinc-900/40 px-3 py-1.5 rounded-lg italic flex items-center gap-1.5 cursor-not-allowed">
                              <Share2 className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                              Condivisione sbloccata dopo lo sviluppo artistico
                            </div>
                          )}
                        </div>

                        {/* Text Prompt Section (Fattore descrizione) */}
                        <div className="bg-zinc-900/80 rounded-xl p-4.5 border border-zinc-800/50 space-y-3.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                              <FileText className="w-4.5 h-4.5 text-indigo-400" />
                              Fattore Descrizione AI
                            </h4>
                            
                            {/* State tracking badge */}
                            <div className="flex items-center gap-1.5">
                              {photo.status === 'scattata' && <span className="text-[10px] font-mono text-zinc-550 italic">In attesa di descrizione</span>}
                              {photo.status === 'descrivendo' && <span className="text-[10px] font-mono text-amber-400 animate-pulse">Generazione descrizione...</span>}
                              {photo.status === 'descritto' && <span className="text-[10px] font-mono text-indigo-300 flex items-center gap-1">Pronto per Sviluppo <CheckCircle className="w-3 h-3 text-emerald-400 inline" /></span>}
                              {photo.status === 'sviluppando' && <span className="text-[10px] font-mono text-indigo-400 animate-bounce">Sviluppo e ricalcolo artistico...</span>}
                              {photo.status === 'completato' && <span className="text-[10px] font-mono text-emerald-400 font-semibold">Sviluppato con Successo!</span>}
                            </div>
                          </div>

                          {/* Case 1: Display button to Describe if scattata */}
                          {photo.status === 'scattata' && (
                            <button
                              onClick={() => describePhoto(photo)}
                              disabled={isProcessing}
                              className="w-full h-10 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/25 font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
                            >
                              {isProcessing ? 'Elaborazione Visione Gemini...' : 'Avvia analisi descrittiva con Gemini'}
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}

                          {photo.status === 'descrivendo' && (
                            <div className="py-4 text-center space-y-3">
                              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400" />
                              <p className="text-xs text-zinc-500 font-mono">Gemini Vision sta analizzando dettagli, luci e soggetto...</p>
                              <button
                                onClick={() => resetPhotoStatus(photo, 'scattata')}
                                className="text-[10px] bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-amber-400 px-3 py-1.5 rounded-lg font-mono transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                                title="Annulla o sblocca lo stato se l'operazione si è interrotta"
                              >
                                <RefreshCw className="w-3 h-3 text-amber-500" /> Ripristina / Sblocca Stato
                              </button>
                            </div>
                          )}

                          {/* Case 2: Display and allow edits to text description if descritto / completato */}
                          {(photo.status === 'descritto' || photo.status === 'sviluppando' || photo.status === 'completato') && (
                            <div className="space-y-3">
                              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                                Puoi leggere e modificare liberamente il testo descrittivo elaborato da Gemini qui sotto prima dello sviluppo per guidare ulteriormente il pennello dell'AI:
                              </p>
                              <textarea
                                value={textDraft}
                                disabled={photo.status === 'sviluppando' || isProcessing}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  setEditingDescriptions(prev => ({ ...prev, [photo.photoId]: text }));
                                }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs leading-relaxed text-zinc-300 focus:border-indigo-500 focus:outline-none min-h-[100px] font-mono"
                              />
                              
                              <div className="flex gap-2 justify-end">
                                {textDraft !== photo.description && (
                                  <button
                                    onClick={() => saveDescription(photo.photoId, textDraft)}
                                    disabled={savingDescriptions[photo.photoId]}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono font-medium px-3 py-1.5 rounded-lg border border-zinc-700 transition-all"
                                  >
                                    {savingDescriptions[photo.photoId] ? 'Salvataggio...' : 'Salva Modifiche'}
                                  </button>
                                )}

                                {/* Sviluppa handler */}
                                {photo.status === 'descritto' && (
                                  <button
                                    onClick={() => developPhoto(photo)}
                                    disabled={isProcessing}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold px-4 py-1.5 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                                  >
                                    {isProcessing ? 'Sviluppo d\'arte in corso...' : 'Sviluppa Fotografia d\'Arte AI'}
                                    <Sparkles className="w-3.5 h-3.5 fill-white/10" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {photo.status === 'sviluppando' && (
                            <div className="py-6 text-center space-y-3 bg-indigo-950/10 border border-indigo-900/40 rounded-xl shadow-inner">
                              <Sparkles className="w-6 h-6 animate-pulse mx-auto text-indigo-400" />
                              <h5 className="text-xs text-indigo-300 font-bold font-mono uppercase tracking-wide">Sviluppo AI Art in corso...</h5>
                              <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">Imagen sta ricreando lo scenario fotorealistico applicando lo stile d'autore scelto. L'operazione asincrona dura pochi secondi.</p>
                              <button
                                onClick={() => resetPhotoStatus(photo, 'descritto')}
                                className="text-[10px] bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-amber-400 px-3 py-1.5 rounded-lg font-mono transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                                title="Annulla o sblocca lo stato se l'operazione si è interrotta"
                              >
                                <RefreshCw className="w-3 h-3 text-amber-500" /> Annulla / Ripristina Stato
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Real-time Activity & AI Diagnostics Terminal Panel - Relocated & compact */}
            <div className="bg-zinc-950 rounded-2xl border border-zinc-900 overflow-hidden shadow-xl transition-all mt-6">
              <button
                type="button"
                onClick={() => setTerminalExpanded(prev => !prev)}
                className="w-full text-left p-4 bg-zinc-900/10 hover:bg-zinc-900/25 flex items-center justify-between gap-3 transition-all cursor-pointer font-mono"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${actionLoading ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${actionLoading ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  </span>
                  <span className="text-zinc-300 font-bold text-xs uppercase tracking-wider">
                    MONITOR ATTIVITÀ & DIAGNOSTICA ({workflowLogs.length})
                  </span>
                  {!terminalExpanded && workflowLogs.length > 0 && (
                    <span className="text-[10px] text-zinc-500 truncate hidden sm:inline-block max-w-[280px]">
                      — {workflowLogs[0].text}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[10px] text-zinc-400 font-bold">
                  {terminalExpanded ? 'Riduci [-]' : 'Espandi [+]'}
                </div>
              </button>

              {terminalExpanded && (
                <div className="p-4 sm:p-5 border-t border-zinc-900 space-y-3">
                  {workflowLogs.length === 0 ? (
                    <p className="text-xs text-zinc-500 font-mono">Nessuna attività registrata in questa sessione. Scatta una foto o configura una chiave API per iniziare.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="max-h-56 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 bg-black/60 p-3 rounded-xl border border-zinc-900/60 scrollbar-thin">
                        {workflowLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-2 text-zinc-400">
                            <span className="text-zinc-650 shrink-0">[{log.time}]</span>
                            <span className={`flex-1 ${
                              log.type === 'error' ? 'text-red-400 font-bold' :
                              log.type === 'warning' ? 'text-amber-400' :
                              log.type === 'success' ? 'text-emerald-400 font-semibold' :
                              'text-zinc-400'
                            }`}>
                              {log.type === 'error' ? '❌ ' :
                               log.type === 'warning' ? '⚠️ ' :
                               log.type === 'success' ? '✔ ' :
                               '● '}
                              {log.text}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-900/50">
                          <span className="text-[10px] text-zinc-650">Fine del log diagnostico offline-safe di Camera Studio.</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWorkflowLogs([]);
                            }}
                            className="text-[9px] text-red-405 hover:text-red-300 transition-all underline shrink-0 font-mono uppercase font-bold cursor-pointer"
                          >
                            Pulisci cronologia log
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating alert notifications */}
      {appNotification && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl p-4 border shadow-2xl flex items-start gap-3 max-w-md animate-in slide-in-from-bottom duration-300 ${
          appNotification.type === 'error' 
            ? 'bg-red-950/90 border-red-900/60 text-red-100' 
            : appNotification.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-900/60 text-emerald-100'
            : 'bg-zinc-950/90 border-zinc-800 text-zinc-100'
        }`}>
          <div className="flex-1 text-xs font-mono leading-relaxed">
            {appNotification.message}
          </div>
          <button 
            onClick={() => setAppNotification(null)}
            className="text-zinc-400 hover:text-white text-sm font-bold px-1.5 py-0.5 bg-black/30 hover:bg-black/50 rounded transition-all shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Sharing and Clipboard Manual Fallback Helper Modal */}
      {sharedModalPhoto && sharedModalImgSrc && (
        <div className="fixed inset-0 bg-zinc-950/85 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full p-5 space-y-4 relative shadow-2xl max-h-[92vh] overflow-y-auto flex flex-col justify-between scrollbar-thin">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-zinc-200 uppercase">Immagine Di Confronto Generata</h3>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setSharedModalPhoto(null);
                  setSharedModalImgSrc(null);
                  setCopySuccess(false);
                }} 
                className="p-1.5 bg-zinc-950/80 hover:bg-zinc-800 rounded-lg border border-zinc-850 transition-all text-zinc-400 hover:text-white cursor-pointer"
                title="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas/Image Preview */}
            <div className="flex-1 overflow-hidden rounded-xl bg-zinc-950/60 border border-zinc-850 p-2.5 flex items-center justify-center min-h-[180px] md:min-h-[280px]">
              <img 
                src={sharedModalImgSrc} 
                alt="Composizione Confronto" 
                className="max-h-[50vh] object-contain w-auto rounded-lg shadow-2xl border border-zinc-800" 
              />
            </div>

            {/* Info panel & trigger copies */}
            <div className="space-y-3 pt-3.5 border-t border-zinc-800">
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-850 text-center space-y-1.5 font-sans">
                <p className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  {copySuccess ? "✓ COPIATA NEGLI APPUNTI DEL DISPOSITIVO!" : "IMMAGINE CREATA ED OTTIMIZZATA!"}
                </p>
                <p className="text-[11px] text-zinc-400 max-w-lg mx-auto leading-relaxed">
                  {copySuccess 
                    ? "La composizione è pronta nei tuoi appunti. Ora puoi andare in un'altra app (es. WhatsApp, Telegram, Messaggi) ed incollarla direttamente (tasto Incolla o tasti rapidi Ctrl+V / Cmd+V)." 
                    : "Il browser potrebbe aver limitato l'accesso diretto ai tuoi appunti per ragioni di sicurezza. Fai click destro o tieni premuto sull'anteprima sopra per salvarla o copiarla manualmente."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(sharedModalImgSrc);
                      const blob = await res.blob();
                      await navigator.clipboard.write([
                        new ClipboardItem({ [blob.type]: blob })
                      ]);
                      setCopySuccess(true);
                      addLog("[UI] Immagine copiata manualmente su richiesta dal modal.", "success");
                    } catch (err: any) {
                      addLog(`[Copia fallita] Errore: ${err.message}`, "error");
                    }
                  }}
                  className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-500 transition-all text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-lg shadow-indigo-900/10"
                >
                  <Copy className="w-4 h-4" />
                  {copySuccess ? "Copiata di nuovo negli appunti!" : "Copia di nuovo negli appunti"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSharedModalPhoto(null);
                    setSharedModalImgSrc(null);
                    setCopySuccess(false);
                  }}
                  className="flex-1 h-11 bg-zinc-800 hover:bg-zinc-700 transition-all text-zinc-400 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center active:scale-95 cursor-pointer"
                >
                  Chiudi anteprima
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* Footer system details */}
      <footer className="bg-zinc-950 border-t border-zinc-900 px-4 py-6 text-center text-[10px] text-zinc-650 font-mono mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            LensAI — Sviluppo d'arte fotografico con archiviazione diretta Google Drive. Tutti i diritti riservati 2026.
          </p>
          <div className="flex gap-3">
            <span>Powered by Gemini 3.5 & Google Cloud</span>
            <span>•</span>
            <span>Firebase DB & Autenticazione</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
