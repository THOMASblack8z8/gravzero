function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'form-message ' + type;
  el.style.display = 'block';
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

let deleteId = null;

// Verificar autenticação e permissão
async function init() {
  try {
    const res = await fetch('/api/usuario');
    if (!res.ok) {
      window.location.href = '/login.html';
      return;
    }

    const data = await res.json();
    const user = data.user;

    document.getElementById('navUser').textContent = user.nome;

    if (user.role !== 'admin') {
      document.getElementById('accessDenied').style.display = 'flex';
      document.getElementById('adminContent').style.display = 'none';
      return;
    }

    document.getElementById('adminContent').style.display = 'block';
    await carregarMochilas();

  } catch (err) {
    window.location.href = '/login.html';
  }
}

async function carregarMochilas() {
  try {
    const res = await fetch('/api/admin/mochilas');
    const data = await res.json();
    const tbody = document.getElementById('mochilasTbody');
    const total = document.getElementById('totalMochilas');

    total.textContent = data.mochilas.length;

    if (data.mochilas.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="5">
            <div class="empty-state">
              <i class="fas fa-inbox"></i>
              <p>Nenhuma mochila cadastrada.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.mochilas.map(m => `
      <tr>
        <td><strong>${escapeHtml(m.numero_serie)}</strong></td>
        <td>${escapeHtml(m.turma)}</td>
        <td>${m.limite_padrao} kg</td>
        <td>${formatDate(m.created_at)}</td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" title="Editar" onclick='editarMochila(${JSON.stringify(m)})'>
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon delete" title="Excluir" onclick="confirmarExclusao(${m.id}, '${escapeHtml(m.numero_serie)}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar mochilas:', err);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

// Formulário de cadastro/edição
document.getElementById('mochilaForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const msg = document.getElementById('mensagem');
  const btn = document.getElementById('btnSalvar');
  const editId = document.getElementById('editId').value;

  const numero_serie = document.getElementById('numero_serie').value.trim();
  const turma = document.getElementById('turma').value.trim();
  const limite_padrao = document.getElementById('limite_padrao').value;

  if (!numero_serie || !turma || !limite_padrao) {
    showMessage(msg, 'Todos os campos são obrigatórios.', 'error');
    return;
  }

  const limite = parseFloat(limite_padrao);
  if (isNaN(limite) || limite <= 0) {
    showMessage(msg, 'O limite padrão deve ser um número positivo.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  try {
    const url = editId ? `/api/admin/mochilas/${editId}` : '/api/admin/mochilas';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero_serie, turma, limite_padrao: limite })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage(msg, data.message, 'success');
      document.getElementById('mochilaForm').reset();
      document.getElementById('editId').value = '';
      document.getElementById('formTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Cadastrar mochila';
      document.getElementById('btnCancelar').style.display = 'none';
      await carregarMochilas();
    } else {
      showMessage(msg, data.error, 'error');
    }
  } catch (err) {
    showMessage(msg, 'Erro de conexão. Tente novamente.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Salvar';
});

function editarMochila(m) {
  document.getElementById('editId').value = m.id;
  document.getElementById('numero_serie').value = m.numero_serie;
  document.getElementById('turma').value = m.turma;
  document.getElementById('limite_padrao').value = m.limite_padrao;
  document.getElementById('formTitle').innerHTML = '<i class="fas fa-edit"></i> Editar mochila';
  document.getElementById('btnCancelar').style.display = 'inline-flex';
  document.getElementById('mensagem').style.display = 'none';

  // Scroll para o formulário
  document.getElementById('mochilaForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelarEdicao() {
  document.getElementById('editId').value = '';
  document.getElementById('mochilaForm').reset();
  document.getElementById('formTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Cadastrar mochila';
  document.getElementById('btnCancelar').style.display = 'none';
  document.getElementById('mensagem').style.display = 'none';
}

// Exclusão com modal
function confirmarExclusao(id, serie) {
  deleteId = id;
  document.getElementById('modalMsg').textContent = `Deseja excluir a mochila ${serie}?`;
  document.getElementById('modalOverlay').style.display = 'flex';
}

function fecharModal() {
  deleteId = null;
  document.getElementById('modalOverlay').style.display = 'none';
}

document.getElementById('btnConfirmarExclusao').addEventListener('click', async () => {
  if (!deleteId) return;

  try {
    const res = await fetch(`/api/admin/mochilas/${deleteId}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      fecharModal();
      await carregarMochilas();
      const msg = document.getElementById('mensagem');
      showMessage(msg, data.message, 'success');
    }
  } catch (err) {
    console.error('Erro ao excluir:', err);
  }
});

// Fechar modal ao clicar fora
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) fecharModal();
});

init();
