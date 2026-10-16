import { useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { Search, RefreshCw, ExternalLink, CalendarDays, Target, Wallet, FileSearch, ShieldCheck, Plus, X, Menu, AlertCircle, CheckCircle2, Clock3 } from 'lucide-react'

const categories = {
  hub_infrastructure: 'Infraestrutura do Hub',
  creative_territorial: 'Economia criativa e território',
  innovation_entrepreneurship: 'Inovação e empreendedorismo',
  summit_events: 'Taquara Summit e eventos',
  transversal: 'Transversal'
}
const statuses = {
  open_confirmed: 'Aberto confirmado',
  announced_not_open: 'Anunciado, ainda não aberto',
  historical_forecast: 'Previsão histórica',
  closed: 'Encerrado',
  suspended: 'Suspenso',
  needs_verification: 'Precisa verificar'
}
const money = value => value == null ? 'Não informado' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const date = value => value ? new Date(value).toLocaleDateString('pt-BR') : 'Sem prazo informado'

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [tab, setTab] = useState('overview')
  const [opportunities, setOpportunities] = useState([])
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ title:'', funder:'', official_url:'', regulation_url:'', category:'transversal', status:'needs_verification', deadline_at:'', amount_per_project_max:'', next_action:'' })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false)
      return
    }

    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session)
        setAuthLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session) {
      loadData()
    } else {
      setOpportunities([])
      setSources([])
    }
  }, [session])

  async function loadData() {
    if (!isSupabaseConfigured || !session) return
    setLoading(true); setError('')
    try {
      const [op, src] = await Promise.all([
        supabase.from('opportunities').select('id,title,funder,official_url,regulation_url,category,status,deadline_at,amount_per_project_min,amount_per_project_max,strategic_fit_score,eligibility_status,financial_viability_status,next_action,last_verified_at,created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('funding_sources').select('id,name,base_url,source_type,level,is_active,last_checked_at,last_check_status').order('name')
      ])
      if (op.error) throw op.error
      if (src.error) throw src.error
      setOpportunities(op.data || []); setSources(src.data || [])
    } catch (e) { setError(e.message || 'Não foi possível carregar os dados.') }
    finally { setLoading(false) }
  }

  async function handleSignIn(e) {
    e.preventDefault()
    if (!isSupabaseConfigured || !supabase) {
      setAuthError('O serviço de autenticação não está configurado. Contate o administrador do ITM.')
      return
    }
    setAuthBusy(true)
    setAuthError('')
    setAuthMessage('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword
      })
      if (error) throw error
      setAuthPassword('')
      setAuthMessage('Login realizado com sucesso.')
    } catch (e) {
      setAuthError(e.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : (e.message || 'Não foi possível entrar. Tente novamente.'))
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setError(`Não foi possível sair: ${error.message}`)
    else {
      setNotice('Você saiu da sua conta.')
      setShowForm(false)
    }
  }

  const filtered = useMemo(() => opportunities.filter(o => {
    const text = `${o.title || ''} ${o.funder || ''} ${categories[o.category] || ''}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (statusFilter === 'all' || o.status === statusFilter)
  }), [opportunities, query, statusFilter])

  const openCount = opportunities.filter(o => o.status === 'open_confirmed').length
  const verificationCount = opportunities.filter(o => o.status === 'needs_verification').length
  const dueCount = opportunities.filter(o => o.deadline_at && new Date(o.deadline_at) >= new Date() && (new Date(o.deadline_at) - new Date()) < 30*86400000).length

  async function saveOpportunity(e) {
    e.preventDefault()
    if (!isSupabaseConfigured || !session) { setNotice('Entre com sua conta para registrar oportunidades.'); return }
    setSaving(true); setNotice('')
    try {
      const payload = { ...form, amount_per_project_max: form.amount_per_project_max ? Number(form.amount_per_project_max) : null, deadline_at: form.deadline_at || null, is_demo: false }
      const { error: saveError } = await supabase.from('opportunities').insert(payload)
      if (saveError) throw saveError
      setShowForm(false); setForm({ title:'', funder:'', official_url:'', regulation_url:'', category:'transversal', status:'needs_verification', deadline_at:'', amount_per_project_max:'', next_action:'' })
      setNotice('Oportunidade registrada. Confirme os dados na fonte oficial antes de classificá-la como aberta.')
      await loadData()
    } catch (e) { setNotice(`Não foi possível salvar: ${e.message}`) }
    finally { setSaving(false) }
  }

  if (authLoading) {
    return <div style={loginPageStyle}><div style={loginCardStyle}><div style={loginMarkStyle}>ITM</div><h1 style={{ margin: '0 0 8px', fontSize: 25 }}>ITM Capta</h1><p style={{ margin: 0, color: '#64748b' }}>Verificando sua sessão segura...</p></div></div>
  }

  if (!isSupabaseConfigured) {
    return <div style={loginPageStyle}><div style={loginCardStyle}><div style={loginMarkStyle}>ITM</div><h1 style={{ margin: '0 0 8px', fontSize: 25 }}>ITM Capta</h1><p style={{ color: '#64748b', lineHeight: 1.6 }}>O sistema de autenticação não está configurado. Contate o administrador do ITM.</p></div></div>
  }

  if (!session) {
    return <div style={loginPageStyle}>
      <form onSubmit={handleSignIn} style={loginCardStyle}>
        <div style={loginMarkStyle}>ITM</div>
        <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: '0 0 8px' }}>INSTITUTO TAQUARA MAIS</p>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, color: '#172033' }}>Entrar no ITM Capta</h1>
        <p style={{ color: '#64748b', lineHeight: 1.55, margin: '0 0 24px' }}>Acesse com o e-mail e a senha fornecidos pelo administrador.</p>
        {authError && <div role="alert" style={authAlertStyle}>{authError}</div>}
        {authMessage && <div role="status" style={{ ...authAlertStyle, background: '#ecfdf5', color: '#065f46' }}>{authMessage}</div>}
        <label style={loginLabelStyle}>E-mail
          <input type="email" autoComplete="username" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="voce@instituicao.org.br" style={loginInputStyle} />
        </label>
        <label style={loginLabelStyle}>Senha
          <input type="password" autoComplete="current-password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Sua senha" style={loginInputStyle} />
        </label>
        <button type="submit" disabled={authBusy} style={loginButtonStyle}>{authBusy ? 'Entrando...' : 'Entrar com segurança'}</button>
        <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5, margin: '18px 0 0' }}>O cadastro público está desativado. Somente contas criadas pelo administrador podem acessar o sistema.</p>
      </form>
    </div>
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">ITM</div><div><strong>ITM Capta</strong><span>INTELIGÊNCIA DE RECURSOS</span></div></div>
      <div className="workspace"><span className="workspace-dot"></span><div><small>ESPAÇO DE TRABALHO</small><b>Instituto Taquara Mais</b></div></div>
      <nav>
        <button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}><Target size={18}/> Visão geral</button>
        <button className={tab==='opportunities'?'active':''} onClick={()=>setTab('opportunities')}><FileSearch size={18}/> Oportunidades <span className="nav-count">{opportunities.length}</span></button>
        <button className={tab==='sources'?'active':''} onClick={()=>setTab('sources')}><RefreshCw size={18}/> Fontes de recursos <span className="nav-count">{sources.length}</span></button>
      </nav>
      <div className="sidebar-bottom"><ShieldCheck size={17}/><div><b>Verificação responsável</b><p>Oportunidades precisam de confirmação em fontes oficiais.</p></div></div>
      <div className="sidebar-footer">ITM CAPTA <span>•</span> VERSÃO INICIAL</div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumb">Instituto Taquara Mais <span>/</span> {tab==='overview'?'Visão geral':tab==='opportunities'?'Oportunidades':'Fontes de recursos'}</div><div className="top-actions"><span className={`connection ${isSupabaseConfigured?'connected':'disconnected'}`}><i></i>{isSupabaseConfigured?'Banco configurado':'Banco não configurado'}</span><button className="icon-btn" title="Atualizar dados" onClick={loadData}><RefreshCw size={17} className={loading?'spin':''}/></button><button className="secondary" onClick={handleSignOut} style={{ marginLeft: 8 }}>Sair</button></div></header>
      <section className="page-content">
        {tab==='overview' && <>
          <div className="page-heading"><div><p className="eyebrow">RADAR DE CAPTAÇÃO</p><h1>Encontre recursos para transformar ideias em projetos.</h1><p className="subheading">Centralize editais, avalie aderência institucional e acompanhe prazos importantes.</p></div><button className="primary" onClick={()=>{setTab('opportunities');setShowForm(true)}}><Plus size={18}/> Nova oportunidade</button></div>
          {!isSupabaseConfigured && <div className="setup-alert"><AlertCircle size={20}/><div><b>Conecte o banco de dados</b><p>O painel está pronto para configuração. Copie <code>.env.example</code> para <code>.env.local</code> e adicione a chave pública do Supabase. Consulte o README.</p></div></div>}
          {error && <div className="error-alert"><AlertCircle size={18}/>{error}</div>}
          {notice && <div className="notice"><CheckCircle2 size={18}/>{notice}<button onClick={()=>setNotice('')}><X size={16}/></button></div>}
          <div className="metrics">
            <Metric icon={<FileSearch/>} label="Oportunidades cadastradas" value={opportunities.length} note="Registros no banco" />
            <Metric icon={<CheckCircle2/>} label="Abertas confirmadas" value={openCount} note="Exigem evidência oficial" />
            <Metric icon={<AlertCircle/>} label="A verificar" value={verificationCount} note="Pendente de validação" />
            <Metric icon={<CalendarDays/>} label="Prazos em 30 dias" value={dueCount} note="Com data futura cadastrada" />
          </div>
          <div className="section-heading"><div><h2>Oportunidades recentes</h2><p>Priorize o que está confirmado e aderente às metas do ITM.</p></div><button className="text-btn" onClick={()=>setTab('opportunities')}>Ver todas <span>→</span></button></div>
          <OpportunityList items={opportunities.slice(0,5)} loading={loading} onOpen={()=>setTab('opportunities')} />
          <div className="lower-grid">
            <div className="panel"><div className="panel-title"><div className="panel-icon"><Wallet size={19}/></div><div><h3>Prioridades estratégicas</h3><p>Linhas de atuação do ITM</p></div></div><div className="priority-list">{Object.entries(categories).filter(([k])=>k!=='transversal').map(([k,v],i)=><div className="priority" key={k}><span className="priority-num">0{i+1}</span><span>{v}</span><span className="priority-arrow">↗</span></div>)}</div></div>
            <div className="panel status-panel"><div className="panel-title"><div className="panel-icon"><RefreshCw size={19}/></div><div><h3>Estado do radar</h3><p>Transparência operacional</p></div></div><div className="status-row"><span>Fontes cadastradas</span><b>{sources.length}</b></div><div className="status-row"><span>Fontes ativas</span><b>{sources.filter(s=>s.is_active).length}</b></div><div className="status-row"><span>Coleta automática</span><span className="pill pill-warn">Ainda não ativada</span></div><div className="status-foot">O painel não afirma que fontes foram consultadas automaticamente. A automação será uma etapa separada.</div></div>
          </div>
        </>}
        {tab==='opportunities' && <>
          <div className="page-heading compact"><div><p className="eyebrow">BASE DE OPORTUNIDADES</p><h1>Oportunidades</h1><p className="subheading">Pesquise, filtre e registre oportunidades com rastreabilidade.</p></div><button className="primary" onClick={()=>setShowForm(true)}><Plus size={18}/> Nova oportunidade</button></div>
          {notice && <div className="notice"><CheckCircle2 size={18}/>{notice}<button onClick={()=>setNotice('')}><X size={16}/></button></div>}
          <div className="filters"><div className="searchbox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por edital, instituição ou tema..." /></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">Todos os status</option>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
          <OpportunityList items={filtered} loading={loading} />
        </>}
        {tab==='sources' && <>
          <div className="page-heading compact"><div><p className="eyebrow">ORIGEM DAS INFORMAÇÕES</p><h1>Fontes de recursos</h1><p className="subheading">Catálogo inicial de fontes. Cadastro não significa que um edital foi encontrado ou verificado.</p></div></div>
          {error && <div className="error-alert"><AlertCircle size={18}/>{error}</div>}
          <div className="source-grid">{sources.map(s=><div className="source-card" key={s.id}><div className="source-top"><span className="source-symbol">{(s.name||'F').slice(0,1)}</span><span className={`source-status ${s.is_active?'on':'off'}`}>{s.is_active?'Ativa':'Inativa'}</span></div><h3>{s.name}</h3><p>{s.level || 'Nível não definido'} · {s.source_type || 'website'}</p><div className="source-meta"><span>Última consulta</span><b>{date(s.last_checked_at)}</b></div><a href={s.base_url} target="_blank" rel="noreferrer">Abrir fonte oficial <ExternalLink size={14}/></a></div>)}</div>
          {!sources.length && !loading && <Empty title="Nenhuma fonte carregada" text="Configure a conexão com o Supabase e atualize o painel."/>}
        </>}
        <footer className="main-footer"><span>ITM Capta</span><span>Inteligência para captação de recursos · Taquara, RS</span><span>Dados sujeitos a verificação oficial</span></footer>
      </section>
    </main>
    {showForm && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><div className="modal"><div className="modal-head"><div><p className="eyebrow">REGISTRO MANUAL</p><h2>Nova oportunidade</h2></div><button className="icon-btn" onClick={()=>setShowForm(false)}><X/></button></div><form onSubmit={saveOpportunity}><label>Título do edital ou oportunidade *<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></label><label>Instituição financiadora *<input required value={form.funder} onChange={e=>setForm({...form,funder:e.target.value})} /></label><label>Link da fonte oficial *<input required type="url" placeholder="https://" value={form.official_url} onChange={e=>setForm({...form,official_url:e.target.value})} /></label><label>Link do regulamento<input type="url" placeholder="https://" value={form.regulation_url} onChange={e=>setForm({...form,regulation_url:e.target.value})} /></label><div className="form-row"><label>Categoria<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{Object.entries(categories).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Status inicial<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div><div className="form-row"><label>Prazo final<input type="date" value={form.deadline_at} onChange={e=>setForm({...form,deadline_at:e.target.value})}/></label><label>Valor máximo por projeto (R$)<input type="number" min="0" value={form.amount_per_project_max} onChange={e=>setForm({...form,amount_per_project_max:e.target.value})}/></label></div><label>Próxima ação recomendada<textarea rows="2" value={form.next_action} onChange={e=>setForm({...form,next_action:e.target.value})}/></label><div className="form-note"><AlertCircle size={16}/> O registro manual não substitui a validação do regulamento e da elegibilidade do ITM.</div><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowForm(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving?'Salvando...':'Salvar oportunidade'}</button></div></form></div></div>}
  </div>
}

const loginPageStyle = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24, background: 'linear-gradient(135deg, #f3f6fb 0%, #e8eef7 100%)',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
}
const loginCardStyle = {
  width: '100%', maxWidth: 430, boxSizing: 'border-box', background: '#fff',
  border: '1px solid #e2e8f0', borderRadius: 20, padding: '36px 32px',
  boxShadow: '0 20px 60px rgba(15, 23, 42, 0.10)'
}
const loginMarkStyle = {
  width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 15, background: '#173b68', color: '#fff', fontWeight: 800,
  letterSpacing: 1, marginBottom: 24
}
const loginLabelStyle = { display: 'block', color: '#334155', fontSize: 13, fontWeight: 650, marginBottom: 16 }
const loginInputStyle = {
  display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 8, padding: '12px 13px',
  border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 15, outlineColor: '#315f91'
}
const loginButtonStyle = {
  width: '100%', marginTop: 6, padding: '13px 16px', border: 0, borderRadius: 9,
  background: '#173b68', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer'
}
const authAlertStyle = {
  background: '#fef2f2', color: '#991b1b', borderRadius: 9, padding: 12,
  fontSize: 13, lineHeight: 1.5, marginBottom: 16
}

function Metric({icon,label,value,note}) { return <div className="metric"><div className="metric-top"><span className="metric-icon">{icon}</span><span className="metric-kicker">ITM CAPTA</span></div><strong>{value}</strong><span className="metric-label">{label}</span><small>{note}</small></div> }
function OpportunityList({items,loading,onOpen}) {
  if (loading) return <div className="empty-state"><RefreshCw className="spin"/> Carregando dados...</div>
  if (!items.length) return <Empty title="Ainda não há oportunidades cadastradas" text="Cadastre uma oportunidade para começar a organizar a análise e os próximos passos." />
  return <div className="table-wrap"><table><thead><tr><th>Oportunidade</th><th>Status</th><th>Aderência</th><th>Valor máximo</th><th>Prazo</th><th>Fonte</th></tr></thead><tbody>{items.map(o=><tr key={o.id}><td><div className="opp-title">{o.title}</div><div className="opp-funder">{o.funder || 'Financiador não informado'}</div><div className="opp-category">{categories[o.category] || o.category}</div></td><td><span className={`pill ${o.status==='open_confirmed'?'pill-green':o.status==='closed'||o.status==='suspended'?'pill-muted':'pill-warn'}`}>{statuses[o.status] || o.status}</span></td><td>{o.strategic_fit_score == null ? <span className="muted">Pendente</span> : <b>{o.strategic_fit_score}/100</b>}</td><td>{money(o.amount_per_project_max)}</td><td><span className="deadline"><CalendarDays size={14}/>{date(o.deadline_at)}</span></td><td>{o.official_url?<a className="source-link" href={o.official_url} target="_blank" rel="noreferrer">Ver fonte <ExternalLink size={13}/></a>:<span className="muted">Não informado</span>}</td></tr>)}</tbody></table></div>
}
function Empty({title,text}) { return <div className="empty-state"><div className="empty-icon"><FileSearch size={22}/></div><h3>{title}</h3><p>{text}</p></div> }
