<!--
    This is an example component showing how to use the translation system.
-->

<script>
    import { t, getCurrentLanguage, setLanguage } from '../utils/translation.js';

    // Example of reactive translation usage
    let userName = $state('John');
    let messageCount = $state(5);

    // Example function to switch language
    const switchToSpanish = () => setLanguage('es');
    const switchToEnglish = () => setLanguage('en');
</script>

<div class="translation-example">
    <h3>Example: Using the Translation System</h3>

    <div class="current-language">
        <p>Current language: <strong>{getCurrentLanguage()}</strong></p>
    </div>

    <!-- Simple translation -->
    <div class="example">
        <h4>Simple translation:</h4>
        <p>{t('welcomeToHugin')}</p>
    </div>

    <!-- Translation with variables -->
    <div class="example">
        <h4>Translation with variables:</h4>
        <p>{t('tipSent', { amount: '100 XKR', receiver: userName })}</p>
    </div>

    <!-- Dynamic content -->
    <div class="example">
        <h4>Dynamic content:</h4>
        <p>{messageCount > 0 ? t('messages') : 'No messages'}</p>
    </div>

    <!-- Language switching buttons -->
    <div class="language-buttons">
        <h4>Try switching languages:</h4>
        <button onclick={switchToEnglish} class="cursor-pointer">
            Switch to English
        </button>
        <button onclick={switchToSpanish} class="cursor-pointer">
            Switch to Spanish
        </button>
    </div>

    <!-- Form inputs to test variables -->
    <div class="inputs">
        <h4>Test variables:</h4>
        <label>
            User name:
            <input bind:value={userName} placeholder="Enter name" />
        </label>
        <label>
            Message count:
            <input type="number" bind:value={messageCount} placeholder="Enter count" />
        </label>
    </div>
</div>

<style>
    .translation-example {
        padding: 1rem;
        border: 1px solid var(--border-color);
        border-radius: 0.5rem;
        background-color: var(--card-background);
        margin: 1rem 0;
    }

    .current-language {
        margin-bottom: 1rem;
        padding: 0.5rem;
        background-color: var(--border-color);
        border-radius: 0.25rem;
    }

    .example {
        margin-bottom: 1rem;
        padding: 0.5rem;
        border-left: 3px solid var(--accent-color, #007bff);
        background-color: var(--card-border);
    }

    .language-buttons {
        margin-bottom: 1rem;
    }

    .language-buttons button {
        margin-right: 0.5rem;
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color);
        background-color: var(--card-background);
        color: var(--text-color);
        border-radius: 0.25rem;
        transition: background-color 0.2s;
    }

    .language-buttons button:hover {
        background-color: var(--border-color);
    }

    .inputs {
        margin-bottom: 1rem;
    }

    .inputs label {
        display: block;
        margin-bottom: 0.5rem;
    }

    .inputs input {
        margin-left: 0.5rem;
        padding: 0.25rem;
        border: 1px solid var(--border-color);
        background-color: var(--card-background);
        color: var(--text-color);
        border-radius: 0.25rem;
    }

    h3, h4 {
        margin-top: 0;
        color: var(--title-color);
    }

    p {
        margin: 0.5rem 0;
        color: var(--text-color);
    }
</style>
