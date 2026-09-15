const knop = document.getElementById('test-knop');
const resultaat = document.getElementById('test-resultaat');

if (knop) {
  knop.addEventListener('click', () => {
    resultaat.textContent = 'Het werkt! De pagina reageert op JavaScript.';
  });
}

const formulier = document.getElementById('contact-formulier');
const formulierResultaat = document.getElementById('formulier-resultaat');

if (formulier) {
  formulier.addEventListener('submit', (event) => {
    event.preventDefault();
    formulierResultaat.textContent = 'Bedankt! Dit is een testformulier, er wordt nog niets echt verstuurd.';
    formulier.reset();
  });
}
