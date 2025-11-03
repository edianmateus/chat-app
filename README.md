# Sistema de Chat em Tempo Real (Criado com auxílio de IA)

Sistema web completo para cadastro de usuários, autenticação e chat em tempo real entre usuários cadastrados. Desenvolvido com Node.js (Express) no backend e React/Next.js no frontend, utilizando MongoDB para persistência de dados e Socket.io para comunicação em tempo real.

## 🚀 Funcionalidades

- ✅ **Cadastro de Usuários**: Criação de contas com nome, username e senha
- ✅ **Autenticação**: Login seguro usando Passport.js (Local e JWT)
- ✅ **Chat em Tempo Real**: Comunicação instantânea entre usuários via Socket.io
- ✅ **Status Online/Offline**: Indicação visual do status dos usuários
- ✅ **Notificações**: Alertas em tempo real para novas mensagens
- ✅ **Persistência**: Todas as mensagens são salvas no MongoDB
- ✅ **Docker**: Suporte completo para containerização
- ✅ **Cluster Mode**: Suporte para múltiplos processos com Node.js Cluster

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- MongoDB (local ou Atlas)
- Redis (opcional, para cluster mode)

## 🛠️ Instalação e Configuração

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd "path do projeto"
```

### 2. Configure o Backend

```bash
cd backend
npm install
```

Crie um arquivo `.env` baseado no `.env.example`:

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your-super-secret-jwt-key-change-in-production
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:3000
```

### 3. Configure o Frontend

```bash
cd ../frontend
npm install
```

Crie um arquivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🚀 Executando a Aplicação

### Modo Desenvolvimento

#### Backend
```bash
cd backend
npm run dev
```

O backend estará rodando em `http://localhost:3001`

#### Frontend
```bash
cd frontend
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

### Modo Produção

#### Backend
```bash
cd backend
npm start
```

#### Frontend
```bash
cd frontend
npm run build
npm start
```

### Modo Cluster (Backend)

Para executar o backend em modo cluster (múltiplos processos):

```bash
cd backend
npm run start:cluster
```

Ou com suporte Redis para Socket.io em cluster:

```bash
npm run start:cluster-redis
```

**Nota**: Para usar o modo cluster com Redis, você precisa ter o Redis rodando e configurado nas variáveis de ambiente.

## 🐳 Executando com Docker

### Usando Docker Compose (Recomendado)

```bash
# Na raiz do projeto
docker-compose up -d
```

Isso irá subir:
- MongoDB na porta 27017
- Redis na porta 6379
- Backend na porta 3001

### Build manual do Backend

```bash
cd backend
docker build -t chat-backend .
docker run -p 3001:3001 --env-file .env chat-backend
```

## 📁 Estrutura do Projeto

```
.
├── backend/
│   ├── config/
│   │   ├── database.js          # Configuração do MongoDB
│   │   └── passport.js           # Configuração do Passport.js
│   ├── middleware/
│   │   └── auth.js               # Middleware de autenticação
│   ├── models/
│   │   ├── User.js               # Modelo de usuário
│   │   └── Message.js            # Modelo de mensagem
│   ├── routes/
│   │   ├── auth.js               # Rotas de autenticação
│   │   ├── users.js              # Rotas de usuários
│   │   └── messages.js           # Rotas de mensagens
│   ├── socket/
│   │   └── socketHandler.js      # Handlers do Socket.io
│   ├── cluster.js                # Configuração de cluster
│   ├── server.js                 # Servidor principal
│   ├── server-cluster.js         # Servidor com Redis adapter
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx          # Página de login
│   │   ├── chat/
│   │   │   └── page.tsx           # Página do chat
│   │   └── page.tsx               # Home (redirecionamento)
│   ├── lib/
│   │   ├── api.ts                # Cliente API
│   │   ├── auth.ts               # Utilitários de autenticação
│   │   └── socket.ts             # Cliente Socket.io
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🔌 API Endpoints

### Autenticação

- `POST /api/auth/register` - Cadastrar novo usuário
  ```json
  {
    "name": "Nome do Usuário",
    "username": "username",
    "password": "senha123"
  }
  ```

- `POST /api/auth/login` - Fazer login
  ```json
  {
    "username": "username",
    "password": "senha123"
  }
  ```

### Usuários

- `GET /api/users` - Listar todos os usuários (requer autenticação)
- `POST /api/users/logout` - Fazer logout (requer autenticação)

### Mensagens

- `GET /api/messages/:userId` - Obter histórico de mensagens com um usuário (requer autenticação)

## 🔐 Autenticação

A aplicação usa JWT (JSON Web Tokens) para autenticação. Após o login ou cadastro, o token é retornado e deve ser incluído nas requisições subsequentes no header:

```
Authorization: Bearer <token>
```

## 📡 Socket.io Events

### Cliente → Servidor

- `message:send` - Enviar mensagem
  ```json
  {
    "to": "userId",
    "content": "Mensagem aqui"
  }
  ```

### Servidor → Cliente

- `message:receive` - Receber nova mensagem
- `message:sent` - Confirmação de envio
- `message:error` - Erro ao enviar mensagem
- `user:online` - Usuário ficou online
- `user:offline` - Usuário ficou offline
- `users:list` - Lista inicial de usuários online
- `notification:new-message` - Notificação de nova mensagem

## 🔧 Variáveis de Ambiente

### Backend (.env)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `NODE_ENV` | Ambiente de execução | `development` |
| `PORT` | Porta do servidor | `3001` |
| `MONGODB_URI` | URI de conexão do MongoDB | `mongodb://localhost:27017/chat-app` |
| `JWT_SECRET` | Chave secreta para JWT | - |
| `REDIS_HOST` | Host do Redis | `localhost` |
| `REDIS_PORT` | Porta do Redis | `6379` |
| `FRONTEND_URL` | URL do frontend | `http://localhost:3000` |

### Frontend (.env.local)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `NEXT_PUBLIC_API_URL` | URL da API backend | `http://localhost:3001` |

## 🧪 Testando a Aplicação

1. Inicie o MongoDB (se local):
   ```bash
   mongod
   ```

2. Inicie o backend:
   ```bash
   cd backend
   npm run dev
   ```

3. Inicie o frontend:
   ```bash
   cd frontend
   npm run dev
   ```

4. Acesse `http://localhost:3000` no navegador

5. Crie uma conta ou faça login

6. Selecione um usuário da lista e comece a conversar!

## 🔄 Cluster Mode

O sistema suporta execução em modo cluster para melhorar a performance e escalabilidade:

- **Sem Redis**: Use `npm run start:cluster` - Funciona com múltiplos processos, mas Socket.io não compartilha estado entre processos
- **Com Redis**: Use `npm run start:cluster-redis` - Socket.io compartilha estado entre processos via Redis adapter

## 📝 Notas Importantes

- As senhas são hasheadas usando bcrypt antes de serem armazenadas
- Os tokens JWT expiram após 7 dias
- O status online/offline é atualizado automaticamente
- As mensagens são persistidas no MongoDB e podem ser consultadas via API

## 🐛 Troubleshooting

### Erro de conexão com MongoDB
- Verifique se o MongoDB está rodando
- Confirme a URI de conexão no arquivo `.env`

### Erro de conexão Socket.io
- Verifique se o backend está rodando na porta correta
- Confirme a variável `NEXT_PUBLIC_API_URL` no frontend

### Problemas com cluster
- Para usar cluster com Redis, certifique-se de que o Redis está rodando
- Verifique as variáveis `REDIS_HOST` e `REDIS_PORT` no `.env`


## 👤 Autor
Edian Mateus Zuhl



