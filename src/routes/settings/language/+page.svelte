<script>
    import { fade } from "svelte/transition";
    import { languages } from '$lib/translations/langs.js';
    import { setLanguage, getCurrentLanguage, t } from '$lib/utils/translation.js';

    let currentLanguage = $state(getCurrentLanguage()?.code || 'en');
    let isLoading = $state(false);

    // Update currentLanguage when it changes in the store
    $effect(() => {
        currentLanguage = getCurrentLanguage()?.code || 'en';
    });

    // Handle language change
    const changeLanguage = async (languageCode) => {
        if (languageCode === currentLanguage || isLoading) return;

        isLoading = true;
        try {
            await setLanguage(languageCode);
            currentLanguage = languageCode;
            // localStorage is handled by the translation store
        } catch (error) {
            console.error('Failed to change language:', error);
        } finally {
            isLoading = false;
        }
    };
</script>

<div class="container" in:fade|global>
    <h2>{t('languageSettings') || 'Language Settings'}</h2>
    <br>

    <div class="language-list">
        {#each languages as language}
            <button
                type="button"
                class="language-item"
                class:selected={language.code === currentLanguage}
                onclick={() => changeLanguage(language.code)}
                disabled={isLoading}
                aria-pressed={language.code === currentLanguage}
            >
                <span class="language-name">{language.name}</span>
            </button>
        {/each}
    </div>

    {#if isLoading}
        <div class="loading">
            <div class="spinner"></div>
            <span>{t('changingLanguage') || 'Changing language...'}</span>
        </div>
    {/if}
</div>

<style>
    .container {
        width: 600px;
        margin: 0 auto;
        color: var(--text-color);
    }

    .description {
        margin: 1rem 0 1.5rem 0;
        padding: 0.75rem 1rem;
        border: 1px solid var(--card-border);
        border-radius: 0.5rem;
        color: var(--text-color);
        font-size: 0.9rem;
        line-height: 1.4;
        word-break: break-word;
        overflow-wrap: break-word;
        min-height: 3rem;
        max-height: 4rem;
        overflow: hidden;
        display: flex;
        align-items: center;
    }

    .language-list {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        max-height: 400px;
        overflow-y: auto;
        border-radius: 0.5rem;
        background-color: var(--card-background);
        border: 1px solid var(--card-border);
        width: 100%;
        box-sizing: border-box;
    }

    .language-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        cursor: pointer;
        width: 100%;
        text-align: left;
        transition: background-color 0.2s ease;
        color: var(--text-color);
        min-height: 3rem;
        box-sizing: border-box;
    }

    .language-item:hover:not(.selected):not(:disabled) {
        background-color: var(--card-border);
    }

    .language-item.selected {
        background-color: var(--success-color);
        color: white;
    }

    .language-item:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        color: var(--text-color);
    }

    .language-name {
        font-weight: 500;
        color: inherit;
    }

    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 1.5rem;
        padding: 1rem;
        background-color: var(--card-background);
        border: 1px solid var(--card-border);
        border-radius: 0.5rem;
        color: var(--text-color);
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--card-border);
        border-top: 2px solid var(--accent-color, #007bff);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Scrollbar styling */
    .language-list::-webkit-scrollbar {
        width: 6px;
    }

    .language-list::-webkit-scrollbar-track {
        background: var(--card-background);
    }

    .language-list::-webkit-scrollbar-thumb {
        background: var(--card-border);
        border-radius: 3px;
    }

    .language-list::-webkit-scrollbar-thumb:hover {
        background: var(--text-secondary, #888);
    }

    /* Responsive design for smaller screens */
    @media (max-width: 640px) {
        .container {
            width: 95%;
            max-width: none;
        }
    }

    /* Dark mode compatibility */
    @media (prefers-color-scheme: dark) {
        .description,
        .language-item,
        .loading {
            color: var(--text-color);
        }
    }
</style>
