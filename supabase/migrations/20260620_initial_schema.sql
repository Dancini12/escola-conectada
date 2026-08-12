-- ─── Tabelas ────────────────────────────────────────────────

create table public.usuarios (
  id      uuid references auth.users on delete cascade primary key,
  nome    text not null,
  email   text not null
            check (email ilike '%@escola.pr.gov.br'),
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
  email           text,
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
   'chromebook', 35),
  ('Notebooks',
   'Notebooks para projetos avançados, programação e edição de mídia.',
   'notebook', 15),
  ('Sala de Informática',
   'Sala equipada com 40 computadores desktop, projetor e quadro interativo.',
   'sala', 1);
