const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'gravzero.json');

class DatabaseStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      usuarios: [],
      mochilas: [],
      configuracoes: [],
      redefinicao_senha: [],
      _counters: {
        usuarios: 0,
        mochilas: 0,
        configuracoes: 0,
        redefinicao_senha: 0
      }
    };
    this.load();
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data._counters) {
          this.data._counters = {
            usuarios: this.data.usuarios.reduce((max, u) => Math.max(max, u.id || 0), 0),
            mochilas: this.data.mochilas.reduce((max, m) => Math.max(max, m.id || 0), 0),
            configuracoes: this.data.configuracoes.reduce((max, c) => Math.max(max, c.id || 0), 0),
            redefinicao_senha: this.data.redefinicao_senha.reduce((max, r) => Math.max(max, r.id || 0), 0)
          };
        }
      } catch (err) {
        console.error('Erro ao ler DB:', err);
      }
    } else {
      this.save();
    }
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  pragma() {}
  exec() {}

  prepare(sql) {
    const cleanSql = sql.replace(/\s+/g, ' ').trim();
    const self = this;

    return {
      get(...params) {
        // SELECT id FROM usuarios WHERE role = ?
        if (cleanSql.includes('FROM usuarios WHERE role = ?')) {
          const role = params[0];
          const user = self.data.usuarios.find(u => u.role === role);
          return user ? { id: user.id } : undefined;
        }

        // SELECT id FROM usuarios WHERE email = ?
        if (cleanSql.includes('FROM usuarios WHERE email = ?') && cleanSql.startsWith('SELECT id FROM')) {
          const email = (params[0] || '').toLowerCase().trim();
          const user = self.data.usuarios.find(u => u.email.toLowerCase() === email);
          return user ? { id: user.id } : undefined;
        }

        // SELECT id, email FROM usuarios WHERE email = ?
        if (cleanSql.includes('SELECT id, email FROM usuarios WHERE email = ?')) {
          const email = (params[0] || '').toLowerCase().trim();
          const user = self.data.usuarios.find(u => u.email.toLowerCase() === email);
          return user ? { id: user.id, email: user.email } : undefined;
        }

        // SELECT * FROM usuarios WHERE email = ?
        if (cleanSql.includes('FROM usuarios WHERE email = ?') && cleanSql.startsWith('SELECT * FROM')) {
          const email = (params[0] || '').toLowerCase().trim();
          return self.data.usuarios.find(u => u.email.toLowerCase() === email);
        }

        // SELECT id, nome, email, turma, role FROM usuarios WHERE id = ?
        if (cleanSql.includes('FROM usuarios WHERE id = ?')) {
          const id = Number(params[0]);
          const u = self.data.usuarios.find(user => user.id === id);
          return u ? { id: u.id, nome: u.nome, email: u.email, turma: u.turma, role: u.role } : undefined;
        }

        // SELECT id FROM mochilas WHERE numero_serie = ? AND id != ?
        if (cleanSql.includes('WHERE numero_serie = ? AND id != ?')) {
          const serie = (params[0] || '').trim();
          const id = Number(params[1]);
          const m = self.data.mochilas.find(item => item.numero_serie === serie && item.id !== id);
          return m ? { id: m.id } : undefined;
        }

        // SELECT id FROM mochilas WHERE numero_serie = ?
        if (cleanSql.includes('FROM mochilas WHERE numero_serie = ?')) {
          const serie = (params[0] || '').trim();
          const m = self.data.mochilas.find(item => item.numero_serie === serie);
          return m ? { id: m.id } : undefined;
        }

        // SELECT id FROM mochilas WHERE id = ? OR SELECT * FROM mochilas WHERE id = ?
        if (cleanSql.includes('FROM mochilas WHERE id = ?')) {
          const id = Number(params[0]);
          const m = self.data.mochilas.find(item => item.id === id);
          return m ? { ...m } : undefined;
        }

        // SELECT id FROM configuracoes WHERE user_id = ?
        if (cleanSql.includes('FROM configuracoes WHERE user_id = ?') && cleanSql.startsWith('SELECT id FROM')) {
          const userId = Number(params[0]);
          const c = self.data.configuracoes.find(cfg => cfg.user_id === userId);
          return c ? { id: c.id } : undefined;
        }

        // SELECT c.*, m.numero_serie... FROM configuracoes c LEFT JOIN mochilas m... WHERE c.user_id = ?
        if (cleanSql.includes('FROM configuracoes') && cleanSql.includes('WHERE c.user_id = ?')) {
          const userId = Number(params[0]);
          const cfgs = self.data.configuracoes
            .filter(c => c.user_id === userId)
            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
          if (cfgs.length === 0) return undefined;
          const c = cfgs[0];
          const m = self.data.mochilas.find(item => item.id === c.mochila_id) || {};
          return {
            ...c,
            numero_serie: m.numero_serie || null,
            mochila_turma: m.turma || null,
            limite_padrao: m.limite_padrao || null
          };
        }

        return undefined;
      },

      all(...params) {
        // SELECT * FROM mochilas ORDER BY created_at DESC
        if (cleanSql.includes('FROM mochilas') && cleanSql.includes('ORDER BY created_at DESC')) {
          return [...self.data.mochilas].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        // SELECT id, numero_serie, turma, limite_padrao FROM mochilas WHERE turma = ?
        if (cleanSql.includes('FROM mochilas WHERE turma = ?')) {
          const turma = (params[0] || '').trim();
          return self.data.mochilas
            .filter(m => m.turma.toLowerCase() === turma.toLowerCase())
            .map(m => ({ id: m.id, numero_serie: m.numero_serie, turma: m.turma, limite_padrao: m.limite_padrao }));
        }

        // SELECT id, nome, email, turma, role, created_at FROM usuarios ORDER BY created_at DESC
        if (cleanSql.includes('FROM usuarios') && cleanSql.includes('ORDER BY created_at DESC')) {
          return [...self.data.usuarios]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(u => ({ id: u.id, nome: u.nome, email: u.email, turma: u.turma, role: u.role, created_at: u.created_at }));
        }

        // SELECT c.*, u.nome, u.email, u.turma, m.numero_serie FROM configuracoes c JOIN usuarios u...
        if (cleanSql.includes('FROM configuracoes c JOIN usuarios u')) {
          return self.data.configuracoes
            .map(c => {
              const u = self.data.usuarios.find(user => user.id === c.user_id) || {};
              const m = self.data.mochilas.find(item => item.id === c.mochila_id) || {};
              return {
                ...c,
                nome: u.nome || '',
                email: u.email || '',
                turma: u.turma || '',
                numero_serie: m.numero_serie || null
              };
            })
            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
        }

        // SELECT r.*, u.nome FROM redefinicao_senha r JOIN usuarios u...
        if (cleanSql.includes('FROM redefinicao_senha r JOIN usuarios u')) {
          return self.data.redefinicao_senha
            .map(r => {
              const u = self.data.usuarios.find(user => user.id === r.user_id) || {};
              return {
                ...r,
                nome: u.nome || ''
              };
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        return [];
      },

      run(...params) {
        const now = new Date().toISOString();

        // INSERT INTO usuarios
        if (cleanSql.startsWith('INSERT INTO usuarios')) {
          const [nome, email, senha_hash, turma, role] = params;
          self.data._counters.usuarios += 1;
          const id = self.data._counters.usuarios;
          const novo = { id, nome, email, senha_hash, turma, role: role || 'usuario', created_at: now };
          self.data.usuarios.push(novo);
          self.save();
          return { lastInsertRowid: id, changes: 1 };
        }

        // INSERT INTO mochilas
        if (cleanSql.startsWith('INSERT INTO mochilas')) {
          const [numero_serie, turma, limite_padrao] = params;
          self.data._counters.mochilas += 1;
          const id = self.data._counters.mochilas;
          const nova = { id, numero_serie, turma, limite_padrao: Number(limite_padrao), created_at: now };
          self.data.mochilas.push(nova);
          self.save();
          return { lastInsertRowid: id, changes: 1 };
        }

        // UPDATE mochilas SET numero_serie = ?, turma = ?, limite_padrao = ? WHERE id = ?
        if (cleanSql.startsWith('UPDATE mochilas')) {
          const [numero_serie, turma, limite_padrao, id] = params;
          const m = self.data.mochilas.find(item => item.id === Number(id));
          if (m) {
            m.numero_serie = numero_serie;
            m.turma = turma;
            m.limite_padrao = Number(limite_padrao);
            self.save();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // DELETE FROM mochilas WHERE id = ?
        if (cleanSql.startsWith('DELETE FROM mochilas')) {
          const id = Number(params[0]);
          const idx = self.data.mochilas.findIndex(item => item.id === id);
          if (idx !== -1) {
            self.data.mochilas.splice(idx, 1);
            // Dissociar mochilas excluídas
            self.data.configuracoes.forEach(cfg => {
              if (cfg.mochila_id === id) cfg.mochila_id = null;
            });
            self.save();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // INSERT INTO configuracoes
        if (cleanSql.startsWith('INSERT INTO configuracoes')) {
          const [user_id, mochila_id, limite_peso, modo_empuxo] = params;
          self.data._counters.configuracoes += 1;
          const id = self.data._counters.configuracoes;
          const nova = {
            id,
            user_id: Number(user_id),
            mochila_id: mochila_id ? Number(mochila_id) : null,
            limite_peso: Number(limite_peso),
            modo_empuxo,
            created_at: now,
            updated_at: now
          };
          self.data.configuracoes.push(nova);
          self.save();
          return { lastInsertRowid: id, changes: 1 };
        }

        // UPDATE configuracoes SET mochila_id = ?, limite_peso = ?, modo_empuxo = ?, updated_at = ... WHERE user_id = ?
        if (cleanSql.startsWith('UPDATE configuracoes')) {
          const [mochila_id, limite_peso, modo_empuxo, user_id] = params;
          const c = self.data.configuracoes.find(cfg => cfg.user_id === Number(user_id));
          if (c) {
            c.mochila_id = mochila_id ? Number(mochila_id) : null;
            c.limite_peso = Number(limite_peso);
            c.modo_empuxo = modo_empuxo;
            c.updated_at = now;
            self.save();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // INSERT INTO redefinicao_senha
        if (cleanSql.startsWith('INSERT INTO redefinicao_senha')) {
          const [user_id, email, token] = params;
          self.data._counters.redefinicao_senha += 1;
          const id = self.data._counters.redefinicao_senha;
          const item = { id, user_id: Number(user_id), email, token, usado: 0, created_at: now };
          self.data.redefinicao_senha.push(item);
          self.save();
          return { lastInsertRowid: id, changes: 1 };
        }

        return { changes: 0 };
      }
    };
  }
}

function initDatabase() {
  const db = new DatabaseStore(DB_FILE);

  // Criar administrador padrão se não existir
  const adminExists = db.prepare('SELECT id FROM usuarios WHERE role = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('Admin@123', 10);
    db.prepare(
      'INSERT INTO usuarios (nome, email, senha_hash, turma, role) VALUES (?, ?, ?, ?, ?)'
    ).run('Administrador', 'admin@gravzero.com', hash, 'Gestão', 'admin');
    console.log('✓ Administrador padrão criado: admin@gravzero.com / Admin@123');
  }

  return db;
}

module.exports = { initDatabase };
