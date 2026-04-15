(() => {
  const el = (id) => document.getElementById(id);

  function setStatus(text, isError = false) {
    const node = el("loginStatus");
    if (!node) return;
    node.textContent = text || "";
    node.style.color = isError ? "#ff8f8f" : "";
  }

  async function bootLogin() {
    const auth = window.DSAuth;
    if (!auth) {
      setStatus("Auth layer failed to load.", true);
      window.__dsBootReady?.();
      return;
    }

    const loginBtn = el("googleLoginBtn");
    const sub = el("loginSub");
    const returnTo = auth.getReturnTo();

    if (sub) {
      sub.textContent = returnTo === "index.html"
        ? "Sign in to continue your adventure."
        : `Sign in to continue to ${returnTo.replace(/\.html([?#].*)?$/i, "")}.`;
    }

    if (!auth.isConfigured()) {
      if (loginBtn) loginBtn.disabled = true;
      setStatus("Add your Supabase anon key in auth.js before testing login.", true);
      window.__dsBootReady?.();
      return;
    }

    setStatus("Checking session...");
    const redirected = await auth.redirectIfLoggedIn();
    if (redirected) return;

    setStatus("");
    loginBtn?.addEventListener("click", async () => {
      try {
        loginBtn.disabled = true;
        setStatus("Redirecting to Google...");
        await auth.signInWithGoogle(returnTo);
      } catch (error) {
        console.error("[login] Google sign-in failed", error);
        loginBtn.disabled = false;
        setStatus(error?.message || "Google sign-in failed.", true);
      }
    });
    window.__dsBootReady?.();
  }

  window.addEventListener("DOMContentLoaded", () => {
    bootLogin().catch((error) => {
      console.error("[login] boot failed", error);
      setStatus(error?.message || "Login page failed to initialize.", true);
      window.__dsBootReady?.();
    });
  });
})();
