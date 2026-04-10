(() => {
  const SAVE_KEY = "darkstone_save_v1";

  const el = (id) => document.getElementById(id);
  const heroNameInput = el("heroNameInput");
  const previewImg = el("heroPreviewImg");
  const previewClass = el("heroPreviewClass");
  const previewName = el("heroPreviewName");
  const msg = el("charCreateMsg");

  let selectedHero = {
    key: "vanguard",
    label: "Vanguard",
    img: "images/heroes/hero_1.png"
  };

  function setMessage(text) {
    if (msg) msg.textContent = text || "";
  }

  function updatePreview() {
    const name = String(heroNameInput?.value || "").trim() || "Hero";
    if (previewImg) previewImg.src = selectedHero.img;
    if (previewImg) previewImg.alt = selectedHero.label;
    if (previewClass) previewClass.textContent = selectedHero.label;
    if (previewName) previewName.textContent = name;
  }

  function chooseHero(button) {
    if (!button) return;
    document.querySelectorAll(".heroChoiceCard").forEach((node) => {
      node.classList.toggle("heroChoiceActive", node === button);
    });
    selectedHero = {
      key: String(button.dataset.heroKey || "vanguard"),
      label: String(button.querySelector("span")?.textContent || "Vanguard"),
      img: String(button.dataset.heroImg || "images/heroes/hero_1.png")
    };
    updatePreview();
  }

  function createHero() {
    const heroName = String(heroNameInput?.value || "").trim();
    if (!heroName) {
      setMessage("Enter a hero name.");
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

    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    window.location.href = "index.html";
  }

  window.addEventListener("DOMContentLoaded", async () => {
    try {
      if (window.DSAuth?.requireAuth) {
        const authResult = await window.DSAuth.requireAuth();
        if (!authResult.ok) {
          if (authResult.reason === "not-configured") {
            setMessage("Add your Supabase anon key in auth.js before testing login.");
          }
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

      el("createHeroBtn")?.addEventListener("click", createHero);
      updatePreview();
      heroNameInput?.focus();
    } catch (error) {
      console.error("[create_character] boot failed", error);
      setMessage(error?.message || "Character creation failed to initialize.");
    }
  });
})();
