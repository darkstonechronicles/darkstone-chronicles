(() => {
  const el = (id) => document.getElementById(id);

  function nav(btnId, href) {
    el(btnId)?.addEventListener("click", () => {
      window.location.href = href;
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    nav("goMine", "mining.html");
    nav("goForge", "forge.html");
    nav("goWoodcut", "woodcutting.html");
    nav("goCarp", "carpentry.html");
    nav("goHunt", "hunting.html");
    nav("goFish", "fishing.html");
    nav("goCook", "cooking.html");
    nav("goEnchant", "enchanting.html");
    nav("goHerb", "herbalism.html");
    nav("goAlchemy", "alchemy.html");
  });
})();
