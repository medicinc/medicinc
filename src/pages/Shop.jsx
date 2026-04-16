import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  ShoppingCart, DollarSign, Zap, Crown, Star, Gift, Check,
  Sparkles, ArrowRight, Wallet, Tag, AlertCircle, PartyPopper,
  Package, Gem, Trophy, FlaskConical, ClipboardList, Stethoscope, Shield, Pill, Clock3, Siren
} from 'lucide-react'
import { LEGENDARY_TOOLS, UTILITY_PASSES, getSpecialHardcapNotes } from '../data/shopSpecials'

const CURRENCY_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter-Paket',
    amount: 5000,
    price: '2,99€',
    priceNum: 2.99,
    icon: Package,
    color: 'from-blue-500 to-blue-600',
    popular: false,
    bonus: null,
  },
  {
    id: 'standard',
    name: 'Standard-Paket',
    amount: 15000,
    price: '7,99€',
    priceNum: 7.99,
    icon: Zap,
    color: 'from-purple-500 to-purple-600',
    popular: false,
    bonus: '+2.000 Bonus',
  },
  {
    id: 'premium',
    name: 'Premium-Paket',
    amount: 35000,
    price: '14,99€',
    priceNum: 14.99,
    icon: Gem,
    color: 'from-amber-500 to-amber-600',
    popular: false,
    bonus: '+7.000 Bonus',
  },
  {
    id: 'mega',
    name: 'Mega-Paket',
    amount: 80000,
    price: '29,99€',
    priceNum: 29.99,
    icon: Crown,
    color: 'from-rose-500 to-rose-600',
    popular: false,
    bonus: '+20.000 Bonus',
  },
  {
    id: 'ultimate',
    name: 'Ultimate-Paket',
    amount: 200000,
    price: '59,99€',
    priceNum: 59.99,
    icon: Trophy,
    color: 'from-emerald-500 to-emerald-600',
    popular: false,
    bonus: '+60.000 Bonus',
  },
]

const COUPON_CODES = {
  willkommen: { amount: 5000, message: 'Willkommensbonus! 5.000€ wurden deinem Konto gutgeschrieben!' },
  medisim2026: { amount: 10000, message: 'Aktionscode eingelöst! 10.000€ wurden deinem Konto gutgeschrieben!' },
  alpha2026: { amount: 10000, message: 'Alpha-Code eingelöst: +10.000€, Titel "Alpha Spieler" und Alpha Badge erhalten.' },
}

const LEGENDARY_META = {
  clipboard_durchblick: { icon: ClipboardList, color: 'from-indigo-500 to-violet-600', subtitle: '-15% Hilfen, +10% KH-Fallgeld' },
  labor_hustler: { icon: FlaskConical, color: 'from-cyan-500 to-sky-600', subtitle: '-10% Laborkosten, Labor 20% schneller' },
  goldenes_stethoskop: { icon: Stethoscope, color: 'from-amber-500 to-yellow-500', subtitle: '+30% kardiologische Fälle, -50% kardiologische Meds' },
  platin_kittel: { icon: Shield, color: 'from-slate-500 to-zinc-700', subtitle: '-20% nächster Karriereschritt, -10% Wissen' },
  ampullarium_traeger: { icon: Pill, color: 'from-fuchsia-500 to-pink-600', subtitle: '+10% RD-Geld, -10% RD-Kurse' },
}

const PASS_META = {
  nur_tagschichten: { icon: Clock3, color: 'from-emerald-500 to-teal-600', subtitle: '3 Tage: +10% KH- und RD-Verdienst' },
  apotheken_dienst: { icon: Pill, color: 'from-green-500 to-emerald-600', subtitle: '2 Tage: -20% auf alle Medikamente' },
  endlich_fachpersonal: { icon: Crown, color: 'from-violet-500 to-purple-600', subtitle: '2 Tage: -10% auf Stationen und Räume' },
  manv_ausloeser: { icon: Siren, color: 'from-red-500 to-rose-600', subtitle: 'Einmalig: MANV manuell triggerbar' },
  pocket_guide: { icon: Tag, color: 'from-blue-500 to-indigo-600', subtitle: '2 Tage: -20% auf alle Tipps/Hilfen' },
  feiertags_wochenend_nachtschicht: { icon: Sparkles, color: 'from-orange-500 to-amber-600', subtitle: '1h: merkbar mehr Patientenansturm' },
  ansturm_privatpatienten: { icon: Star, color: 'from-teal-500 to-cyan-600', subtitle: '6h: leichte Fälle +20% Verdienst' },
}

export default function Shop() {
  const { user, addMoney, updateUser } = useAuth()
  const shopClosedForAlpha = true
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState(null)
  const [purchaseResult, setPurchaseResult] = useState(null)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [specialResult, setSpecialResult] = useState(null)
  const capNotes = getSpecialHardcapNotes()
  const packageUnitInfo = useMemo(() => {
    const result = {}
    CURRENCY_PACKAGES.forEach((pkg) => {
      const bonusAmount = Number(String(pkg.bonus || '').replace(/[^\d]/g, '') || 0)
      const total = pkg.amount + bonusAmount
      const per1000 = (pkg.priceNum / Math.max(1, total / 1000)).toFixed(2).replace('.', ',')
      result[pkg.id] = { total, per1000 }
    })
    return result
  }, [])

  const ensureSpecialState = (state) => ({
    ownedLegendaryTools: Array.isArray(state?.ownedLegendaryTools) ? state.ownedLegendaryTools : [],
    utilityPassInventory: state?.utilityPassInventory && typeof state.utilityPassInventory === 'object' ? state.utilityPassInventory : {},
    activeLegendaryToolId: state?.activeLegendaryToolId || null,
    legendaryLastSwitchAt: state?.legendaryLastSwitchAt || null,
    activeUtilityPass: state?.activeUtilityPass || null,
    manvTriggerReady: !!state?.manvTriggerReady,
    badges: Array.isArray(state?.badges) ? state.badges : [],
    honorTitles: Array.isArray(state?.honorTitles) ? state.honorTitles : [],
    selectedHonorTitle: state?.selectedHonorTitle || null,
  })

  const redeemCoupon = () => {
    const code = couponCode.trim().toLowerCase()
    if (!code) return

    const coupon = COUPON_CODES[code]
    if (!coupon) {
      setCouponResult({ success: false, message: 'Ungültiger Gutscheincode. Bitte überprüfe deine Eingabe.' })
      setTimeout(() => setCouponResult(null), 5000)
      return
    }

    if (!coupon.infinite && user?.usedCoupons?.includes(code)) {
      setCouponResult({ success: false, message: 'Dieser Gutscheincode wurde bereits eingelöst.' })
      setTimeout(() => setCouponResult(null), 5000)
      return
    }

    addMoney(coupon.amount)
    if (code === 'alpha2026') {
      const special = ensureSpecialState(user?.specialState)
      const nextBadges = special.badges.includes('alpha_badge') ? special.badges : [...special.badges, 'alpha_badge']
      const nextTitles = special.honorTitles.includes('Alpha Spieler') ? special.honorTitles : [...special.honorTitles, 'Alpha Spieler']
      updateUser({
        specialState: {
          ...special,
          badges: nextBadges,
          honorTitles: nextTitles,
          selectedHonorTitle: special.selectedHonorTitle || 'Alpha Spieler',
        },
      })
    }
    if (!coupon.infinite) {
      updateUser({ usedCoupons: [...(user?.usedCoupons || []), code] })
    }
    setCouponResult({ success: true, message: coupon.message })
    setCouponCode('')

    setTimeout(() => setCouponResult(null), 5000)
  }

  const handlePurchase = (pkg) => {
    setSelectedPackage(pkg)
  }

  const confirmPurchase = () => {
    setPurchaseResult({
      success: false,
      message: 'Zahlungssystem noch nicht verfügbar. Diese Funktion wird in einem zukünftigen Update hinzugefügt!',
      packageName: selectedPackage?.name,
    })
    setSelectedPackage(null)
    setTimeout(() => setPurchaseResult(null), 5000)
  }

  const buyLegendaryTool = (toolId) => {
    const special = ensureSpecialState(user?.specialState)
    if (special.ownedLegendaryTools.includes(toolId)) {
      setSpecialResult({ success: false, message: 'Dieses Legendary Tool besitzt du bereits.' })
      setTimeout(() => setSpecialResult(null), 3500)
      return
    }
    updateUser({
      specialState: {
        ...special,
        ownedLegendaryTools: [...special.ownedLegendaryTools, toolId],
      },
    })
    setSpecialResult({ success: true, message: 'Legendary Tool freigeschaltet.' })
    setTimeout(() => setSpecialResult(null), 3500)
  }

  const buyUtilityPass = (passId) => {
    const special = ensureSpecialState(user?.specialState)
    const inv = { ...special.utilityPassInventory, [passId]: Number(special.utilityPassInventory?.[passId] || 0) + 1 }
    updateUser({
      specialState: {
        ...special,
        utilityPassInventory: inv,
      },
    })
    setSpecialResult({ success: true, message: 'Utility Pass zum Inventar hinzugefuegt.' })
    setTimeout(() => setSpecialResult(null), 3500)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-surface-900">Shop</h1>
          <p className="text-surface-500 mt-1">Kaufe Spielgeld für dein Krankenhaus und neue Ausstattung</p>
        </div>
        <div className="card px-5 py-3 flex items-center gap-3">
          <Wallet className="w-5 h-5 text-primary-600" />
          <div>
            <p className="text-xs text-surface-500">Dein Guthaben</p>
            <p className="text-lg font-bold text-surface-900">{(user?.wallet || 0).toLocaleString('de-DE')}€</p>
          </div>
        </div>
      </div>
      <div className={shopClosedForAlpha ? 'pointer-events-none select-none blur-[2px] opacity-70' : ''}>
        {/* Purchase result */}
        {purchaseResult && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
            purchaseResult.success ? 'bg-accent-50 border-accent-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <AlertCircle className={`w-5 h-5 shrink-0 ${purchaseResult.success ? 'text-accent-600' : 'text-amber-600'}`} />
            <p className={`text-sm ${purchaseResult.success ? 'text-accent-700' : 'text-amber-700'}`}>{purchaseResult.message}</p>
          </div>
        )}

        {/* Currency Packages */}
        <h2 className="text-xl font-semibold text-surface-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" /> Spielgeld-Pakete
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {CURRENCY_PACKAGES.map(pkg => {
            const Icon = pkg.icon
            return (
              <div key={pkg.id} className="card overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pkg.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {pkg.bonus && (
                      <span className="text-xs font-semibold text-accent-600 bg-accent-50 px-2 py-1 rounded-full">{pkg.bonus}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-surface-900 mb-1">{pkg.name}</h3>
                  <p className="text-2xl font-bold text-surface-900 mb-1">
                    {pkg.amount.toLocaleString('de-DE')}€
                    <span className="text-sm font-normal text-surface-500 ml-1">Spielgeld</span>
                  </p>
                  <p className="text-lg font-semibold text-primary-600 mb-4">{pkg.price}</p>
                  <p className="text-xs text-surface-500 mb-4">
                    Effektiv: {packageUnitInfo[pkg.id]?.per1000 || '0,00'}€ pro 1.000 Spielgeld (inkl. Bonus)
                  </p>
                  <button
                    onClick={() => handlePurchase(pkg)}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      pkg.popular
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <ShoppingCart className="w-4 h-4" /> Kaufen
                    </span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

      {/* Coupon Section */}
      <h2 className="text-xl font-semibold text-surface-900 mb-4 flex items-center gap-2">
        <Gift className="w-5 h-5 text-purple-500" /> Gutscheincode einlösen
      </h2>
      <div className="card p-6 mb-8">
        <p className="text-sm text-surface-500 mb-4">
          Hast du einen Gutscheincode? Gib ihn hier ein, um Spielgeld oder Boni zu erhalten.
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && redeemCoupon()}
              className="input-field !pl-11"
              placeholder="Gutscheincode eingeben..."
            />
          </div>
          <button onClick={redeemCoupon} className="btn-primary" disabled={!couponCode.trim()}>
            Einlösen
          </button>
        </div>
        <p className="text-[11px] text-surface-500 mt-3">
          Code-Regeln: pro Konto nur einmal, sofern nicht anders ausgewiesen; keine Barauszahlung; Aktion kann angepasst oder beendet werden.
        </p>

        {couponResult && (
          <div className={`mt-4 p-4 rounded-xl border flex items-center gap-3 ${
            couponResult.success ? 'bg-accent-50 border-accent-200' : 'bg-red-50 border-red-200'
          }`}>
            {couponResult.success ? (
              <PartyPopper className="w-5 h-5 text-accent-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <p className={`text-sm font-medium ${couponResult.success ? 'text-accent-700' : 'text-red-700'}`}>
              {couponResult.message}
            </p>
          </div>
        )}
      </div>

      <h2 className="text-xl font-semibold text-surface-900 mb-4 flex items-center gap-2">
        <Crown className="w-5 h-5 text-amber-500" /> Specials
      </h2>
      {specialResult && (
        <div className={`mb-4 p-3 rounded-xl border text-sm ${specialResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {specialResult.message}
        </div>
      )}
      <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/70 p-4">
        <p className="text-sm font-semibold text-violet-900 mb-1">Hardcaps (fair-play Schutz)</p>
        <ul className="text-xs text-violet-800 space-y-1">
          {capNotes.map((line) => <li key={line}>• {line}</li>)}
        </ul>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {LEGENDARY_TOOLS.map((tool) => {
          const meta = LEGENDARY_META[tool.id]
          const Icon = meta?.icon || Crown
          const owned = ensureSpecialState(user?.specialState).ownedLegendaryTools.includes(tool.id)
          return (
            <div key={tool.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${meta?.color || 'from-slate-500 to-slate-700'} text-white flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">{tool.rarity}</span>
              </div>
              <p className="font-semibold text-surface-900">{tool.name}</p>
              <p className="text-xs text-surface-500 mt-1 min-h-[36px]">{meta?.subtitle}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="font-semibold text-primary-700">{tool.price}</p>
                <button onClick={() => buyLegendaryTool(tool.id)} disabled={owned} className="btn-primary text-xs disabled:opacity-50">
                  {owned ? 'Besitzt du' : 'Kaufen'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {UTILITY_PASSES.map((pass) => {
          const meta = PASS_META[pass.id]
          const Icon = meta?.icon || Clock3
          const count = Number(ensureSpecialState(user?.specialState).utilityPassInventory?.[pass.id] || 0)
          return (
            <div key={pass.id} className="card p-5">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${meta?.color || 'from-slate-500 to-slate-700'} text-white flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-surface-900">{pass.name}</p>
              <p className="text-xs text-surface-500 mt-1 min-h-[36px]">{meta?.subtitle}</p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary-700">{pass.price}</p>
                  <p className="text-[11px] text-surface-500">Inventar: {count}</p>
                </div>
                <button onClick={() => buyUtilityPass(pass.id)} className="btn-secondary text-xs">
                  Kaufen
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div className="card p-6 bg-surface-50 border-surface-200">
        <h3 className="font-semibold text-surface-900 mb-2">Hinweis zum Shop</h3>
        <ul className="space-y-2 text-sm text-surface-600">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
            Spielgeld wird ausschließlich für In-Game-Käufe wie Krankenhausräume, Ausstattung und Personal verwendet
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
            Alle Spielinhalte können auch ohne Echtgeldzahlung durch Fallbehandlungen verdient werden
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
            Die meisten Gutscheincodes können nur einmal pro Konto eingelöst werden
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
            Virtuelle Güter sind digitale Nutzungsrechte im Spiel, nicht auszahlbar und nicht auf Echtgeld übertragbar
          </li>
        </ul>
        <p className="text-xs text-surface-500 mt-3">
          Rechtliche Details: <Link to="/nutzungsbedingungen" className="text-primary-700 underline">Nutzungsbedingungen</Link> · <Link to="/widerruf-digital" className="text-primary-700 underline">Widerruf digital</Link>
        </p>
      </div>

      </div>
      {shopClosedForAlpha && (
        <div className="absolute inset-0 z-30 flex items-start justify-center pt-28">
          <div className="mx-4 max-w-2xl rounded-2xl border border-amber-200 bg-white/92 backdrop-blur-md shadow-xl px-5 py-4 text-center">
            <p className="text-sm font-semibold text-amber-800">Shop aktuell geschlossen</p>
            <p className="text-xs text-amber-700 mt-1">
              Für die Alpha ist der Shop vorübergehend deaktiviert. Die Seite bleibt sichtbar, Käufe und Einlösungen sind aktuell nicht möglich.
            </p>
          </div>
        </div>
      )}

      {/* Purchase modal */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedPackage(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${selectedPackage.color} flex items-center justify-center mb-4`}>
              <selectedPackage.icon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 mb-1">{selectedPackage.name}</h2>
            <p className="text-3xl font-bold text-surface-900 mb-1">
              {selectedPackage.amount.toLocaleString('de-DE')}€ <span className="text-sm font-normal text-surface-500">Spielgeld</span>
            </p>
            <p className="text-lg font-semibold text-primary-600 mb-6">für {selectedPackage.price}</p>
            <p className="text-xs text-surface-500 mb-4">
              Gesamtmenge inkl. Bonus: {(packageUnitInfo[selectedPackage.id]?.total || selectedPackage.amount).toLocaleString('de-DE')} Spielgeld
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-700">
                Das Zahlungssystem ist noch nicht aktiv. Diese Funktion wird bald verfügbar sein!
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelectedPackage(null)} className="btn-secondary flex-1">Abbrechen</button>
              <button onClick={confirmPurchase} className="btn-primary flex-1">
                <ShoppingCart className="w-4 h-4" /> Kaufen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
