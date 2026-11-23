function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'form-message ' + type;
  el.style.display = 'block';
}

document.getElementById('redefinirForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const msg = document.getElementById('mensagem');
  const btn = document.getElementById('btnRedefinir');
  const email = document.getElementById('email').value.trim();

  if (!email) {
    showMessage(msg, 'Informe o e-mail cadastrado.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

  try {
    const res = await fetch('/api/redefinir-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage(msg, data.message, 'success');
      document.getElementById('redefinirForm').reset();
    } else {
      showMessage(msg, data.error, 'error');
    }
  } catch (err) {
    showMessage(msg, 'Erro de conexão. Tente novamente.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar instruções';
});
