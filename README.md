# Escola Conectada

Sistema de agendamento de recursos tecnológicos escolares (Tablets, Chromebooks, Notebooks e Sala de Informática).

**Stack:** React + Vite · Tailwind CSS · Supabase · React Router DOM

---

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

> **Modo Demo:** se as variáveis não forem configuradas, a aplicação roda em modo demo com dados fictícios e login automático como Admin.

### 3. Configurar banco de dados Supabase

Execute o SQL abaixo no **SQL Editor** do painel Supabase:

```sql
-- ─── Tabelas ────────────────────────────────────────────────

create table public.usuarios (
  id      uuid references auth.users on delete cascade primary key,
  nome    text not null,
  email   text not null,
  perfil  text not null default 'aluno'
            check (perfil in ('aluno', 'professor', 'admin')),
  turma   text,
  created_at timestamptz default now()
);

create table public.recursos (
  id               serial primary key,
  nome             text not null,
  descricao        text,
  tipo             text not null
                     check (tipo in ('tablet','chromebook','notebook','sala')),
  quantidade_total integer not null default 1,
  imagem_url       text,
  created_at       timestamptz default now()
);

create table public.agendamentos (
  id              serial primary key,
  usuario_id      uuid references public.usuarios(id) on delete cascade,
  recurso_id      integer references public.recursos(id) on delete cascade,
  data            date not null,
  horario_inicio  time not null,
  horario_fim     time not null,
  quantidade      integer not null default 1,
  finalidade      text not null,
  status          text not null default 'pendente'
                    check (status in ('pendente','confirmado','cancelado')),
  created_at      timestamptz default now()
);

create table public.horarios_bloqueados (
  id          serial primary key,
  recurso_id  integer references public.recursos(id) on delete cascade,
  data        date not null,
  horario     time not null,
  motivo      text
);

-- ─── Índices ────────────────────────────────────────────────

create index on public.agendamentos (data, recurso_id, status);
create index on public.agendamentos (usuario_id);

-- ─── Row Level Security ──────────────────────────────────────

alter table public.usuarios           enable row level security;
alter table public.recursos           enable row level security;
alter table public.agendamentos       enable row level security;
alter table public.horarios_bloqueados enable row level security;

-- usuarios: cada um vê e edita apenas o próprio perfil
create policy "Usuário lê próprio perfil" on public.usuarios
  for select using (auth.uid() = id);

create policy "Usuário atualiza próprio perfil" on public.usuarios
  for update using (auth.uid() = id);

create policy "Usuário insere próprio perfil" on public.usuarios
  for insert with check (auth.uid() = id);

-- Admin/professor lê todos os perfis
create policy "Admin lê todos perfis" on public.usuarios
  for select using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.perfil in ('admin','professor')
    )
  );

-- recursos: leitura pública para autenticados
create policy "Todos leem recursos" on public.recursos
  for select using (auth.role() = 'authenticated');

-- agendamentos: aluno vê os seus; admin/professor vê todos
create policy "Aluno vê próprios agendamentos" on public.agendamentos
  for select using (
    auth.uid() = usuario_id
    or exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.perfil in ('admin','professor')
    )
  );

create policy "Usuário cria agendamento" on public.agendamentos
  for insert with check (auth.uid() = usuario_id);

create policy "Usuário cancela próprio agendamento" on public.agendamentos
  for update using (
    auth.uid() = usuario_id
    or exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.perfil in ('admin','professor')
    )
  );

-- horarios_bloqueados: leitura pública para autenticados
create policy "Leitura de horários bloqueados" on public.horarios_bloqueados
  for select using (auth.role() = 'authenticated');

-- ─── Trigger: criar perfil ao registrar ──────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, perfil, turma)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'perfil', 'aluno'),
    new.raw_user_meta_data->>'turma'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Dados iniciais ──────────────────────────────────────────

insert into public.recursos (nome, descricao, tipo, quantidade_total) values
  ('Tablets',
   'Tablets Samsung Galaxy Tab para uso educacional. Ideais para pesquisa, leitura de materiais e atividades interativas.',
   'tablet', 30),
  ('Chromebooks',
   'Chromebooks leves e rápidos para tarefas escolares, produção de textos e acesso à internet.',
   'chromebook', 25),
  ('Notebooks',
   'Notebooks para projetos avançados, programação e edição de mídia.',
   'notebook', 15),
  ('Sala de Informática',
   'Sala equipada com 40 computadores desktop, projetor e quadro interativo.',
   'sala', 1);
```

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

### 5. Build para produção

```bash
npm run build
```

---

## Deploy no Vercel

1. Faça push do repositório para o GitHub
2. Importe o projeto no [Vercel](https://vercel.com)
3. Adicione as variáveis de ambiente no painel Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático a cada push

---

## Estrutura de pastas

```
src/
├── App.jsx                  # Roteamento principal
├── index.css                # Tailwind + estilos globais
├── main.jsx                 # Entry point
├── components/
│   ├── Header.jsx           # Barra superior com logo e avatar
│   ├── Layout.jsx           # Wrapper: sidebar + header + conteúdo
│   ├── PrivateRoute.jsx     # Guard de autenticação
│   └── Sidebar.jsx          # Menu lateral fixo
├── hooks/
│   ├── useAuth.jsx          # Contexto de autenticação (AuthProvider)
│   └── useAgendamentos.js   # CRUD de agendamentos
├── lib/
│   └── supabase.js          # Cliente Supabase
└── pages/
    ├── Admin.jsx            # Dashboard admin (professor/admin)
    ├── Agendamentos.jsx     # Wizard de agendamento (4 etapas)
    ├── Login.jsx            # Login / Cadastro
    ├── MeusAgendamentos.jsx # Listagem com cancelamento
    └── Recursos.jsx         # Grid de recursos disponíveis
```

## Regras de negócio implementadas

| Regra | Onde |
|---|---|
| Duração máxima de 2 horas | `Agendamentos.jsx` — seleção de slots |
| Sem agendamento no passado | `Agendamentos.jsx` — calendario desabilita datas passadas |
| Quantidade ≤ disponível | `Agendamentos.jsx` — step 3 com verificação em tempo real |
| Cancelamento até 1h antes | `MeusAgendamentos.jsx` — função `canCancel()` |
| Aluno vê só os próprios | Supabase RLS + `useAgendamentos.js` |
| Admin/professor vê todos | Supabase RLS + flag `isAdmin` no contexto |
