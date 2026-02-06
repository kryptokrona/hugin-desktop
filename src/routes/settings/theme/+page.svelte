<script>
    import { t } from '$lib/utils/translation.js';
    import { theme } from '$lib/stores/user.js';
    import { themes } from '$lib/theme/themes.js';
    import { fade } from 'svelte/transition';
    import { onMount } from 'svelte';

    // State for current theme name and mode
    // We try to load from localStorage or default to 'aesir' and the current theme store value
    let currentThemeName = $state(localStorage.getItem('themeName') || 'aesir'); 
    let mode = $state($theme === 'light' ? 'light' : $theme === 'dark' ? 'dark' : 'color');

    // Derived states for UI
    const isDark = $derived(mode === 'dark');
    const isLight = $derived(mode === 'light');
    const isColor = $derived(mode === 'color');

    // Function to apply the theme variables to the document
    function applyTheme(themeName, themeMode) {
        if (!themes[themeName]) return;
        
        const selectedTheme = themes[themeName][themeMode];
        const root = document.documentElement;

        // Map the theme colors to the desktop CSS variables
        // Desktop vars: --primary-color, --card-background, --backgound-color, --background-color, --border-color, --text-color, --title-color
        
        // Backgrounds
        root.style.setProperty('--backgound-color', selectedTheme.background);
        root.style.setProperty('--background-color', selectedTheme.background);
        root.style.setProperty('--card-background', selectedTheme.card);
        
        // Borders
        root.style.setProperty('--border-color', selectedTheme.border);
        root.style.setProperty('--card-border', selectedTheme.border);

        // Primary
        root.style.setProperty('--primary-color', selectedTheme.primary);
        // Primary foreground for button text contrast
        root.style.setProperty('--primary-foreground-color', selectedTheme.primaryForeground || '#fff');

        // Text & Foreground
        root.style.setProperty('--text-color', selectedTheme.foreground);
        root.style.setProperty('--title-color', selectedTheme.foreground);

        // Inputs
        root.style.setProperty('--input-background', selectedTheme.input); 
        // Set placeholder color - for color mode, use lighter text
        if (themeMode === 'color') {
            root.style.setProperty('--input-placeholder', selectedTheme.foreground || '#fff');
        } else {
            // Restore default placeholder colors for dark/light
            root.style.setProperty('--input-placeholder', themeMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(88, 99, 99, 0.4)');
        }

        // Status colors - for color mode, use light versions that work on colored backgrounds
        if (themeMode === 'color') {
            root.style.setProperty('--success-color', selectedTheme.foreground || '#fff');
            root.style.setProperty('--warn-color', selectedTheme.foreground || '#fff');
            root.style.setProperty('--info-color', selectedTheme.foreground || '#fff');
        } else {
            // Restore defaults for dark/light
            root.style.setProperty('--success-color', '#5a8bdb');
            root.style.setProperty('--warn-color', '#f25f61');
            root.style.setProperty('--info-color', '#5f86f2');
        }

        // Update class for CSS overrides
        if (themeMode === 'light') {
            root.classList.remove('dark', 'blue');
            root.classList.add('light');
        } else if (themeMode === 'dark') {
            root.classList.remove('light', 'blue');
            root.classList.add('dark');
        } else {
             root.classList.remove('light', 'dark');
             root.classList.add('blue');
        }
    }

    // Effect to apply changes when state changes
    $effect(() => {
        applyTheme(currentThemeName, mode);
        // Sync with store
        if (mode === 'light' || mode === 'dark') {
             // Only update the simple store if it matches supported values, or maybe we update it anyway?
             // user.js store initializes from localStorage 'themes'.
             if ($theme !== mode) theme.set(mode);
        } else {
            // For 'color' mode, we might need to decide what to put in the store. 
            // The store logic in LeftMenu was simple string toggle.
            if ($theme !== 'color') theme.set('color');
        }
        
        // Persist
        localStorage.setItem('themes', mode);
        localStorage.setItem('themeName', currentThemeName);
    });

    function setMode(newMode) {
        mode = newMode;
    }

    function setTheme(name) {
        currentThemeName = name;
    }

</script>

<div class="settings-content" in:fade|global>
    <div class="header">
        <h2>{t('theme') || 'Theme'}</h2>
    </div>

    <div class="controls">
        <div class="buttons-row">
            <button class:active={isDark} onclick={() => setMode('dark')}>
                {t('themeDark') || 'Dark'}
            </button>
            <button class:active={isLight} onclick={() => setMode('light')}>
                {t('themeLight') || 'Light'}
            </button>
            <button class:active={isColor} onclick={() => setMode('color')}>
                {t('themeColor') || 'Color'}
            </button>
        </div>

        <div class="themes-grid">
            {#each Object.keys(themes) as item}
                {@const mTheme = themes[item]}
                {@const active = currentThemeName === item}
                {@const colors = mTheme[mode]}
                {@const borderColor = active ? colors.primary : colors.border}

                <div class="theme-item" style="width: 30%;">
                     <button 
                        class="color-container" 
                        style="border-color: {borderColor}; border-width: {active ? '2px' : '1px'}"
                        onclick={() => setTheme(item)}
                     >
                        <div class="colors-preview">
                            <div class="color-box" style="background-color: {colors.primary}; border-color: {colors.border}"></div>
                            <div class="spacer"></div>
                            <div class="color-box" style="background-color: {colors.card}; border-color: {colors.border}"></div>
                        </div>
                        <span class="theme-name">{item}</span>
                     </button>
                </div>
            {/each}
        </div>
    </div>
</div>

<style lang="scss">
    .settings-content {
        width: 100%;
        height: 100%;
        padding: 20px;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }

    .header {
        margin-bottom: 20px;
        h2 {
            margin: 0;
            color: var(--title-color);
            font-family: 'Montserrat';
            font-weight: bold;
            font-size: 22px;
        }
    }

    .buttons-row {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        
        button {
            flex: 1;
            padding: 10px;
            background: var(--card-background);
            border: 1px solid var(--border-color);
            color: var(--text-color);
            border-radius: 5px;
            cursor: pointer;
            font-family: 'Montserrat';
            transition: all 0.2s;

            &:hover {
                background: var(--border-color);
            }

            &.active {
                background: var(--primary-color);
                border-color: var(--primary-color);
                color: var(--primary-foreground-color, #fff);
            }
        }
    }

    .themes-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    .theme-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex-grow: 1;
        min-width: 80px;
        max-width: 32%;
    }

    .color-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        padding: 10px;
        background: transparent;
        border-style: solid;
        border-radius: 5px;
        cursor: pointer;
        transition: transform 0.1s;

        &:active {
            transform: scale(0.98);
        }
    }

    .colors-preview {
        display: flex;
        flex-direction: row;
        margin-bottom: 10px;
    }

    .color-box {
        width: 26px;
        height: 26px;
        border-radius: 5px;
        border-width: 0.75px;
        border-style: solid;
    }

    .spacer {
        width: 10px;
    }

    .theme-name {
        text-transform: capitalize;
        color: var(--text-color);
        font-size: 12px;
        font-family: 'Montserrat';
    }
</style>
