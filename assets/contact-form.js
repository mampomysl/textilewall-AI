// Obsługa formularzy <form data-contact-form> – wysyła dane do /api/contact
(function () {
  function init(form) {
    var status = form.querySelector('[data-cf-status]');
    var btn = form.querySelector('button[type="submit"]');
    var opened = Date.now();
    function say(msg, state) { status.textContent = msg; status.dataset.state = state || ''; }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var d = {
        name: String(f.get('name') || '').trim(),
        email: String(f.get('email') || '').trim(),
        phone: String(f.get('phone') || '').trim(),
        message: String(f.get('message') || '').trim(),
        consent: !!f.get('consent'),
        website: String(f.get('website') || ''),          // pułapka na boty
        elapsed: Date.now() - opened,
        source: form.dataset.source || 'stopka'
      };
      if (d.name.length < 2) return say('Podaj imię i nazwisko.', 'error');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return say('Podaj poprawny adres e-mail.', 'error');
      if (d.message.length < 10) return say('Napisz kilka słów więcej (min. 10 znaków).', 'error');
      if (!d.consent) return say('Zaznacz, że zapoznałeś się z Polityką prywatności.', 'error');

      btn.disabled = true; say('Wysyłam…');
      try {
        var res = await fetch('/api/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d)
        });
        var j = {};
        try { j = await res.json(); } catch (_) {}
        if (!res.ok) throw new Error(j.error || '');
        form.reset(); opened = Date.now();
        say('Dziękujemy! Wiadomość wysłana – odpowiemy na podany adres e-mail.', 'ok');
      } catch (err) {
        say(err.message || 'Nie udało się wysłać wiadomości. Spróbuj ponownie lub napisz na kontakt@textilewall.pl.', 'error');
      } finally { btn.disabled = false; }
    });
  }
  document.querySelectorAll('form[data-contact-form]').forEach(init);
})();
