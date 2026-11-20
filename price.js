// GET /api/price?product=tapeta&w=250&h=180  →  { "price": 712 }  (zł brutto)
const { priceInGrosze } = require('./_pricing');

module.exports = (req, res) => {
  const { product, w, h } = req.query;
  const grosze = priceInGrosze(String(product), Number(w), Number(h));
  res.setHeader('Cache-Control', 'no-store');
  if (grosze === null) {
    return res.status(404).json({ error: 'Brak wyceny dla tego produktu lub wymiarów' });
  }
  res.status(200).json({ price: grosze / 100 });
};
