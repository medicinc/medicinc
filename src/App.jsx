import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import RegisterGate from './pages/RegisterGate'
import Onboarding from './pages/Onboarding'
import HospitalChoice from './pages/HospitalChoice'
import HospitalCreate from './pages/HospitalCreate'
import Dashboard from './pages/Dashboard'
import PatientCase from './pages/PatientCase'
import Hospital from './pages/Hospital'
import Rettungsdienst from './pages/Rettungsdienst'
import RescueStationChoice from './pages/RescueStationChoice'
import RescueStationCreate from './pages/RescueStationCreate'
import Courses from './pages/Courses'
import Leaderboard from './pages/Leaderboard'
import Shop from './pages/Shop'
import Profile from './pages/Profile'
import Knowledge from './pages/Knowledge'
import Settings from './pages/Settings'
import Impressum from './pages/legal/Impressum'
import Datenschutz from './pages/legal/Datenschutz'
import Nutzungsbedingungen from './pages/legal/Nutzungsbedingungen'
import WiderrufDigital from './pages/legal/WiderrufDigital'
import AiHinweise from './pages/legal/AiHinweise'
import Jugendschutz from './pages/legal/Jugendschutz'
import CommunityRegeln from './pages/legal/CommunityRegeln'
import WaitlistConfirm from './pages/WaitlistConfirm'
import ResetPassword from './pages/ResetPassword'

function ProtectedRoute({ children }) {
  const { isAuthenticated, needsOnboarding, needsHospital, needsRescueStation, authLoading } = useAuth()
  if (authLoading) return <div className="py-10 text-center text-surface-500">Lade Sitzung...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  if (needsHospital) return <Navigate to="/hospital-choice" replace />
  if (needsRescueStation) return <Navigate to="/rescue-station-choice" replace />
  return children
}

function OnboardingRoute({ children }) {
  const { isAuthenticated, needsOnboarding, needsRescueStation, needsHospital, authLoading } = useAuth()
  if (authLoading) return <div className="py-10 text-center text-surface-500">Lade Sitzung...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!needsOnboarding) return <Navigate to={needsHospital ? '/hospital-choice' : (needsRescueStation ? '/rescue-station-choice' : '/dashboard')} replace />
  return children
}

function HospitalSetupRoute({ children }) {
  const { isAuthenticated, needsOnboarding, authLoading, user } = useAuth()
  if (authLoading) return <div className="py-10 text-center text-surface-500">Lade Sitzung...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  if (!user?.medicalLicense) return <Navigate to="/rettungsdienst" replace />
  return children
}

function AuthOnlyRoute({ children }) {
  const { isAuthenticated, needsOnboarding, needsHospital, needsRescueStation, authLoading } = useAuth()
  if (authLoading) return <div className="py-10 text-center text-surface-500">Lade Sitzung...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  if (needsHospital) return <Navigate to="/hospital-choice" replace />
  if (needsRescueStation) return <Navigate to="/rescue-station-choice" replace />
  return children
}

function RescueSetupRoute({ children }) {
  const { isAuthenticated, needsOnboarding, authLoading } = useAuth()
  if (authLoading) return <div className="py-10 text-center text-surface-500">Lade Sitzung...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  return children
}

function MedicalLicenseRoute({ children }) {
  const { isAuthenticated, needsOnboarding, authLoading, user } = useAuth()
  if (authLoading) return <div className="py-10 text-center text-surface-500">Lade Sitzung...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  if (!user?.medicalLicense) return <Navigate to="/rettungsdienst" replace />
  return children
}

function RescueLicenseRoute({ children }) {
  const { isAuthenticated, needsOnboarding, authLoading, user } = useAuth()
  if (authLoading) return <div className="py-10 text-center text-surface-500">Lade Sitzung...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  if (!user?.rescueCertified) return <Navigate to="/hospital" replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth()
  if (authLoading) return children
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register-gate" element={<PublicRoute><RegisterGate /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/waitlist/confirm" element={<WaitlistConfirm />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
        <Route path="/rescue-station-choice" element={<RescueSetupRoute><RescueStationChoice /></RescueSetupRoute>} />
        <Route path="/rescue-station-create" element={<RescueSetupRoute><RescueStationCreate /></RescueSetupRoute>} />
        <Route path="/hospital-choice" element={<HospitalSetupRoute><HospitalChoice /></HospitalSetupRoute>} />
        <Route path="/hospital-create" element={<HospitalSetupRoute><HospitalCreate /></HospitalSetupRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/cases" element={<Navigate to="/hospital" replace />} />
        <Route path="/case/:id" element={<ProtectedRoute><PatientCase /></ProtectedRoute>} />
        <Route path="/hospital" element={<MedicalLicenseRoute><Hospital /></MedicalLicenseRoute>} />
        <Route path="/rettungsdienst" element={<RescueLicenseRoute><Rettungsdienst /></RescueLicenseRoute>} />
        <Route path="/courses" element={<AuthOnlyRoute><Courses /></AuthOnlyRoute>} />
        <Route path="/leaderboard" element={<AuthOnlyRoute><Leaderboard /></AuthOnlyRoute>} />
        <Route path="/shop" element={<AuthOnlyRoute><Shop /></AuthOnlyRoute>} />
        <Route path="/profile" element={<AuthOnlyRoute><Profile /></AuthOnlyRoute>} />
        <Route path="/settings" element={<AuthOnlyRoute><Settings /></AuthOnlyRoute>} />
        <Route path="/knowledge" element={<AuthOnlyRoute><Knowledge /></AuthOnlyRoute>} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/datenschutz" element={<Datenschutz />} />
        <Route path="/nutzungsbedingungen" element={<Nutzungsbedingungen />} />
        <Route path="/widerruf-digital" element={<WiderrufDigital />} />
        <Route path="/ai-hinweise" element={<AiHinweise />} />
        <Route path="/jugendschutz" element={<Jugendschutz />} />
        <Route path="/community-regeln" element={<CommunityRegeln />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
