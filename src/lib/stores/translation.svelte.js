import { languages } from '../translations/langs.js';

// Default language
const DEFAULT_LANGUAGE = 'en';

// Reactive state for current language and translations
let currentLanguage = $state(DEFAULT_LANGUAGE);
let translations = $state({});
let isLoading = $state(false);

// Cache for loaded translations
const translationCache = new Map();

// Dynamic imports for translations
async function loadTranslations(languageCode) {
  if (isLoading) return;

  isLoading = true;

  try {
    // Check cache first
    if (translationCache.has(languageCode)) {
      translations = translationCache.get(languageCode);
      currentLanguage = languageCode;
      return;
    }

    // Dynamic import of translation file
    const translationModule = await import(`../translations/${languageCode}.json`);
    const data = translationModule.default;

    translations = data;
    translationCache.set(languageCode, data);
    currentLanguage = languageCode;

    // Store language preference in localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hugin-language', languageCode);
    }
  } catch (error) {
    console.error('Error loading translations:', error);
    // Fallback to English if language fails to load
    if (languageCode !== DEFAULT_LANGUAGE) {
      await loadTranslations(DEFAULT_LANGUAGE);
    }
  } finally {
    isLoading = false;
  }
}

// Get translation by key with fallback support
function t(key, variables = {}) {
  const translation = translations[key];

  if (!translation) {
    console.warn(`Translation key "${key}" not found for language "${currentLanguage}"`);
    return key; // Return key as fallback
  }

  // Replace variables in translation
  let result = translation;
  for (const [variable, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${variable}}}`, 'g'), value);
  }

  return result;
}

// Get current language info
function getCurrentLanguage() {
  return languages.find(lang => lang.code === currentLanguage) || languages.find(lang => lang.code === DEFAULT_LANGUAGE);
}

// Get all available languages
function getAvailableLanguages() {
  return languages;
}

// Initialize with stored language or default
function initialize() {
  const storedLanguage = typeof localStorage !== 'undefined'
    ? localStorage.getItem('hugin-language')
    : null;

  const languageToLoad = storedLanguage && languages.some(lang => lang.code === storedLanguage)
    ? storedLanguage
    : DEFAULT_LANGUAGE;

  loadTranslations(languageToLoad);
}

// Export reactive state and functions
export const translationStore = {
  get currentLanguage() { return currentLanguage; },
  get translations() { return translations; },
  get isLoading() { return isLoading; },
  get currentLanguageInfo() { return getCurrentLanguage(); },
  get availableLanguages() { return getAvailableLanguages(); },

  // Methods
  loadTranslations,
  t,
  setLanguage: loadTranslations,
  initialize
};

// Initialize on import
initialize();
