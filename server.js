const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar banco de dados
const db = initDatabase();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Middleware: verificar autenticação
function authRequired(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Sessão não iniciada.' });
  }
  next();
}

// Middleware: verificar se é admin
function adminRequired(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Sessão não iniciada.' });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  }
  next();
}

// ═══════════════════════════════════════════
//  ROTAS DE AUTENTICAÇÃO
// ═══════════════════════════════════════════

// POST /api/cadastro
app.post('/api/cadastro', (req, res) => {
  const { nome, email, senha, turma } = req.body;

  if (!nome || !email || !senha || !turma) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  // Verificar se o e-mail já existe
  const existing = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);

  try {
    const result = db.prepare(
      'INSERT INTO usuarios (nome, email, senha_hash, turma, role) VALUES (?, ?, ?, ?, ?)'
    ).run(nome.trim(), email.toLowerCase().trim(), senhaHash, turma.trim(), 'usuario');

    res.status(201).json({
      success: true,
      message: 'Cadastro realizado com sucesso!',
      userId: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar. Tente novamente.' });
  }
});

// POST /api/login
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email.toLowerCase().trim());

  if (!user || !bcrypt.compareSync(senha, user.senha_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  req.session.userId = user.id;
  req.session.nome = user.nome;
  req.session.email = user.email;
  req.session.role = user.role;
  req.session.turma = user.turma;

  res.json({
    success: true,
    message: `Bem-vindo(a), ${user.nome}!`,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      turma: user.turma,
      role: user.role
    }
  });
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Sessão encerrada.' });
});

// GET /api/usuario
app.get('/api/usuario', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, nome, email, turma, role FROM usuarios WHERE id = ?')
    .get(req.session.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json({ user });
});

// POST /api/redefinir-senha
app.post('/api/redefinir-senha', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Informe o e-mail.' });
  }

  const user = db.prepare('SELECT id, email FROM usuarios WHERE email = ?')
    .get(email.toLowerCase().trim());

  if (!user) {
    return res.status(404).json({ error: 'E-mail não encontrado no sistema.' });
  }

  const token = crypto.randomBytes(32).toString('hex');

  db.prepare(
    'INSERT INTO redefinicao_senha (user_id, email, token) VALUES (?, ?, ?)'
  ).run(user.id, user.email, token);

  res.json({
    success: true,
    message: 'Instruções de redefinição enviadas para o e-mail cadastrado.'
  });
});

// ═══════════════════════════════════════════
//  ROTAS DO ADMINISTRADOR — MOCHILAS
// ═══════════════════════════════════════════

// GET /api/admin/mochilas
app.get('/api/admin/mochilas', adminRequired, (req, res) => {
  const mochilas = db.prepare('SELECT * FROM mochilas ORDER BY created_at DESC').all();
  res.json({ mochilas });
});

// POST /api/admin/mochilas
app.post('/api/admin/mochilas', adminRequired, (req, res) => {
  const { numero_serie, turma, limite_padrao } = req.body;

  if (!numero_serie || !turma || !limite_padrao) {
    return res.status(400).json({ error: 'Número de série, turma e limite padrão são obrigatórios.' });
  }

  const limite = parseFloat(limite_padrao);
  if (isNaN(limite) || limite <= 0) {
    return res.status(400).json({ error: 'O limite padrão deve ser um número positivo.' });
  }

  const existing = db.prepare('SELECT id FROM mochilas WHERE numero_serie = ?').get(numero_serie.trim());
  if (existing) {
    return res.status(409).json({ error: 'Este número de série já está cadastrado.' });
  }

  try {
    const result = db.prepare(
      'INSERT INTO mochilas (numero_serie, turma, limite_padrao) VALUES (?, ?, ?)'
    ).run(numero_serie.trim(), turma.trim(), limite);

    res.status(201).json({
      success: true,
      message: 'Mochila cadastrada com sucesso!',
      mochilaId: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar mochila.' });
  }
});

// PUT /api/admin/mochilas/:id
app.put('/api/admin/mochilas/:id', adminRequired, (req, res) => {
  const { id } = req.params;
  const { numero_serie, turma, limite_padrao } = req.body;

  if (!numero_serie || !turma || !limite_padrao) {
    return res.status(400).json({ error: 'Número de série, turma e limite padrão são obrigatórios.' });
  }

  const limite = parseFloat(limite_padrao);
  if (isNaN(limite) || limite <= 0) {
    return res.status(400).json({ error: 'O limite padrão deve ser um número positivo.' });
  }

  const mochila = db.prepare('SELECT id FROM mochilas WHERE id = ?').get(id);
  if (!mochila) {
    return res.status(404).json({ error: 'Mochila não encontrada.' });
  }

  // Verificar duplicata de série (exceto a própria)
  const dup = db.prepare('SELECT id FROM mochilas WHERE numero_serie = ? AND id != ?')
    .get(numero_serie.trim(), id);
  if (dup) {
    return res.status(409).json({ error: 'Já existe outra mochila com este número de série.' });
  }

  db.prepare(
    'UPDATE mochilas SET numero_serie = ?, turma = ?, limite_padrao = ? WHERE id = ?'
  ).run(numero_serie.trim(), turma.trim(), limite, id);

  res.json({ success: true, message: 'Mochila atualizada com sucesso!' });
});

// DELETE /api/admin/mochilas/:id
app.delete('/api/admin/mochilas/:id', adminRequired, (req, res) => {
  const { id } = req.params;

  const mochila = db.prepare('SELECT id FROM mochilas WHERE id = ?').get(id);
  if (!mochila) {
    return res.status(404).json({ error: 'Mochila não encontrada.' });
  }

  db.prepare('DELETE FROM mochilas WHERE id = ?').run(id);
  res.json({ success: true, message: 'Mochila excluída com sucesso!' });
});

// ═══════════════════════════════════════════
//  ROTAS DE MINHA CARGA
// ═══════════════════════════════════════════

// GET /api/mochilas-disponiveis
app.get('/api/mochilas-disponiveis', authRequired, (req, res) => {
  const turma = req.session.turma;
  const mochilas = db.prepare('SELECT id, numero_serie, turma, limite_padrao FROM mochilas WHERE turma = ?')
    .all(turma);
  res.json({ mochilas });
});

// GET /api/minha-carga
app.get('/api/minha-carga', authRequired, (req, res) => {
  const config = db.prepare(`
    SELECT c.*, m.numero_serie, m.turma as mochila_turma, m.limite_padrao
    FROM configuracoes c
    LEFT JOIN mochilas m ON c.mochila_id = m.id
    WHERE c.user_id = ?
    ORDER BY c.updated_at DESC
    LIMIT 1
  `).get(req.session.userId);

  res.json({ configuracao: config || null });
});

// POST /api/minha-carga
app.post('/api/minha-carga', authRequired, (req, res) => {
  const { mochila_id, limite_peso, modo_empuxo } = req.body;

  if (!limite_peso || !modo_empuxo) {
    return res.status(400).json({ error: 'Limite de peso e modo de empuxo são obrigatórios.' });
  }

  const limite = parseFloat(limite_peso);
  if (isNaN(limite) || limite <= 0) {
    return res.status(400).json({ error: 'O limite de peso deve ser um número positivo.' });
  }

  const modosValidos = ['Leve', 'Normal', 'Intenso', 'Máximo'];
  if (!modosValidos.includes(modo_empuxo)) {
    return res.status(400).json({ error: 'Modo de empuxo inválido.' });
  }

  // Verificar se já existe configuração
  const existing = db.prepare('SELECT id FROM configuracoes WHERE user_id = ?')
    .get(req.session.userId);

  if (existing) {
    db.prepare(`
      UPDATE configuracoes 
      SET mochila_id = ?, limite_peso = ?, modo_empuxo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(mochila_id || null, limite, modo_empuxo, req.session.userId);
  } else {
    db.prepare(`
      INSERT INTO configuracoes (user_id, mochila_id, limite_peso, modo_empuxo)
      VALUES (?, ?, ?, ?)
    `).run(req.session.userId, mochila_id || null, limite, modo_empuxo);
  }

  res.json({ success: true, message: 'Configuração salva com sucesso!' });
});

// ═══════════════════════════════════════════
//  ROTA: DADOS DO BANCO (para verificação CT)
// ═══════════════════════════════════════════

app.get('/api/admin/usuarios', adminRequired, (req, res) => {
  const usuarios = db.prepare(
    'SELECT id, nome, email, turma, role, created_at FROM usuarios ORDER BY created_at DESC'
  ).all();
  res.json({ usuarios });
});

app.get('/api/admin/configuracoes', adminRequired, (req, res) => {
  const configs = db.prepare(`
    SELECT c.*, u.nome, u.email, u.turma, m.numero_serie
    FROM configuracoes c
    JOIN usuarios u ON c.user_id = u.id
    LEFT JOIN mochilas m ON c.mochila_id = m.id
    ORDER BY c.updated_at DESC
  `).all();
  res.json({ configuracoes: configs });
});

app.get('/api/admin/redefinicoes', adminRequired, (req, res) => {
  const reqs = db.prepare(`
    SELECT r.*, u.nome 
    FROM redefinicao_senha r
    JOIN usuarios u ON r.user_id = u.id
    ORDER BY r.created_at DESC
  `).all();
  res.json({ redefinicoes: reqs });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║          🎒 GravZero Platform           ║
  ║      Mochila Antigravidade · v1.0       ║
  ╠══════════════════════════════════════════╣
  ║  Servidor rodando em:                   ║
  ║  http://localhost:${PORT}                   ║
  ╠══════════════════════════════════════════╣
  ║  Admin: admin@gravzero.com / Admin@123  ║
  ╚══════════════════════════════════════════╝
  `);
});
