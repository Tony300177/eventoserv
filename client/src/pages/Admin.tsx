import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, BarChart3, Check, CircleAlert, Download, LogOut, Pencil, Search, ShieldAlert, UserRound, UsersRound, X } from "lucide-react";
import { useSession, useLogin, useLogout } from "@/lib/session";
import { trpc } from "@/lib/trpc";

const SCHOOLS = [
  "CEI LUIZ FELIPE", "CEM SAO CRISTOVAO", "CEI ARCO IRIS", "CEI BRUNO LEONARDO", "CEI DOM FRANCO", "CEI MENINO JESUS", "CEI NOSSO LAR", "CEI VASCO PAPA", "CEI CRIANÇA FELIZ", "CEM GUILHERME", "CEM ORLANDO PEREIRA", "EM MARIA HILDA", "EM PAULO FREIRE", "EM JOSE ANCHIETA", "ERM ALVARES AZEVEDO", "ERM CORA CORALINA", "ERM EUCLIDES CUNHA", "ERM OSVALDO CRUZ", "ERM VINICIUS DE MORAIS", "SME", "LOGISTICA", "ALMOXARIFADO", "MERENDA",
] as const;
type SchoolSector = typeof SCHOOLS[number];
type EventDay = "29" | "30";

type Row = {
  id: number; protocol: string; schoolSector: string; role: string; employeeName: string;
  eventDay: EventDay; peopleCount: number;
  status: "active" | "cancelled"; createdAt: Date;
};
type AdminForm = { schoolSector: SchoolSector; role: string; employeeName: string; eventDay: EventDay };

export default function Admin() {
  const { data: session, isLoading } = useSession();
  const login = useLogin();
  const { logout } = useLogout();
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [schoolSector, setSchoolSector] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled">("active");
  const [dayFilter, setDayFilter] = useState<"all" | EventDay>("all");
  const [editing, setEditing] = useState<Row | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const utils = trpc.useUtils();
  const isAdmin = session?.role === "admin";
  const enabled = isAdmin;
  const stats = trpc.registration.adminStats.useQuery(undefined, { enabled });
  const rows = trpc.registration.adminList.useQuery({ search, schoolSector, status: statusFilter, eventDay: dayFilter }, { enabled });
  const update = trpc.registration.update.useMutation({ onSuccess: () => { setEditing(null); utils.registration.adminList.invalidate(); utils.registration.adminStats.invalidate(); } });
  const cancel = trpc.registration.cancel.useMutation({ onSuccess: () => { setCancelTarget(null); setCancelReason(""); utils.registration.adminList.invalidate(); utils.registration.adminStats.invalidate(); } });
  const maxDistribution = useMemo(() => Math.max(...(stats.data?.distribution?.map(item => item.people) ?? [1])), [stats.data]);
  const day29 = stats.data?.days?.["29"];
  const day30 = stats.data?.days?.["30"];
  const day29Pct = day29 ? Math.min(100, Math.round((day29.occupied / day29.capacity) * 100)) : 0;
  const day30Pct = day30 ? Math.min(100, Math.round((day30.occupied / day30.capacity) * 100)) : 0;

  function exportCsv() {
    const header = ["Protocolo", "Dia", "Funcionário", "Função", "Escola/Setor", "Situação", "Data"];
    const body = (rows.data ?? []).map(row => [row.protocol, `${row.eventDay}/10`, row.employeeName, row.role, row.schoolSector, row.status === "active" ? "Ativa" : "Cancelada", new Date(row.createdAt).toLocaleString("pt-BR")]);
    const csv = [header, ...body].map(line => line.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "inscricoes-evento.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  if (isLoading) return <div className="admin-state"><div className="spinner" />Carregando sessão...</div>;

  if (!isAdmin) {
    return (
      <div className="admin-state">
        <div className="state-icon"><ShieldAlert /></div>
        <h1>Área administrativa</h1>
        <p>Informe a senha de administração para acessar os dados de inscrição.</p>
        <form
          className="admin-login"
          onSubmit={event => {
            event.preventDefault();
            login.mutate(password, { onSuccess: () => setPassword("") });
          }}
        >
          <label className="field-group">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Senha do administrador"
              autoComplete="current-password"
              autoFocus
            />
          </label>
          {login.error && <div className="form-error" role="alert"><CircleAlert size={16} />{login.error.message}</div>}
          <button className="button button-primary" type="submit" disabled={login.isPending || !password}>
            {login.isPending ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <a className="back-link" href="/"><ArrowLeft size={16} /> Voltar para inscrição</a>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-caption">Gestão do evento</div>
        <nav><a className="active" href="#visao-geral"><BarChart3 size={17} /> Visão geral</a><a href="#inscricoes"><UsersRound size={17} /> Inscrições</a></nav>
        <div className="sidebar-bottom"><div className="admin-identity"><span className="avatar"><UserRound size={15} /></span><div><strong>{session?.name || "Administrador"}</strong><small>Administrador</small></div></div><button className="logout-button" onClick={() => logout()}><LogOut size={16} /> Sair</button></div>
      </aside>
      <main className="admin-main">
        <header className="admin-header"><div><p className="eyebrow">Painel de controle</p><h1>Visão geral</h1></div><a className="back-link" href="/"><ArrowLeft size={16} /> Página de inscrição</a></header>
        <section className="metric-grid" id="visao-geral">
          <Metric icon={<UsersRound />} label="Dia 29 de Outubro" value={day29 ? `${day29.occupied} / ${day29.capacity}` : "—"} hint={`${day29Pct}% ocupado`} tone="dark" />
          <Metric icon={<UsersRound />} label="Dia 30 de Outubro" value={day30 ? `${day30.occupied} / ${day30.capacity}` : "—"} hint={`${day30Pct}% ocupado`} tone="dark" />
          <Metric icon={<UserRound />} label="Funcionários" value={stats.data?.employees ?? "—"} hint="inscritos" />
        </section>
        <section className="admin-content-grid">
          <div className="panel distribution-panel"><div className="panel-heading"><div><p className="eyebrow">Distribuição</p><h2>Por escola ou setor</h2></div><span className="panel-count">{stats.data?.distribution?.length ?? 0} locais</span></div><div className="distribution-list">{(stats.data?.distribution ?? []).slice(0, 8).map(item => <div className="distribution-row" key={item.schoolSector}><div className="distribution-label"><span>{item.schoolSector}</span><b>{item.people}</b></div><div className="bar-track"><span style={{ width: `${Math.max(5, (item.people / maxDistribution) * 100)}%` }} /></div><small>{item.registrations} inscrições</small></div>)}</div></div>
          <div className="panel pulse-panel"><div className="panel-heading"><div><p className="eyebrow">Status</p><h2>Capacidade por dia</h2></div><span className="live-dot">Atualizado</span></div>
            <div className="big-capacity"><strong>{stats.data?.occupied ?? 0}</strong><span>pessoas<br />confirmadas</span></div>
            <div className="day-capacity-rows">
              <div className="day-capacity-row"><span>Dia 29</span><div className="bar-track"><span style={{ width: `${day29Pct}%` }} /></div><b>{day29?.occupied ?? 0}/{day29?.capacity ?? 400}</b></div>
              <div className="day-capacity-row"><span>Dia 30</span><div className="bar-track"><span style={{ width: `${day30Pct}%` }} /></div><b>{day30?.occupied ?? 0}/{day30?.capacity ?? 400}</b></div>
            </div>
            <p className="capacity-message">{(day29?.remaining ?? 400) === 0 && (day30?.remaining ?? 400) === 0 ? "Inscrições encerradas nos dois dias" : "Inscrições abertas"}</p>
          </div>
        </section>
        <section className="panel registrations-panel" id="inscricoes">
          <div className="panel-heading registrations-heading"><div><p className="eyebrow">Base de servidores</p><h2>Inscrições</h2></div><button className="button button-outline" onClick={exportCsv}><Download size={16} /> Exportar CSV</button></div>
          <div className="filters"><div className="search-box"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou protocolo" /></div><select value={dayFilter} onChange={e => setDayFilter(e.target.value as typeof dayFilter)}><option value="all">Todos os dias</option><option value="29">Dia 29 de Outubro</option><option value="30">Dia 30 de Outubro</option></select><select value={schoolSector} onChange={e => setSchoolSector(e.target.value)}><option value="all">Todas as escolas/setores</option>{SCHOOLS.map(school => <option key={school} value={school}>{school}</option>)}</select><select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}><option value="active">Ativas</option><option value="cancelled">Canceladas</option><option value="all">Todas as situações</option></select></div>
          <div className="table-wrap"><table><thead><tr><th>Servidor</th><th>Dia</th><th>Escola/setor</th><th>Qtd.</th><th>Situação</th><th className="action-col">Ações</th></tr></thead><tbody>{rows.data?.map(row => <tr key={row.id}><td><strong>{row.employeeName}</strong><small>{row.protocol} · {row.role}</small></td><td><span className="status-pill day">{row.eventDay}/10</span></td><td>{row.schoolSector}</td><td>{row.peopleCount}</td><td><span className={`status-pill ${row.status}`}>{row.status === "active" ? <><Check size={13} /> Ativa</> : <><X size={13} /> Cancelada</>}</span></td><td className="action-col"><button className="icon-button" title="Editar inscrição" onClick={() => setEditing(row)}><Pencil size={16} /></button>{row.status === "active" && <button className="icon-button danger" title="Cancelar inscrição" onClick={() => setCancelTarget(row)}><X size={16} /></button>}</td></tr>)}{!rows.data?.length && <tr><td colSpan={6} className="empty-cell">Nenhuma inscrição encontrada.</td></tr>}</tbody></table></div>
        </section>
      </main>
      {editing && <EditDialog row={editing} onClose={() => setEditing(null)} onSave={data => update.mutate({ id: editing.id, data })} pending={update.isPending} />}
      {cancelTarget && <CancelDialog row={cancelTarget} reason={cancelReason} setReason={setCancelReason} pending={cancel.isPending} onClose={() => setCancelTarget(null)} onConfirm={() => cancel.mutate({ id: cancelTarget.id, reason: cancelReason })} />}
    </div>
  );
}

function Metric({ icon, label, value, hint, tone = "light" }: { icon: ReactNode; label: string; value: ReactNode; hint: string; tone?: string }) { return <div className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>; }

function EditDialog({ row, onClose, onSave, pending }: { row: Row; onClose: () => void; onSave: (data: AdminForm) => void; pending: boolean }) {
  const [data, setData] = useState<AdminForm>({ schoolSector: row.schoolSector as SchoolSector, role: row.role, employeeName: row.employeeName, eventDay: row.eventDay });
  return <div className="modal-backdrop"><div className="modal-card"><div className="modal-top"><div><p className="eyebrow">Editar inscrição</p><h2>{row.protocol}</h2></div><button className="icon-button" onClick={onClose}><X /></button></div><div className="modal-form"><label className="field-group"><span>Nome completo</span><input value={data.employeeName} onChange={e => setData({ ...data, employeeName: e.target.value })} /></label><label className="field-group"><span>Função</span><input value={data.role} onChange={e => setData({ ...data, role: e.target.value })} /></label><label className="field-group"><span>Escola ou setor</span><select value={data.schoolSector} onChange={e => setData({ ...data, schoolSector: e.target.value as SchoolSector })}>{SCHOOLS.map(school => <option key={school} value={school}>{school}</option>)}</select></label><div className="choice-row"><button type="button" className={`choice ${data.eventDay === "29" ? "selected" : ""}`} onClick={() => setData({ ...data, eventDay: "29" })}>Dia 29 de Outubro</button><button type="button" className={`choice ${data.eventDay === "30" ? "selected" : ""}`} onClick={() => setData({ ...data, eventDay: "30" })}>Dia 30 de Outubro</button></div></div><div className="modal-actions"><button className="button button-outline" onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={pending} onClick={() => onSave(data)}>{pending ? "Salvando..." : "Salvar alterações"}</button></div></div></div>;
}

function CancelDialog({ row, reason, setReason, pending, onClose, onConfirm }: { row: Row; reason: string; setReason: (value: string) => void; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop"><div className="modal-card"><div className="modal-top"><div><p className="eyebrow">Cancelar inscrição</p><h2>{row.employeeName}</h2></div><button className="icon-button" onClick={onClose}><X /></button></div><p>Esta ação libera {row.peopleCount} {row.peopleCount === 1 ? "vaga" : "vagas"} para o dia {row.eventDay}/10.</p><label className="field-group"><span>Motivo do cancelamento</span><textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Informe o motivo para o histórico" /></label><div className="modal-actions"><button className="button button-outline" onClick={onClose}>Voltar</button><button className="button button-danger" disabled={reason.trim().length < 3 || pending} onClick={onConfirm}>{pending ? "Cancelando..." : "Confirmar cancelamento"}</button></div></div></div>;
}
