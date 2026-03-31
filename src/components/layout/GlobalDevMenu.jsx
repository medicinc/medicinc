import { useNavigate } from 'react-router-dom'
import { Terminal } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function GlobalDevMenu() {
  const navigate = useNavigate()
  const { user } = useAuth()

  if (!user || user.role !== 'admin') return null

  const openHospitalDev = () => {
    try {
      localStorage.setItem('medisim_open_hospital_dev', '1')
    } catch (_err) {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('medisim:openHospitalDevMenu'))
    navigate('/hospital')
  }

  return (
    <button
      onClick={openHospitalDev}
      className="fixed bottom-6 left-6 z-[90] w-12 h-12 rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 flex items-center justify-center"
      title="Original Dev-Menü öffnen"
    >
      <Terminal className="w-5 h-5" />
    </button>
  )
}

