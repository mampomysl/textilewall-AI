// Cennik trzymamy w zmiennej środowiskowej PRICING_JSON (Vercel → Settings → Environment Variables),
// dzięki temu stawek nie ma ani w kodzie strony, ani w repozytorium.
//
// Przykładowa wartość:
// {"tapeta":{"profilePerMeter":20,"areaPerM2":120},
//  "ramka":{"profilePerMeter":28.87,"areaPerM2":120,"fixedPerItem":119}}
//
// profilePerMeter – cena brutto 1 mb profilu (zł), areaPerM2 – cena brutto 1 m² grafiki (zł),
// fixedPerItem (opcjonalnie) – stała dopłata brutto do każdej sztuki, np. łączniki i akcesoria (zł)
//
// Produkt wyceniany z tabeli (mapa cen) – np. podświetlane ramki:
// "led":{"grid":{"step":10,"widths":[100,150,...],"heights":[100,150,...],"prices":[[...],...]}}
// prices[i][j] = cena brutto (zł) dla wysokości heights[i] i szerokości widths[j].
// Wymiar klienta (co 1 cm) jest zaokrąglany W GÓRĘ do pełnych 10 cm, a ceny pomiędzy punktami
// tabeli są liczone przez interpolację liniową (dwuliniową).

// Limity wymiarów (cm) – muszą się zgadzać z CONFIG.limits w index.html
const LIMITS = { minW: 40, maxW: 1000, minH: 40, maxH: 300 };

function loadPricing() {
  try { return JSON.parse(process.env.PRICING_JSON || '{}'); } catch (e) { return {}; }
}

// Znajduje przedział tabeli: zwraca [i0, i1, t], gdzie t to położenie wartości v między arr[i0] a arr[i1].
function bracket(arr, v) {
  const i = arr.findIndex(a => a >= v);
  if (i < 0) return null;
  if (arr[i] === v || i === 0) return [i, i, 0];
  return [i - 1, i, (v - arr[i - 1]) / (arr[i] - arr[i - 1])];
}

// Cena z tabeli w groszach (albo null poza zakresem tabeli).
function gridPriceInGrosze(g, w, h) {
  const { widths, heights, prices } = g;
  if (!Array.isArray(widths) || !Array.isArray(heights) || !Array.isArray(prices)) return null;
  // wymiary surowe muszą mieścić się w zakresie tabeli
  if (w < widths[0] || w > widths[widths.length - 1] || h < heights[0] || h > heights[heights.length - 1]) return null;
  const step = g.step || 10;
  const W = Math.ceil(w / step) * step;   // cena zmienia się co 10 cm (zaokrąglenie w górę)
  const H = Math.ceil(h / step) * step;
  const bw = bracket(widths, W), bh = bracket(heights, H);
  if (!bw || !bh) return null;
  const [j0, j1, tw] = bw, [i0, i1, th] = bh;
  const v = [prices[i0] && prices[i0][j0], prices[i0] && prices[i0][j1], prices[i1] && prices[i1][j0], prices[i1] && prices[i1][j1]];
  if (v.some(x => typeof x !== 'number' || !Number.isFinite(x))) return null;
  const top = v[0] + (v[1] - v[0]) * tw;
  const bottom = v[2] + (v[3] - v[2]) * tw;
  return Math.round((top + (bottom - top) * th) * 100);
}

// Zwraca cenę brutto w groszach albo null, gdy produkt lub wymiary są niepoprawne.
function priceInGrosze(productId, w, h) {
  const rates = loadPricing()[productId];
  if (!rates) return null;
  if (!Number.isInteger(w) || !Number.isInteger(h)) return null;
  if (rates.grid) return gridPriceInGrosze(rates.grid, w, h);
  if (w < LIMITS.minW || w > LIMITS.maxW || h < LIMITS.minH || h > LIMITS.maxH) return null;

  const profileGr = Math.round(rates.profilePerMeter * 100); // grosze za 1 mb profilu
  const areaGr = Math.round(rates.areaPerM2 * 100);          // grosze za 1 m² grafiki
  const fixedGr = Math.round((rates.fixedPerItem || 0) * 100);  // stała dopłata za sztukę
  if (!Number.isFinite(profileGr) || !Number.isFinite(areaGr) || !Number.isFinite(fixedGr)) return null;

  const perimeterCm = 2 * (w + h);   // obwód ramki
  const areaCm2 = w * h;             // powierzchnia wydruku
  return Math.round(perimeterCm * profileGr / 100 + areaCm2 * areaGr / 10000 + fixedGr);
}

module.exports = { priceInGrosze, LIMITS };
