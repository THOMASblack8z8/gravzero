# GravZero — Mochila Antigravidade
**Projeto FF-2026-005 · Cliente: Rede Educacional Horizonte**
**Desenvolvimento: Fábrica do Futuro**

---

## 🌟 Sobre o Projeto
O **GravZero** é a plataforma inteligente da Mochila Antigravidade desenvolvida para combater o excesso de peso carregado pelos estudantes e promover a correção postural contínua.

### Hardware & Sensores Integrados
- **Célula de carga HX711**: Mede o peso carregado em tempo real (em kg).
- **Acelerômetro MPU6050**: Monitora a inclinação da postura (em graus).
- **Potenciômetro**: Ajusta o nível de empuxo (de 0 a 100%).
- **Servo motor**: Controla a abertura mecânica dos propulsores de sustentação.
- **Buzzer sonoro**: Alerta imediato de sobrecarga ou postura inadequada.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js instalado (v16+)

### Passo a Passo
1. No terminal, acesse a pasta do projeto:
   ```bash
   cd gravzero
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Abra no navegador:
   ```
   http://localhost:3000
   ```

---

## 👤 Credenciais Padrão

### Administrador
- **E-mail:** `admin@gravzero.com`
- **Senha:** `Admin@123`
- *Acesso total à gestão de mochilas (cadastrar, editar, excluir por número de série e turma).*

### Usuário Estudante de Teste (CT-01 a CT-05)
- **Nome:** Pedro Henrique
- **E-mail:** `pedro.henrique@teste.com`
- **Senha:** `Teste@123`
- **Turma:** `2º ano B`

---

## 🧪 Casos de Teste Automatizados
Para executar a suíte de testes de validação com 100% dos critérios dos Casos de Teste:
```bash
node test_cts.js
```
Validações automáticas:
- **CT-01:** Cadastro com Turma e hash criptográfico de senha (bcrypt).
- **CT-02:** Login com recusa de credenciais erradas e bloqueio de menu admin para alunos.
- **CT-03:** Redefinição com verificação de existência do e-mail.
- **CT-04:** Painel administrativo com CRUD de mochilas e bloqueio estrito (HTTP 403) para alunos.
- **CT-05:** Minha Carga com gravação do limite de peso (kg) e modo de empuxo (Leve, Normal, Intenso, Máximo).
