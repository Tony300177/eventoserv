import { FormEvent, useMemo, useState } from "react";
import { Check, ChevronRight, CircleAlert, Clock, Info, LockKeyhole, MapPin, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";

const SCHOOLS = [
  "CEI LUIZ FELIPE", "CEM SAO CRISTOVAO", "CEI ARCO IRIS", "CEI BRUNO LEONARDO", "CEI DOM FRANCO", "CEI MENINO JESUS", "CEI NOSSO LAR", "CEI VASCO PAPA", "CEI CRIANÇA FELIZ", "CEM GUILHERME", "CEM ORLANDO PEREIRA", "EM MARIA HILDA", "EM PAULO FREIRE", "EM JOSE ANCHIETA", "ERM ALVARES AZEVEDO", "ERM CORA CORALINA", "ERM EUCLIDES CUNHA", "ERM OSVALDO CRUZ", "ERM VINICIUS DE MORAIS", "SME", "LOGISTICA", "ALMOXARIFADO", "MERENDA",
 ] as const;
type SchoolSector = typeof SCHOOLS[number];

const rules = [
  "Não será permitida a entrada de crianças.",
  "Será servido jantar e refrigerantes.",
  "Outros tipos de bebidas poderão ser levados pelo próprio servidor.",
  "Cada servidor poderá se inscrever em apenas um dos dias (29 ou 30 de outubro/26).",
  "O convite é individual para o servidor.",
];

type EventDay = "29" | "30";
type FormState = { schoolSector: SchoolSector | ""; role: string; employeeName: string; eventDay: EventDay | "" };
const initialForm: FormState = { schoolSector: "", role: "", employeeName: "", eventDay: "" };
type LeadershipFormState = { fullName: string; sector: string };
const initialLeadershipForm: LeadershipFormState = { fullName: "", sector: "" };

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState<{ protocol: string; eventDay: EventDay } | null>(null);
  const [error, setError] = useState("");
  const [leadershipForm, setLeadershipForm] = useState<LeadershipFormState>(initialLeadershipForm);
  const [leadershipSubmitted, setLeadershipSubmitted] = useState<{ protocol: string; fullName: string } | null>(null);
  const [leadershipError, setLeadershipError] = useState("");
  const createLeadership = trpc.leadership.create.useMutation({
    onSuccess: data => { setLeadershipSubmitted(data); setLeadershipError(""); },
    onError: err => {
      if (err.message.includes("DUPLICATE_LEADERSHIP")) setLeadershipError("Já existe uma inscrição ativa com este nome.");
      else setLeadershipError("Não foi possível concluir agora. Confira os campos e tente novamente.");
    },
  });
  const create = trpc.registration.create.useMutation({
    onSuccess: data => { setSubmitted(data); setError(""); },
    onError: err => {
      if (err.message.includes("NO_CAPACITY")) setError("O dia selecionado não possui mais vagas. Escolha o outro dia, se disponível.");
      else if (err.message.includes("DUPLICATE_PERSON_SAME_DAY")) setError("Você já possui uma inscrição ativa para este dia. Cada pessoa só pode se inscrever uma vez por dia.");
      else if (err.message.includes("DUPLICATE_PERSON")) setError("Você já possui uma inscrição ativa para o outro dia. Cada pessoa só pode se inscrever em um dos dias.");
      else setError("Não foi possível concluir agora. Confira os campos e tente novamente.");
    },
  });
  const canSubmit = useMemo(() => Boolean(form.schoolSector && form.role.trim() && form.employeeName.trim() && form.eventDay), [form]);
  const canSubmitLeadership = useMemo(() => Boolean(leadershipForm.fullName.trim() && leadershipForm.sector.trim()), [leadershipForm]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm(current => ({ ...current, [key]: value })); }
  function updateLeadership<K extends keyof LeadershipFormState>(key: K, value: LeadershipFormState[K]) { setLeadershipForm(current => ({ ...current, [key]: value })); }
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!canSubmit) { setError("Preencha os campos obrigatórios e escolha o dia do evento."); return; }
    create.mutate({ ...form, schoolSector: form.schoolSector as SchoolSector, eventDay: form.eventDay as EventDay });
  }
  function submitLeadership(event: FormEvent) {
    event.preventDefault();
    setLeadershipError("");
    if (!canSubmitLeadership) { setLeadershipError("Informe o nome completo e o setor."); return; }
    createLeadership.mutate(leadershipForm);
  }

  if (submitted) {
    return <main className="public-shell success-shell"><section className="success-card" aria-live="polite"><div className="success-mark"><Check size={34} strokeWidth={2.5} /></div><p className="eyebrow">Inscrição registrada</p><h1>Até o encontro.</h1><p className="success-lede">Sua presença foi confirmada para o <b>Dia {submitted.eventDay} de Outubro</b>. Guarde o protocolo abaixo para consultar com a organização, se necessário.</p><div className="success-event-info"><span><MapPin size={14} />SIMNO</span><span><Clock size={14} />19:00 horas</span></div><div className="protocol-box"><span>Protocolo</span><strong>{submitted.protocol}</strong><small>1 pessoa contabilizada</small></div><button className="button button-primary" onClick={() => { setForm(initialForm); setSubmitted(null); }}>Fazer outra inscrição <ChevronRight size={17} /></button></section></main>;
  }

  return <main className="public-shell">
    <section className="public-context">
      <div className="context-copy"><p className="context-event">Encontro de quem faz a Educação acontecer.</p><p className="context-sub">Celebrar pessoas, reconhecer histórias e valorizar quem transforma vidas.</p></div>
      <div className="event-info">
        <div className="event-info-item"><MapPin size={17} /><span>Local</span><strong>SIMNO</strong></div>
        <div className="event-info-item"><Clock size={17} /><span>Horário</span><strong>19:00 horas</strong></div>
      </div>
      <div className="rules-block"><p className="eyebrow">INFORMAÇÕES</p><ul>{rules.map(rule => <li key={rule}><span>•</span>{rule}</li>)}</ul></div>
      <div className="notice-block" role="note"><p className="eyebrow">Aviso</p><p>Os convites individuais serão entregues na Secretaria da Escola.</p></div>
      <div className="context-note"><LockKeyhole size={15} /><span>Seus dados são usados somente para organizar o evento.</span></div>
    </section>
    <section className="public-form-area">
      <div className="form-card">
      <div className="form-intro"><div><p className="eyebrow">Inscrição</p><h2>Confirme sua inscrição</h2><p>Os campos marcados com <b>*</b> são obrigatórios.</p></div><a className="admin-link" href="/admin">Área administrativa</a></div>
      <form className="registration-form" onSubmit={submit} noValidate>
        <div className="form-section day-section"><div className="section-label"><div><label>Dia de participação <span>*</span></label><p>Escolha um dos dias. Só é permitida uma inscrição por pessoa.</p></div></div><div className="choice-row" role="radiogroup" aria-label="Dia de participação"><button type="button" className={`choice ${form.eventDay === "29" ? "selected" : ""}`} onClick={() => update("eventDay", "29")} aria-pressed={form.eventDay === "29"}>Dia 29 de Outubro</button><button type="button" className={`choice ${form.eventDay === "30" ? "selected" : ""}`} onClick={() => update("eventDay", "30")} aria-pressed={form.eventDay === "30"}>Dia 30 de Outubro</button></div></div>
        <div className="field-group"><label htmlFor="schoolSector">Escola ou setor <span>*</span></label><select id="schoolSector" value={form.schoolSector} onChange={e => update("schoolSector", e.target.value as SchoolSector | "")}><option value="">Selecione uma opção</option>{SCHOOLS.map(school => <option key={school} value={school}>{school}</option>)}</select></div>
        <div className="field-grid"><div className="field-group"><label htmlFor="employeeName">Nome completo <span>*</span></label><input id="employeeName" value={form.employeeName} onChange={e => update("employeeName", e.target.value)} placeholder="Como devemos chamar você?" autoComplete="name" /></div><div className="field-group"><label htmlFor="role">Função <span>*</span></label><input id="role" value={form.role} onChange={e => update("role", e.target.value)} placeholder="Ex.: professora" /></div></div>
        {error && <div className="form-error" role="alert"><CircleAlert size={18} />{error}</div>}
        <div className="form-submit"><p><Info size={16} /> A inscrição só será confirmada após o envio.</p><button className="button button-primary" type="submit" disabled={create.isPending}>{create.isPending ? "Registrando..." : "Confirmar inscrição"}<ChevronRight size={17} /></button></div>
      </form>
      </div>
      <section className="leadership-card" aria-labelledby="leadership-title">
        <div className="leadership-intro">
          <span className="leadership-badge"><UsersRound size={20} /></span>
          <div>
            <p className="eyebrow">Inscrição de lideranças</p>
            <h2 id="leadership-title">Diretores, Assessores e Chefes de Departamento</h2>
            <p>Confirme sua presença nos dois dias do evento, 29 e 30 de outubro. Informe apenas o nome completo e o setor.</p>
          </div>
        </div>
        {leadershipSubmitted ? (
          <div className="leadership-success" aria-live="polite">
            <div className="success-mark"><Check size={22} strokeWidth={2.5} /></div>
            <div>
              <strong>Presença confirmada nos dois dias.</strong>
              <p>{leadershipSubmitted.fullName}, seu protocolo é <b>{leadershipSubmitted.protocol}</b>.</p>
            </div>
            <button className="button button-outline" onClick={() => { setLeadershipForm(initialLeadershipForm); setLeadershipSubmitted(null); }}>Nova inscrição</button>
          </div>
        ) : (
          <form className="registration-form" onSubmit={submitLeadership} noValidate>
            <div className="field-grid">
              <div className="field-group"><label htmlFor="leadershipName">Nome completo <span>*</span></label><input id="leadershipName" value={leadershipForm.fullName} onChange={e => updateLeadership("fullName", e.target.value)} placeholder="Seu nome completo" autoComplete="name" /></div>
              <div className="field-group"><label htmlFor="leadershipSector">Setor <span>*</span></label><input id="leadershipSector" value={leadershipForm.sector} onChange={e => updateLeadership("sector", e.target.value)} placeholder="Ex.: Diretoria de Ensino" /></div>
            </div>
            {leadershipError && <div className="form-error" role="alert"><CircleAlert size={18} />{leadershipError}</div>}
            <div className="form-submit"><p><Info size={16} /> Válido para os dias 29 e 30 de outubro.</p><button className="button button-primary" type="submit" disabled={createLeadership.isPending}>{createLeadership.isPending ? "Registrando..." : "Confirmar presença nos dois dias"}<ChevronRight size={17} /></button></div>
          </form>
        )}
      </section>
      <footer className="site-footer">Desenvolvido pelo Departamento de Tecnologia da SME.</footer>
    </section>
  </main>;
}
