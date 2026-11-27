// POST /api/contact – przesyła wiadomość z formularza kontaktowego na e-mail (przez Resend).
// Zmienne środowiskowe (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY – klucz API z resend.com
//   CONTACT_TO     – adres, na który mają trafiać wiadomości, np. kontakt@textilewall.pl
//   CONTACT_FROM   – nadawca z zweryfikowanej w Resend domeny, np. TextileWall <formularz@textilewall.pl>
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = v => (typeof v === 'string' ? v.trim() : '');
const oneLine = v => v.replace(/[\r\n]+/g, ' ');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metoda niedozwolona.' });
  }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  // Boty: wypełnione ukryte pole albo wysyłka szybsza niż 2 s → udajemy sukces, nic nie wysyłamy
  if (str(b.website) || Number(b.elapsed) < 2000) return res.status(200).json({ ok: true });

  const name = oneLine(str(b.name)), email = oneLine(str(b.email)), phone = oneLine(str(b.phone));
  const message = str(b.message), source = oneLine(str(b.source)).slice(0, 30) || 'stopka';

  if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Podaj imię i nazwisko.' });
  if (!EMAIL_RE.test(email) || email.length > 200) return res.status(400).json({ error: 'Podaj poprawny adres e-mail.' });
  if (phone.length > 30) return res.status(400).json({ error: 'Numer telefonu jest za długi.' });
  if (message.length < 10 || message.length > 3000) return res.status(400).json({ error: 'Wiadomość powinna mieć od 10 do 3000 znaków.' });
  if (b.consent !== true) return res.status(400).json({ error: 'Zaznacz, że zapoznałeś się z Polityką prywatności.' });

  const key = process.env.RESEND_API_KEY, to = process.env.CONTACT_TO, from = process.env.CONTACT_FROM;
  if (!key || !to || !from) {
    console.error('contact: brak RESEND_API_KEY / CONTACT_TO / CONTACT_FROM');
    return res.status(500).json({ error: 'Formularz jest chwilowo niedostępny. Napisz na kontakt@textilewall.pl.' });
  }

  const text = [
    `Imię i nazwisko: ${name}`, `E-mail: ${email}`, `Telefon: ${phone || '—'}`, `Źródło: ${source}`, '', message
  ].join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject: `Formularz textilewall.pl – ${name}`.slice(0, 150), text })
    });
    if (!r.ok) {
      console.error('contact: Resend', r.status, await r.text());
      return res.status(502).json({ error: 'Nie udało się wysłać wiadomości. Spróbuj ponownie lub napisz na kontakt@textilewall.pl.' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('contact: błąd sieci', e);
    return res.status(502).json({ error: 'Nie udało się wysłać wiadomości. Spróbuj ponownie lub napisz na kontakt@textilewall.pl.' });
  }
};
