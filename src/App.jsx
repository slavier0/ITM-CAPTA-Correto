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
