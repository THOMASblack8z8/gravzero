function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'form-message ' + type;
  el.style.display = 'block';
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

// Verificar autenticação e carregar dados
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

    // Mostrar link de admin se for admin
    if (user.role === 'admin') {
      document.getElementById('adminLink').style.display = 'inline-flex';
    }

    // Carregar mochilas disponíveis para a turma
    await carregarMochilas();

    // Carregar configuração atual
    await carregarConfig();

  } catch (err) {
    window.location.href = '/login.html';
  }
}

async function carregarMochilas() {
  try {
    const res = await fetch('/api/mochilas-disponiveis');
    const data = await res.json();
    const select = document.getElementById('mochila_id');

    data.mochilas.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.numero_serie} — ${m.turma} (limite: ${m.limite_padrao} kg)`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar mochilas:', err);
  }
}

async function carregarConfig() {
  try {
    const res = await fetch('/api/minha-carga');
    const data = await res.json();

    if (data.configuracao) {
      const c = data.configuracao;
      document.getElementById('configAtual').style.display = 'block';
      document.getElementById('displayLimite').textContent = c.limite_peso + ' kg';
      document.getElementById('displayModo').textContent = c.modo_empuxo;
      document.getElementById('displayMochila').textContent = c.numero_serie || 'Nenhuma vinculada';

      // Preencher o formulário com os dados atuais
      document.getElementById('limite_peso').value = c.limite_peso;
      document.getElementById('modo_empuxo').value = c.modo_empuxo;
      if (c.mochila_id) {
        document.getElementById('mochila_id').value = c.mochila_id;
      }

      // Atualizar barra visual
      atualizarEmpuxoVisual(c.modo_empuxo);
    }
  } catch (err) {
    console.error('Erro ao carregar configuração:', err);
  }
}

// Barra visual de empuxo
const modoMap = {
  'Leve': { pct: 25, label: 'Leve — 25% de compensação' },
  'Normal': { pct: 50, label: 'Normal — 50% de compensação' },
  'Intenso': { pct: 75, label: 'Intenso — 75% de compensação' },
  'Máximo': { pct: 100, label: 'Máximo — 100% de compensação' }
};

function atualizarEmpuxoVisual(modo) {
  const visual = document.getElementById('empuxoVisual');
  const bar = document.getElementById('empuxoBar');
  const label = document.getElementById('empuxoLabel');
  const pctEl = document.getElementById('empuxoPct');

  if (modoMap[modo]) {
    visual.style.display = 'block';
    bar.style.width = modoMap[modo].pct + '%';
    label.textContent = modoMap[modo].label;
    pctEl.textContent = modoMap[modo].pct + '%';
  } else {
    visual.style.display = 'none';
  }
}

document.getElementById('modo_empuxo').addEventListener('change', (e) => {
  atualizarEmpuxoVisual(e.target.value);
});

// Formulário
document.getElementById('cargaForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const msg = document.getElementById('mensagem');
  const btn = document.getElementById('btnSalvar');

  const mochila_id = document.getElementById('mochila_id').value || null;
  const limite_peso = document.getElementById('limite_peso').value;
  const modo_empuxo = document.getElementById('modo_empuxo').value;

  if (!limite_peso || !modo_empuxo) {
    showMessage(msg, 'Informe o limite de peso e o modo de empuxo.', 'error');
    return;
  }

  const limite = parseFloat(limite_peso);
  if (isNaN(limite) || limite <= 0) {
    showMessage(msg, 'O limite de peso deve ser um número positivo.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  try {
    const res = await fetch('/api/minha-carga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mochila_id, limite_peso: limite, modo_empuxo })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage(msg, data.message, 'success');
      await carregarConfig();
    } else {
      showMessage(msg, data.error, 'error');
    }
  } catch (err) {
    showMessage(msg, 'Erro de conexão. Tente novamente.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Salvar configuração';
});

init();
