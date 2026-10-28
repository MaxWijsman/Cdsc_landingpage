((Q) => {
  "use strict";
  const key = "cdsc.ai-office-quest.v1";
  Q.progress = {
    key,
    create(providedStorage) {
      let storage;
      let temporary = false;
      let blocked = false;
      let memory;
      try { storage = providedStorage === undefined ? window.localStorage : providedStorage; if (!storage) temporary = true; }
      catch { temporary = true; }
      const load = () => {
        if (memory) return Q.core.clone(memory);
        memory = Q.core.initialProgress();
        if (!storage) return Q.core.clone(memory);
        try {
          const raw = storage.getItem(key);
          if (raw) {
            if (raw.length > 100000) throw new Error("Progress too large");
            memory = Q.core.validateProgress(JSON.parse(raw));
          }
        } catch { temporary = true; blocked = true; }
        return Q.core.clone(memory);
      };
      const save = (value) => {
        memory = Q.core.clone({ ...value, updatedAt: new Date().toISOString() });
        if (storage && !blocked) {
          try { storage.setItem(key, JSON.stringify(memory)); }
          catch { temporary = true; blocked = true; }
        }
      };
      const reset = () => {
        memory = Q.core.initialProgress();
        try { storage?.removeItem(key); blocked = false; temporary = !storage; }
        catch { temporary = true; blocked = true; }
        save(memory);
        return Q.core.clone(memory);
      };
      return { load, save, reset, status: () => temporary ? "Je voortgang blijft alleen tijdens dit bezoek beschikbaar." : "Opgeslagen in deze browser.", temporary: () => temporary };
    },
  };
})(window.CDSCLearning = window.CDSCLearning || {});
