<script>
    import { t } from '$lib/utils/translation.js';
    import { theme } from '$lib/stores/user.js';
    import { themes, generateMonochromaticColorTheme } from '$lib/theme/themes.js';
    import { fade } from 'svelte/transition';
    import { onMount } from 'svelte';
    import ColorPicker from 'svelte-awesome-color-picker';

    // State for current theme name and mode
    // We try to load from localStorage or default to 'aesir' and the current theme store value
    let currentThemeName = $state(localStorage.getItem('themeName') || 'aesir'); 
    let mode = $state($theme === 'light' ? 'light' : $theme === 'dark' ? 'dark' : 'color');
    let customColor = $state(localStorage.getItem('customThemeColor') || '');

    // Derived states for UI
    const isDark = $derived(mode === 'dark');
    const isLight = $derived(mode === 'light');
    const isColor = $derived(mode === 'color');

    // Function to apply the theme variables to the document
    function applyTheme(themeName, themeMode, accentOverride) {
        if (!themes[themeName]) return;
        
        let selectedTheme;
        if (themeMode === 'color') {
            // Generate dynamic theme from accent color
            // Use accentOverride or the default accent for the theme
            const accent = accentOverride || themes[themeName][themeMode].accent;
            selectedTheme = generateMonochromaticColorTheme(accent);
        } else {
            // Use preset as base and override primary if accentOverride is present
            selectedTheme = { ...themes[themeName][themeMode] };
            if (accentOverride) {
                selectedTheme.primary = accentOverride;
                // You could also dynamically adjust primaryForeground here if needed
            }
        }
        
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
        root.style.setProperty('--primary-color', selectedTheme.primary || selectedTheme.accent);
        root.style.setProperty('--primary-foreground-color', selectedTheme.primaryForeground || '#fff');

        // Text & Foreground
        root.style.setProperty('--text-color', selectedTheme.foreground);
        root.style.setProperty('--title-color', selectedTheme.foreground);

        // Inputs
        root.style.setProperty('--input-background', selectedTheme.input); 
        root.style.setProperty('--input-placeholder', 'var(--text-color)');
        root.style.setProperty('--input-border', themeMode === 'color' || themeMode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(90, 88, 88, 0.9)');

        // Status colors
        if (themeMode === 'color') {
            root.style.setProperty('--success-color', '#ffffff');
            root.style.setProperty('--warn-color', '#ffffff');
            root.style.setProperty('--info-color', '#ffffff');
            root.style.setProperty('--alert-color', '#ffffff');
        } else {
            root.style.setProperty('--success-color', selectedTheme.primary);
            root.style.setProperty('--warn-color', '#f25f61');
            root.style.setProperty('--info-color', selectedTheme.primary);
            root.style.setProperty('--alert-color', '#f2cb5f');
        }

        // Additional UI vars for full coverage
        root.style.setProperty('--logo-color', '#ffffff');
        root.style.setProperty('--backdrop-color', 'rgba(0, 0, 0, 0.5)');
        
        if (themeMode === 'color') {
            root.style.setProperty('--nav-backgound-color', selectedTheme.background);
            root.style.setProperty('--fade-color', selectedTheme.background);
            root.style.setProperty('--fade-to-color', 'transparent');
            root.classList.remove('light', 'dark');
            root.classList.add('blue');
        } else if (themeMode === 'light') {
            root.style.setProperty('--nav-backgound-color', 'rgba(224, 224, 224, 0.9)');
            root.style.setProperty('--fade-color', '#fdfdfd');
            root.style.setProperty('--fade-to-color', '#fdfdfd04');
            root.classList.remove('dark', 'blue');
            root.classList.add('light');
        } else {
            root.style.setProperty('--nav-backgound-color', 'rgba(32, 32, 32, 0.9)');
            root.style.setProperty('--fade-color', '#121212');
            root.style.setProperty('--fade-to-color', '#12121200');
            root.classList.remove('light', 'blue');
            root.classList.add('dark');
        }
    }

    // Effect to apply changes when state changes
    $effect(() => {
        applyTheme(currentThemeName, mode, customColor);
        // Sync with store
        if (mode === 'light' || mode === 'dark') {
             if ($theme !== mode) theme.set(mode);
        } else {
            if ($theme !== 'color') theme.set('color');
        }
        
        // Persist
        localStorage.setItem('themes', mode);
        localStorage.setItem('themeName', currentThemeName);
        if (customColor) {
            localStorage.setItem('customThemeColor', customColor);
        } else {
            localStorage.removeItem('customThemeColor');
        }
    });

    function setMode(newMode) {
        mode = newMode;
        // Reset color picker to the preset's color
        customColor = mode === 'color' ? themes[currentThemeName][mode].accent : themes[currentThemeName][mode].primary;
    }

    function setTheme(name) {
        currentThemeName = name;
        // Reset color picker to the preset's color
        customColor = mode === 'color' ? themes[currentThemeName][mode].accent : themes[currentThemeName][mode].primary;
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

        <div class="color-picker-container">
            <p>{t('customizeColor') || 'Customize Theme Color'}</p>
            <div class="picker">
                 <ColorPicker 
                    bind:hex={customColor} 
                    isAlpha={false}
                    --picker-z-index="100"
                    --cp-bg-color="var(--card-background)"
                    --cp-border-color="var(--border-color)"
                    --cp-text-color="var(--primary-foreground-color)"
                 />
                 <button class="reset-btn" onclick={() => customColor = mode === 'color' ? themes[currentThemeName][mode].accent : themes[currentThemeName][mode].primary}>
                    {t('resetColor') || 'Reset to Default'}
                 </button>
            </div>
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

    .color-picker-container {
        margin-bottom: 25px;
        padding: 15px;
        background: var(--card-background);
        border: 1px solid var(--border-color);
        border-radius: 8px;

        p {
            margin: 0 0 10px 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color);
        }

        .picker {
            display: flex;
            flex-direction: column;
            gap: 15px;
            align-items: center;
        }

        .reset-btn {
            padding: 8px 15px;
            background: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-color);
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            
            &:hover {
                background: var(--border-color);
            }
        }
    }
</style>
