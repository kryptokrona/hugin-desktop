<script>
    import { fade, slide } from "svelte/transition"
    import Button from "$lib/components/buttons/Button.svelte"
    import { sleep, formatBytes } from "$lib/utils/utils"
    import { user, rooms, misc, swarm } from '$lib/stores/user.js'
    import { t } from '$lib/utils/translation.js'
    import { peers } from '$lib/stores/swarm-state.svelte.js'
    import { onMount } from 'svelte'

    let loading = $state(false)
    let path = $state("")
    let stats = $state(null)
    let loadingStats = $state(true)
    let expandedRoom = $state(null)
    let confirmPurgeAll = $state(false)
    let confirmPurgeRoom = $state(null)
    let confirmDeleteFile = $state(null)
    let limitInput = $state("")
    let savingLimit = $state(false)

    const LIMIT_OPTIONS = [
        { label: '500 MB', value: 500 * 1024 * 1024 },
        { label: '1 GB', value: 1024 * 1024 * 1024 },
        { label: '2 GB', value: 2 * 1024 * 1024 * 1024 },
        { label: '5 GB', value: 5 * 1024 * 1024 * 1024 },
        { label: '10 GB', value: 10 * 1024 * 1024 * 1024 },
        { label: '50 GB', value: 50 * 1024 * 1024 * 1024 },
        { label: '100 GB', value: 100 * 1024 * 1024 * 1024 },
    ]

    function getRoomName(room) {
        if (room.name) return room.name
        const sw = peers.swarms.find(s => s.topic === room.topic)
        if (sw) {
            const r = $rooms.roomArray.find(r => r.key === sw.key)
            if (r?.name) return r.name
            const chatAddr = sw.chat?.substring(0, 99)
            const contact = $user.contacts?.find(c => c.address === chatAddr)
            if (contact?.name) return contact.name
        }
        return room.topic.slice(0, 12) + '…'
    }

    function isDM(room) {
        if (room.isDM) return true
        const sw = peers.swarms.find(s => s.topic === room.topic)
        return sw?.beam || false
    }

    function isAutoSync(topic) {
        return $misc.syncImages?.some(a => a === topic) ?? false
    }

    function toggleAutoSync(topic) {
        if (isAutoSync(topic)) {
            $misc.syncImages = $misc.syncImages.filter(a => a !== topic)
            window.api.errorMessage(t('imageSyncingDeactivated'))
        } else {
            $misc.syncImages = [...($misc.syncImages || []), topic]
            window.api.successMessage(t('activatedImageSyncing'))
        }
        $misc = $misc
        window.api.send('sync-images', $misc.syncImages)
    }

    async function loadStats() {
        loadingStats = true
        try {
            stats = await window.api.getStorageStats()
            limitInput = stats.limit
        } catch (e) {
            console.error('Failed to load storage stats', e)
        }
        loadingStats = false
    }

    onMount(() => { loadStats() })

    const openDirectoryDialog = async () => {
        let dir = await window.api.getDirectoryPath();
        path = dir.filePaths ? dir.filePaths[0] : "";
    }

    const changeDownloadPath = async () => {
        if (path.length === 0) return
        loading = true
        window.api.changeDowndloadDir(path)
        $user.downloadPath = path
        await sleep(200)
        loading = false
        window.api.successMessage(t('downloadDirectoryChanged') || 'Download directory changed')
    }

    async function saveLimit(bytes) {
        savingLimit = true
        try {
            await window.api.setStorageLimit(bytes)
            limitInput = bytes
            window.api.successMessage(t('storageLimitUpdated') || 'Storage limit updated')
            await loadStats()
        } catch (e) {
            console.error(e)
        }
        savingLimit = false
    }

    async function purgeAll() {
        confirmPurgeAll = false
        loadingStats = true
        try {
            await window.api.purgeAllFiles()
            window.api.successMessage(t('allFilesPurged') || 'All files purged')
            await loadStats()
        } catch (e) {
            console.error(e)
        }
        loadingStats = false
    }

    async function purgeRoom(topic) {
        confirmPurgeRoom = null
        loadingStats = true
        try {
            await window.api.purgeRoomFiles(topic)
            window.api.successMessage(t('roomPurged') || 'Room files purged')
            expandedRoom = null
            await loadStats()
        } catch (e) {
            console.error(e)
        }
        loadingStats = false
    }

    async function deleteFile(hash, topic) {
        confirmDeleteFile = null
        try {
            await window.api.deleteStoredFile(hash, topic)
            window.api.successMessage(t('fileDeleted') || 'File deleted')
            await loadStats()
        } catch (e) {
            console.error(e)
        }
    }

    function formatTime(ts) {
        if (!ts) return '—'
        return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    }
</script>

<h2>{t('files') || 'Files'}</h2>
<div class="settings" in:fade|global>

    <!-- Download directory -->
    <section class="section">
        <h3>{t('changeDownloadDirectory') || 'Change download directory'}</h3>
        <p class="muted">{$user.downloadPath}</p>
        <div class="row">
            <input spellcheck="false" type="text" placeholder={t('enterNewDirectoryPath') || 'Enter new directory path'} bind:value="{path}"/>
            <Button
                text={t('browse') || 'Browse'}
                disabled={false}
                on:click={openDirectoryDialog}
            />
        </div>
        <div class="row" style="margin-top: 0.5rem;">
            <Button
                text={t('save') || 'Save'}
                loading={loading}
                disabled={false}
                on:click={changeDownloadPath}
            />
        </div>
    </section>

    <!-- Storage overview -->
    <section class="section">
        <h3>{t('storageManagement') || 'Storage Management'}</h3>

        {#if loadingStats}
            <p class="muted">{t('loading') || 'Loading'}...</p>
        {:else if stats}
            <div class="stat-row">
                <span class="stat-label">{t('storageUsed') || 'Storage used'}</span>
                <span class="stat-value">{formatBytes(stats.totalSize)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">{t('totalFiles') || 'Total files'}</span>
                <span class="stat-value">{stats.totalFiles}</span>
            </div>

            <div class="limit-section">
                <span class="stat-label">{t('storageLimit') || 'Storage limit'}</span>
                <div class="limit-chips">
                    {#each LIMIT_OPTIONS as opt}
                        <button
                            class="chip cursor-pointer"
                            class:active={limitInput === opt.value}
                            onclick={() => saveLimit(opt.value)}
                            disabled={savingLimit}
                        >{opt.label}</button>
                    {/each}
                </div>
            </div>

            <div class="danger-zone">
                {#if confirmPurgeAll}
                    <p class="warn">{t('confirmPurge') || 'Are you sure? This cannot be undone.'}</p>
                    <div class="row">
                        <Button text={t('confirm') || 'Confirm'} red={true} disabled={false} on:click={purgeAll} />
                        <Button text={t('cancel') || 'Cancel'} disabled={false} on:click={() => confirmPurgeAll = false} />
                    </div>
                {:else}
                    <Button text={t('purgeAll') || 'Purge all files'} red={true} disabled={false} on:click={() => confirmPurgeAll = true} />
                {/if}
            </div>
        {/if}
    </section>

    <!-- Per-room list -->
    {#if stats?.rooms?.length}
        <section class="section">
            <h3>{t('files') || 'Files'}</h3>
            {#each stats.rooms as room (room.topic)}
                <div class="room-card" transition:fade|global>
                    <div class="room-header cursor-pointer" role="button" tabindex="0" onclick={() => expandedRoom = expandedRoom === room.topic ? null : room.topic} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') expandedRoom = expandedRoom === room.topic ? null : room.topic }}>
                        <div class="room-info">
                            <span class="room-name">{#if isDM(room)}<strong>DM</strong> — {/if}{getRoomName(room)}</span>
                            <span class="room-meta">{room.fileCount} {t('files') || 'files'} · {formatBytes(room.size)}</span>
                        </div>
                        <span class="chevron" class:open={expandedRoom === room.topic}>▸</span>
                    </div>

                    <div class="room-actions">
                        <label class="toggle-label cursor-pointer">
                            <input type="checkbox" checked={isAutoSync(room.topic)} onchange={() => toggleAutoSync(room.topic)} />
                            <span>{t('autoSync') || 'Auto-sync'}</span>
                        </label>

                        {#if confirmPurgeRoom === room.topic}
                            <div class="inline-confirm" transition:slide|local>
                                <span class="warn-small">{t('confirmPurge') || 'Are you sure?'}</span>
                                <button class="btn-sm btn-red cursor-pointer" onclick={() => purgeRoom(room.topic)}>{t('confirm') || 'Confirm'}</button>
                                <button class="btn-sm cursor-pointer" onclick={() => confirmPurgeRoom = null}>{t('cancel') || 'Cancel'}</button>
                            </div>
                        {:else}
                            <button class="btn-sm btn-red cursor-pointer" onclick={() => confirmPurgeRoom = room.topic}>{t('purgeRoom') || 'Purge'}</button>
                        {/if}
                    </div>

                    {#if expandedRoom === room.topic}
                        <div class="file-list" transition:slide|local>
                            {#if room.files.length === 0}
                                <p class="muted">{t('noFiles') || 'No files'}</p>
                            {:else}
                                {#each room.files as file (file.hash)}
                                    <div class="file-row">
                                        <div class="file-info">
                                            <span class="file-name" title={file.fileName}>{file.fileName}</span>
                                            <span class="file-meta">
                                                {formatBytes(file.size)} · {formatTime(file.time)}
                                                {#if file.savedToDisk}
                                                    <span class="badge">{t('savedToDisk') || 'Saved'}</span>
                                                {/if}
                                            </span>
                                        </div>
                                        {#if confirmDeleteFile === file.hash}
                                            <div class="inline-confirm">
                                                <button class="btn-sm btn-red cursor-pointer" onclick={() => deleteFile(file.hash, room.topic)}>{t('confirm') || 'Yes'}</button>
                                                <button class="btn-sm cursor-pointer" onclick={() => confirmDeleteFile = null}>{t('cancel') || 'No'}</button>
                                            </div>
                                        {:else}
                                            <button class="btn-sm btn-red cursor-pointer" onclick={() => confirmDeleteFile = file.hash} title={t('deleteFile') || 'Delete'}>✕</button>
                                        {/if}
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
        </section>
    {/if}
</div>

<style>
    .settings {
        margin-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        font-size: 14px;
        max-width: 520px;
        padding-bottom: 2rem;
        overflow-y: auto;
        overflow-x: hidden;
        --scrollbarBG: transparent;
        --thumbBG: #3337;
        scrollbar-width: thin;
        scrollbar-color: var(--thumbBG) var(--scrollbarBG);
    }

    .settings::-webkit-scrollbar {
        width: 8px;
    }

    .settings::-webkit-scrollbar-track {
        background: var(--scrollbarBG);
    }

    .settings::-webkit-scrollbar-thumb {
        background-color: var(--thumbBG);
        border-radius: 3px;
        border: 3px solid var(--scrollbarBG);
    }

    .section {
        background: var(--card-background);
        border: 1px solid var(--card-border);
        border-radius: 10px;
        padding: 1.25rem;
    }

    h3 {
        margin: 0 0 0.75rem 0;
        font-size: 15px;
        font-family: 'Montserrat';
        color: var(--title-color);
    }

    .muted {
        color: var(--text-color);
        opacity: 0.6;
        font-size: 13px;
        margin: 0 0 0.5rem 0;
    }

    .row {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        flex-wrap: wrap;
    }

    input[type="text"] {
        max-width: 300px;
        width: 100%;
        height: 40px;
        padding: 0 12px;
        border-radius: 0.5rem;
        background-color: var(--card-background);
        border: 1px solid var(--card-border);
        color: var(--text-color);
        font-size: 13px;
        transition: 200ms ease-in-out;
    }

    /* Stats */
    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.35rem 0;
    }

    .stat-label {
        color: var(--text-color);
        opacity: 0.7;
        font-size: 13px;
    }

    .stat-value {
        font-weight: 600;
        color: var(--title-color);
        font-size: 13px;
    }

    /* Limit chips */
    .limit-section {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--card-border);
    }

    .limit-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-top: 0.5rem;
    }

    .chip {
        padding: 5px 12px;
        border-radius: 20px;
        border: 1px solid var(--border-color);
        background: transparent;
        color: var(--text-color);
        font-size: 12px;
        font-family: 'Montserrat';
        transition: 200ms ease-in-out;
    }

    .chip:hover {
        border-color: var(--success-color);
        color: var(--title-color);
    }

    .chip.active {
        background: var(--success-color);
        border-color: var(--success-color);
        color: white;
    }

    /* Danger zone */
    .danger-zone {
        margin-top: 1rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--card-border);
    }

    .warn {
        color: #c34169;
        font-size: 13px;
        margin: 0 0 0.5rem 0;
    }

    .warn-small {
        color: #c34169;
        font-size: 12px;
    }

    /* Room cards */
    .room-card {
        border: 1px solid var(--card-border);
        border-radius: 8px;
        margin-bottom: 0.5rem;
        overflow: hidden;
    }

    .room-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        transition: 150ms ease-in-out;
    }

    .room-header:hover {
        background: rgba(255,255,255,0.03);
    }

    .room-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .room-name {
        font-weight: 600;
        color: var(--title-color);
        font-size: 14px;
    }

    .room-meta {
        font-size: 12px;
        color: var(--text-color);
        opacity: 0.6;
    }

    .chevron {
        transition: transform 200ms ease;
        color: var(--text-color);
        opacity: 0.5;
        font-size: 16px;
    }

    .chevron.open {
        transform: rotate(90deg);
    }

    .room-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.4rem 1rem 0.6rem;
        border-top: 1px solid var(--card-border);
    }

    /* Toggle */
    .toggle-label {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 13px;
        color: var(--text-color);
    }

    .toggle-label input[type="checkbox"] {
        accent-color: var(--success-color);
        width: 16px;
        height: 16px;
        cursor: pointer;
    }

    /* Small buttons */
    .btn-sm {
        padding: 4px 10px;
        border-radius: 4px;
        border: 1px solid var(--border-color);
        background: transparent;
        color: var(--text-color);
        font-size: 12px;
        font-family: 'Montserrat';
        transition: 150ms ease-in-out;
    }

    .btn-sm:hover {
        opacity: 0.8;
    }

    .btn-red {
        border-color: #c34169;
        color: #c34169;
    }

    .btn-red:hover {
        background: #ce3264;
        color: white;
    }

    .inline-confirm {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    /* File list */
    .file-list {
        padding: 0 1rem 0.75rem;
        max-height: 300px;
        overflow-y: auto;
    }

    .file-list::-webkit-scrollbar {
        width: 4px;
    }

    .file-list::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 2px;
    }

    .file-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.4rem 0;
        border-bottom: 1px solid rgba(255,255,255,0.04);
    }

    .file-row:last-child {
        border-bottom: none;
    }

    .file-info {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
        flex: 1;
    }

    .file-name {
        color: var(--title-color);
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 320px;
    }

    .file-meta {
        font-size: 11px;
        color: var(--text-color);
        opacity: 0.5;
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .badge {
        background: var(--success-color);
        color: white;
        padding: 1px 6px;
        border-radius: 8px;
        font-size: 10px;
    }

    .cursor-pointer {
        cursor: pointer;
    }
</style>
