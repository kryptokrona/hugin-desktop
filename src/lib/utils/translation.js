import { translationStore } from '../stores/translation.svelte.js';

/**
 * Translation helper function
 * @param {string} key - Translation key
 * @param {object} variables - Variables to replace in translation (optional)
 * @returns {string} Translated text or key if not found
 */
export function t(key, variables = {}) {
  return translationStore.t(key, variables);
}

/**
 * Get current language code
 * @returns {string} Current language code
 */
export function getCurrentLanguage() {
  return translationStore.currentLanguage;
}

/**
 * Get current language info (code and name)
 * @returns {object} Language object with code and name
 */
export function getCurrentLanguageInfo() {
  return translationStore.currentLanguageInfo;
}

/**
 * Check if translations are currently loading
 * @returns {boolean} Loading state
 */
export function isTranslationsLoading() {
  return translationStore.isLoading;
}

/**
 * Get all available languages
 * @returns {Array} Array of available language objects
 */
export function getAvailableLanguages() {
  return translationStore.availableLanguages;
}

/**
 * Change language
 * @param {string} languageCode - Language code to switch to
 * @returns {Promise} Promise that resolves when language is loaded
 */
export function setLanguage(languageCode) {
  return translationStore.setLanguage(languageCode);
}
