import { FormEvent, useMemo, useState } from "react";
import { Check, ChevronRight, CircleAlert, Info, LockKeyhole, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";

const SCHOOLS = [
  "CEI LUIZ FELIPE", "CEM SAO CRISTOVAO", "CEI ARCO IRIS", "CEI BRUNO LEONARDO", "CEI DOM FRANCO", "CEI MENINO JESUS", "CEI NOSSO LAR", "CEI VASCO PAPA", "CEI CRIANÇA FELIZ", "CEM GUILHERME", "CEM ORLANDO PEREIRA", "EM MARIA HILDA", "EM PAULO FREIRE", "EM JOSE ANCHIETA", "ERM ALVARES AZEVEDO", "ERM CORA CORALINA", "ERM EUCLIDES CUNHA", "ERM OSVALDO CRUZ", "ERM VINICIUS DE MORAIS", "SME", "LOGISTICA", "ALMOXARIFADO", "MERENDA",
 ] as const;
type SchoolSector = typeof SCHOOLS[number];

const rules = [
  "Não será permitida a entrada de crianças.",
  "Será servido refrigerante.",
  "Outros tipos de bebidas poderão ser levados pelo próprio participante.",
  "Cada funcionário poderá levar somente um acompanhante.",
];

type FormState = { schoolSector: SchoolSector | ""; role: string; employeeName: string; hasCompanion: boolean; companionName: string; rulesAccepted: boolean };
const initialForm: FormState = { schoolSector: "", role: "", employeeName: "", hasCompanion: false, companionName: "", rulesAccepted: false };

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState<{ protocol: string; peopleCount: number } | null>(null);
  const [error, setError] = useState("");
  const stats = trpc.registration.publicStats.useQuery(undefined, { refetchInterval: 30000 });
  const create = trpc.registration.create.useMutation({
    onSuccess: data => { setSubmitted(data); setError(""); stats.refetch(); },
    onError: err => setError(err.message.includes("NO_CAPACITY") ? "Não há vagas suficientes para concluir esta inscrição." : "Não foi possível concluir agora. Confira os campos e tente novamente."),
  });
  const remaining = stats.data?.remaining ?? 200;
  const occupied = stats.data?.occupied ?? 0;
  const progress = Math.min(100, Math.round((occupied / 200) * 100));
  const canSubmit = useMemo(() => Boolean(form.schoolSector && form.role.trim() && form.employeeName.trim() && form.rulesAccepted && (!form.hasCompanion || form.companionName.trim())), [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm(current => ({ ...current, [key]: value })); }
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!canSubmit) { setError("Preencha os campos obrigatórios e aceite as regras do evento."); return; }
    create.mutate({ ...form, schoolSector: form.schoolSector as SchoolSector, rulesAccepted: true });
  }

  if (submitted) {
    return <main className="public-shell success-shell"><section className="success-card" aria-live="polite"><div className="success-mark"><Check size={34} strokeWidth={2.5} /></div><p className="eyebrow">Inscrição registrada</p><h1>Até o encontro.</h1><p className="success-lede">Sua presença foi confirmada. Guarde o protocolo abaixo para consultar com a organização, se necessário.</p><div className="protocol-box"><span>Protocolo</span><strong>{submitted.protocol}</strong><small>{submitted.peopleCount === 2 ? "2 pessoas contabilizadas" : "1 pessoa contabilizada"}</small></div><button className="button button-primary" onClick={() => { setForm(initialForm); setSubmitted(null); }}>Fazer outra inscrição <ChevronRight size={17} /></button></section></main>;
  }

  return <main className="public-shell">
    <section className="public-context">
      <div className="brand"><span className="brand-mark"><i /><i /></span><span>encontro</span></div>
      <div className="context-copy"><p className="eyebrow">Evento dos servidores</p><h1>Sua presença começa aqui.</h1><p>Confirme sua participação e, se quiser, inclua uma pessoa acompanhante.</p></div>
      <div className="capacity-card"><div className="capacity-head"><span>Capacidade do evento</span><UsersRound size={18} /></div><div className="capacity-numbers"><strong>{remaining}</strong><span>vagas<br />restantes</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="capacity-foot"><span>{occupied} pessoas confirmadas</span><span>de 200</span></div></div>
      <div className="rules-block"><p className="eyebrow">Antes de continuar</p><ul>{rules.map(rule => <li key={rule}><span>•</span>{rule}</li>)}</ul></div>
      <div className="context-note"><LockKeyhole size={15} /><span>Seus dados são usados somente para organizar o evento.</span></div>
    </section>
    <section className="public-form-area">
      <div className="form-intro"><div><p className="eyebrow">01 / Inscrição</p><h2>Confirme seus dados</h2><p>Os campos marcados com <b>*</b> são obrigatórios.</p></div><a className="admin-link" href="/admin">Área administrativa</a></div>
      <form className="registration-form" onSubmit={submit} noValidate>
        <div className="field-group"><label htmlFor="schoolSector">Escola ou setor <span>*</span></label><select id="schoolSector" value={form.schoolSector} onChange={e => update("schoolSector", e.target.value as SchoolSector | "")}><option value="">Selecione uma opção</option>{SCHOOLS.map(school => <option key={school} value={school}>{school}</option>)}</select></div>
        <div className="field-grid"><div className="field-group"><label htmlFor="employeeName">Nome completo <span>*</span></label><input id="employeeName" value={form.employeeName} onChange={e => update("employeeName", e.target.value)} placeholder="Como devemos chamar você?" autoComplete="name" /></div><div className="field-group"><label htmlFor="role">Função <span>*</span></label><input id="role" value={form.role} onChange={e => update("role", e.target.value)} placeholder="Ex.: professora" /></div></div>
        <div className="companion-section"><div className="section-label"><span className="section-number">02</span><div><label>Acompanhante</label><p>Você poderá levar uma única pessoa.</p></div></div><div className="choice-row" role="radiogroup" aria-label="Acompanhante"><button type="button" className={`choice ${!form.hasCompanion ? "selected" : ""}`} onClick={() => { update("hasCompanion", false); update("companionName", ""); }} aria-pressed={!form.hasCompanion}>Não vou levar</button><button type="button" className={`choice ${form.hasCompanion ? "selected" : ""}`} onClick={() => update("hasCompanion", true)} aria-pressed={form.hasCompanion}>Vou levar acompanhante</button></div>{form.hasCompanion && <div className="field-group companion-input"><label htmlFor="companionName">Nome completo do acompanhante <span>*</span></label><input id="companionName" value={form.companionName} onChange={e => update("companionName", e.target.value)} placeholder="Nome da pessoa acompanhante" autoComplete="off" /></div>}</div>
        <div className="accept-box"><input id="rulesAccepted" type="checkbox" checked={form.rulesAccepted} onChange={e => update("rulesAccepted", e.target.checked)} /><label htmlFor="rulesAccepted">Li e aceito as regras do evento. <span>*</span></label></div>
        {error && <div className="form-error" role="alert"><CircleAlert size={18} />{error}</div>}
        <div className="form-submit"><p><Info size={16} /> A inscrição só será confirmada após o envio.</p><button className="button button-primary" type="submit" disabled={create.isPending || remaining === 0}>{create.isPending ? "Registrando..." : remaining === 0 ? "Inscrições encerradas" : "Confirmar inscrição"}<ChevronRight size={17} /></button></div>
      </form>
    </section>
  </main>;
}
