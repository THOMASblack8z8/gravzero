function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'form-message ' + type;
  el.style.display = 'block';
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    input.type = 'password';
    btn.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const msg = document.getElementById('mensagem');
  const btn = document.getElementById('btnEntrar');

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  if (!email || !senha) {
    showMessage(msg, 'Preencha todos os campos.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage(msg, data.message, 'success');
      // Redirecionar para a página adequada
      if (data.user.role === 'admin') {
        setTimeout(() => { window.location.href = '/admin.html'; }, 800);
      } else {
        setTimeout(() => { window.location.href = '/minha-carga.html'; }, 800);
      }
    } else {
      showMessage(msg, data.error, 'error');
    }
  } catch (err) {
    showMessage(msg, 'Erro de conexão. Tente novamente.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-arrow-right"></i> Entrar';
});
