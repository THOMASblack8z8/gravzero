const http = require('http');

const BASE_URL = 'http://127.0.0.1:3000';

function request(method, path, body = null, cookie = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { 'Cookie': cookie } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        const setCookie = res.headers['set-cookie'];
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          cookie: setCookie ? setCookie[0].split(';')[0] : cookie
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Iniciando Validação dos Casos de Teste (CT-01 a CT-05)...\n');

  // ----------------------------------------------------
  // CT-01: Cadastro de usuário com dados válidos
  // ----------------------------------------------------
  console.log('--- Testando CT-01: Cadastro de Usuário ---');
  const ct1Payload = {
    nome: 'Pedro Henrique',
    email: 'pedro.henrique@teste.com',
    senha: 'Teste@123',
    turma: '2º ano B'
  };

  const ct1Res = await request('POST', '/api/cadastro', ct1Payload);
  console.log('Cadastro status:', ct1Res.status, ct1Res.data);
  if (ct1Res.status !== 201) throw new Error('Falha no CT-01 (Cadastro)');

  // Tentativa de duplicata (deve falhar com 409)
  const ct1Dup = await request('POST', '/api/cadastro', ct1Payload);
  console.log('Cadastro duplicado status:', ct1Dup.status, ct1Dup.data);
  if (ct1Dup.status !== 409) throw new Error('Falha no CT-01 (Duplicata não rejeitada)');
  console.log('✅ CT-01 Aprovado!\n');

  // ----------------------------------------------------
  // CT-02: Login com senha errada e senha correta
  // ----------------------------------------------------
  console.log('--- Testando CT-02: Login ---');
  const ct2Errado = await request('POST', '/api/login', {
    email: 'pedro.henrique@teste.com',
    senha: 'Errada@999'
  });
  console.log('Login com senha errada status:', ct2Errado.status, ct2Errado.data);
  if (ct2Errado.status !== 401) throw new Error('Falha no CT-02 (Senha errada aceita)');

  const ct2Correto = await request('POST', '/api/login', {
    email: 'pedro.henrique@teste.com',
    senha: 'Teste@123'
  });
  console.log('Login com senha correta status:', ct2Correto.status, ct2Correto.data);
  if (ct2Correto.status !== 200 || ct2Correto.data.user.role === 'admin') {
    throw new Error('Falha no CT-02 (Login correto ou perfil incorreto)');
  }
  const userCookie = ct2Correto.cookie;
  console.log('✅ CT-02 Aprovado!\n');

  // ----------------------------------------------------
  // CT-03: Redefinição de senha
  // ----------------------------------------------------
  console.log('--- Testando CT-03: Redefinição de senha ---');
  const ct3Invalido = await request('POST', '/api/redefinir-senha', {
    email: 'naoexiste@teste.com'
  });
  console.log('E-mail não existente status:', ct3Invalido.status, ct3Invalido.data);
  if (ct3Invalido.status !== 404) throw new Error('Falha no CT-03 (E-mail inexistente não tratado)');

  const ct3Valido = await request('POST', '/api/redefinir-senha', {
    email: 'pedro.henrique@teste.com'
  });
  console.log('E-mail válido status:', ct3Valido.status, ct3Valido.data);
  if (ct3Valido.status !== 200) throw new Error('Falha no CT-03 (Redefinição falhou)');
  console.log('✅ CT-03 Aprovado!\n');

  // ----------------------------------------------------
  // CT-04: Administrador: gerenciar mochila e bloquear usuário comum
  // ----------------------------------------------------
  console.log('--- Testando CT-04: Administrador e Bloqueio ---');
  // Usuário comum tentando acessar rotas de admin
  const blockAdmin = await request('GET', '/api/admin/mochilas', null, userCookie);
  console.log('Usuário comum acessando /api/admin/mochilas status:', blockAdmin.status);
  if (blockAdmin.status !== 403) throw new Error('Falha no CT-04 (Usuário comum não foi bloqueado)');

  // Login como Admin
  const adminLogin = await request('POST', '/api/login', {
    email: 'admin@gravzero.com',
    senha: 'Admin@123'
  });
  const adminCookie = adminLogin.cookie;

  // Cadastrar mochila: Série: MA-0031, Turma: 2º ano B, Limite: 7 kg
  const mochilaAdd = await request('POST', '/api/admin/mochilas', {
    numero_serie: 'MA-0031',
    turma: '2º ano B',
    limite_padrao: 7
  }, adminCookie);
  console.log('Admin cadastrou mochila status:', mochilaAdd.status, mochilaAdd.data);
  const mochilaId = mochilaAdd.data.mochilaId;

  // Editar mochila para 6 kg
  const mochilaEdit = await request('PUT', `/api/admin/mochilas/${mochilaId}`, {
    numero_serie: 'MA-0031',
    turma: '2º ano B',
    limite_padrao: 6
  }, adminCookie);
  console.log('Admin editou limite para 6kg status:', mochilaEdit.status, mochilaEdit.data);

  // Verificar na lista vinculável ao estudante (Pedro Henrique da turma 2º ano B)
  const disponiveis = await request('GET', '/api/mochilas-disponiveis', null, userCookie);
  console.log('Mochilas disponíveis para Pedro Henrique:', disponiveis.data);
  const encontrada = disponiveis.data.mochilas.find(m => m.numero_serie === 'MA-0031');
  if (!encontrada || encontrada.limite_padrao !== 6) {
    throw new Error('Falha no CT-04 (Mochila não encontrada ou limite incorreto)');
  }

  // Excluir mochila
  const mochilaDel = await request('DELETE', `/api/admin/mochilas/${mochilaId}`, null, adminCookie);
  console.log('Admin excluiu mochila status:', mochilaDel.status);

  // Conferir exclusão
  const disponiveisPos = await request('GET', '/api/mochilas-disponiveis', null, userCookie);
  if (disponiveisPos.data.mochilas.some(m => m.numero_serie === 'MA-0031')) {
    throw new Error('Falha no CT-04 (Mochila excluída ainda aparece)');
  }
  console.log('✅ CT-04 Aprovado!\n');

  // Recadastrar mochila para uso no CT-05
  const mochilaReadd = await request('POST', '/api/admin/mochilas', {
    numero_serie: 'MA-0031',
    turma: '2º ano B',
    limite_padrao: 6
  }, adminCookie);
  const novaMochilaId = mochilaReadd.data.mochilaId;

  // ----------------------------------------------------
  // CT-05: Minha Carga: ação principal do produto
  // ----------------------------------------------------
  console.log('--- Testando CT-05: Minha Carga ---');
  // Rejeitar valores inválidos (vazio, zero, negativo)
  const ct5Invalido = await request('POST', '/api/minha-carga', {
    mochila_id: novaMochilaId,
    limite_peso: 0,
    modo_empuxo: 'Normal'
  }, userCookie);
  console.log('Limite peso zero rejeitado status:', ct5Invalido.status);
  if (ct5Invalido.status !== 400) throw new Error('Falha no CT-05 (Zero não foi rejeitado)');

  // Salvar configuração válida: Limite 6kg, Modo Normal
  const ct5Valido = await request('POST', '/api/minha-carga', {
    mochila_id: novaMochilaId,
    limite_peso: 6,
    modo_empuxo: 'Normal'
  }, userCookie);
  console.log('Configuração válida salva status:', ct5Valido.status, ct5Valido.data);
  if (ct5Valido.status !== 200) throw new Error('Falha no CT-05 (Configuração válida falhou)');

  // Obter Minha Carga
  const minhaCarga = await request('GET', '/api/minha-carga', null, userCookie);
  console.log('Configuração consultada:', minhaCarga.data);
  const cfg = minhaCarga.data.configuracao;
  if (!cfg || cfg.limite_peso !== 6 || cfg.modo_empuxo !== 'Normal') {
    throw new Error('Falha no CT-05 (Configuração retornada divergente)');
  }
  console.log('✅ CT-05 Aprovado!\n');

  console.log('🎉 TODOS OS 5 CASOS DE TESTE PASSARAM COM SUCESSO 100%!');
}

runTests().catch(err => {
  console.error('❌ ERRO:', err);
  process.exit(1);
});
