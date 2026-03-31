import { EQUIPMENT_ACTIONS } from '../../data/roomFunctions'
import { Activity, Zap, Clock } from 'lucide-react'

export default function GenericEquipmentUI({ equipment, patient, onAction, savedState, onSaveState }) {
  const eqActions = EQUIPMENT_ACTIONS[equipment.id]

  return (
    <div className="p-4">
      <div className="bg-surface-50 rounded-xl p-4 mb-4 text-center">
        <Activity className="w-10 h-10 text-surface-300 mx-auto mb-2" />
        <p className="font-medium text-surface-700">{equipment.name}</p>
        <p className="text-sm text-surface-500 mt-1">{equipment.description}</p>
      </div>

      {eqActions ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Verfügbare Aktionen</p>
          {eqActions.actions.map(action => (
            <button
              key={action.id}
              onClick={() => onAction?.(action.id, action.name, action.duration, action.xpReward)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-surface-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900">{action.name}</p>
                <p className="text-xs text-surface-500">{action.description}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs text-surface-400">
                  <Clock className="w-3 h-3" />
                  <span>{action.duration}s</span>
                </div>
                <span className="text-xs text-primary-600 font-medium">+{action.xpReward} XP</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-surface-400">Keine interaktiven Funktionen verfügbar</p>
          <p className="text-xs text-surface-300 mt-1">Dieses Gerät arbeitet passiv</p>
        </div>
      )}
    </div>
  )
}
