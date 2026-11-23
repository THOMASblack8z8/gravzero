// Utilitários compartilhados
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

// Cadastro
document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const msg = document.getElementById('mensagem');
  const btn = document.getElementById('btnCadastrar');

  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  const turma = document.getElementById('turma').value.trim();

  if (!nome || !email || !senha || !turma) {
    showMessage(msg, 'Preencha todos os campos.', 'error');
    return;
  }

  if (senha.length < 6) {
    showMessage(msg, 'A senha deve ter pelo menos 6 caracteres.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';

  try {
    const res = await fetch('/api/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, turma })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage(msg, data.message, 'success');
      document.getElementById('cadastroForm').reset();
      setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    } else {
      showMessage(msg, data.error, 'error');
    }
  } catch (err) {
    showMessage(msg, 'Erro de conexão. Tente novamente.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check-circle"></i> Cadastrar';
});
