// Cennik trzymamy w zmiennej środowiskowej PRICING_JSON (Vercel → Settings → Environment Variables),
// dzięki temu stawek nie ma ani w kodzie strony, ani w repozytorium.
//
// Przykładowa wartość:
// {"tapeta":{"profilePerMeter":20,"areaPerM2":120}}
//
// profilePerMeter – cena brutto 1 mb profilu (zł), areaPerM2 – cena brutto 1 m² grafiki (zł)

// Limity wymiarów (cm) – muszą się zgadzać z CONFIG.limits w index.html
const LIMITS = { minW: 40, maxW: 1000, minH: 40, maxH: 300 };

function loadPricing() {
  try { return JSON.parse(process.env.PRICING_JSON || '{}'); } catch (e) { return {}; }
}

// Zwraca cenę brutto w groszach albo null, gdy produkt lub wymiary są niepoprawne.
function priceInGrosze(productId, w, h) {
  const rates = loadPricing()[productId];
  if (!rates) return null;
  if (!Number.isInteger(w) || !Number.isInteger(h)) return null;
  if (w < LIMITS.minW || w > LIMITS.maxW || h < LIMITS.minH || h > LIMITS.maxH) return null;

  const profileGr = Math.round(rates.profilePerMeter * 100); // grosze za 1 mb profilu
  const areaGr = Math.round(rates.areaPerM2 * 100);          // grosze za 1 m² grafiki
  if (!Number.isFinite(profileGr) || !Number.isFinite(areaGr)) return null;

  const perimeterCm = 2 * (w + h);   // obwód ramki
  const areaCm2 = w * h;             // powierzchnia wydruku
  return Math.round(perimeterCm * profileGr / 100 + areaCm2 * areaGr / 10000);
}

module.exports = { priceInGrosze, LIMITS };
