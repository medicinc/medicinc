export const REQUIRED_APP_CONSENTS = ['tosAccepted', 'privacyAccepted', 'aiChatAccepted']

export function normalizeRegistrationConsents(raw) {
  return {
    tosAccepted: !!raw?.tosAccepted,
    privacyAccepted: !!raw?.privacyAccepted,
    aiChatAccepted: !!raw?.aiChatAccepted,
  }
}

export function hasAllRequiredRegistrationConsents(raw) {
  const c = normalizeRegistrationConsents(raw)
  return REQUIRED_APP_CONSENTS.every((key) => c[key] === true)
}
