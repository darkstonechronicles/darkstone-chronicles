// woodcutting.js — gather hub

(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const num = (v,f=0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  function xpBarGradient(pct){
  if (pct < 25) return "linear-gradient(90deg,#b84a4a,#e06a6a)";
  if (pct < 50) return "linear-gradient(90deg,#c66a2b,#eea043)";
  if (pct < 75) return "linear-gradient(90deg,#4e9a43,#79c96b)";
  return "linear-gradient(90deg,#2f9e5b,#7be39e)";
})();
