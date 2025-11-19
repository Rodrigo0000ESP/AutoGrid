// Consent management service - similar to authService
const CONSENT_KEY = 'autogrid_consent_accepted';
const CONSENT_DATE_KEY = 'autogrid_consent_date';

export const consentService = {
  // Check if user has given consent
  hasConsent(): boolean {
    if (typeof window === 'undefined') return false;
    
    const consentAccepted = localStorage.getItem(CONSENT_KEY);
    const consentDate = localStorage.getItem(CONSENT_DATE_KEY);
    
    if (!consentAccepted) {
      return false; // No consent given
    }
    
    if (consentDate) {
      // Check if consent was given more than 7 days ago
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const acceptedDate = parseInt(consentDate);
      
      if (acceptedDate < sevenDaysAgo) {
        return false; // Consent expired
      }
    }
    
    return true;
  },

  // Save consent acceptance
  saveConsent(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(CONSENT_KEY, 'true');
    localStorage.setItem(CONSENT_DATE_KEY, Date.now().toString());
  },

  clearConsent(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(CONSENT_DATE_KEY);
  },

  // Check if consent modal should be shown (after login)
  shouldShowConsentModal(): boolean {
    return !this.hasConsent();
  }
};
