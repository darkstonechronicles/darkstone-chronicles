(() => {
  const SAVE_KEY = "darkstone_save_v1";

  const el = (id) => document.getElementById(id);
  const heroNameInput = el("heroNameInput");
  const heroChoiceGrid = el("heroChoiceGrid");
  const previewImg = el("heroPreviewImg");
  const msg = el("charCreateMsg");

  const HERO_OPTIONS = Array.from({ length: 30 }, (_, idx) => {
    const n = idx + 1;
    const defaults = {
      1: { key: "vanguard", label: "Vanguard" },
      2: { key: "cryptblade", label: "Cryptblade" },
      3: { key: "arcanist", label: "Arcanist" }
    };
    const fallback = {
      key: `hero_${n}`,
      label: `Hero ${n}`
    };
    const meta = defaults[n] || fallback;
    return {
      key: meta.key,
      label: meta.label,
      img: `images/heroes/hero_${n}.png`
    };
  });

  let selectedHero = {
    ...HERO_OPTIONS[0]
  };

  function setMessage(text) {
    if (msg) msg.textContent = text || "";
  }

  function updatePreview() {
    if (previewImg) previewImg.src = selectedHero.img;
    if (previewImg) previewImg.alt = selectedHero.label;
  }

  function chooseHero(button) {
    if (!button) return;
    document.querySelectorAll(".heroChoiceCard").forEach((node) => {
      node.classList.toggle("heroChoiceActive", node === button);
    });
    selectedHero = {
      key: String(button.dataset.heroKey || "vanguard"),
      label: String(button.dataset.heroLabel || "Vanguard"),
      img: String(button.dataset.heroImg || "images/heroes/hero_1.png")
    };
    updatePreview();
  }

  function renderHeroChoices() {
    if (!heroChoiceGrid) return;
    heroChoiceGrid.innerHTML = HERO_OPTIONS.map((hero, idx) => `
      <button
        type="button"
        class="heroChoiceCard${idx === 0 ? " heroChoiceActive" : ""}"
        data-hero-key="${hero.key}"
        data-hero-label="${hero.label}"
        data-hero-img="${hero.img}">
        <img src="${hero.img}" alt="${hero.label}">
      </button>
    `).join("");
  }

  async function createHero() {
    const heroName = String(heroNameInput?.value || "").trim();
    if (!heroName) {
      setMessage("Enter a hero name.");
      heroNameInput?.focus();
      return;
    }
    if (heroName.length < 3) {
      setMessage("Hero name must be at least 3 characters.");
      heroNameInput?.focus();
      return;
    }

    const save = {
      heroCreated: true,
      heroName,
      playerName: heroName,
      heroPortrait: selectedHero.img,
      heroClass: selectedHero.key
    };

    const createBtn = el("createHeroBtn");
    const auth = window.DSAuth;

    try {
      if (createBtn) createBtn.disabled = true;
      setMessage("Creating hero...");

      if (auth?.getSession && auth?.config?.url && auth?.config?.anonKey) {
        const session = await auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Missing access token.");

        const res = await fetch(`${auth.config.url}/functions/v1/bootstrap-player`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "apikey": auth.config.anonKey
          },
          body: JSON.stringify({
            heroName,
            heroPortrait: selectedHero.img,
            saveData: save
          })
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.error) {
          throw new Error(body?.error || body?.message || "Could not create hero.");
        }
      }

      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      window.location.href = "index.html";
    } catch (error) {
      console.error("[create_character] create hero failed", error);
      setMessage(error?.message || "Could not create hero.");
      if (createBtn) createBtn.disabled = false;
    }
  }

  window.addEventListener("DOMContentLoaded", async () => {
    try {
      if (window.DSAuth?.requireAuth) {
        const authResult = await window.DSAuth.requireAuth();
        if (!authResult.ok) {
          if (authResult.reason === "not-configured") {
            setMessage("Add your Supabase anon key in auth.js before testing login.");
          }
          window.__dsBootReady?.();
          return;
        }
        await window.DSAuth.preparePlayerState?.();
        try {
          const existing = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {};
          if (existing.heroCreated) {
            window.location.href = "index.html";
            return;
          }
        } catch {
          // ignore malformed local cache and continue with creation
        }
      }

      renderHeroChoices();

      document.querySelectorAll(".heroChoiceCard").forEach((button) => {
        button.addEventListener("click", () => chooseHero(button));
      });

      heroNameInput?.addEventListener("input", () => {
        setMessage("");
        updatePreview();
      });

      heroNameInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") createHero();
      });

      el("createHeroBtn")?.addEventListener("click", () => { void createHero(); });
      updatePreview();
      heroNameInput?.focus();
      window.__dsBootReady?.();
    } catch (error) {
      console.error("[create_character] boot failed", error);
      setMessage(error?.message || "Character creation failed to initialize.");
      window.__dsBootReady?.();
    }
  });
})();
