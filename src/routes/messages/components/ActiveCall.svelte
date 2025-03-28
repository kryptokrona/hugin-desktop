<script>
    import { fly } from "svelte/transition";
</script>
<div in:fly|global="{{ y: -50 }}" out:fly|global="{{ y: -50 }}" class="top" style="">
    <div class="bar" style="display: flex; padding-bottom: 10px">
        <h3>Call active</h3>
    <div style="display: inline-block; margin-left: auto">
   
    </div>
    </div>
</div>

<style lang="scss">
.top {
    position: absolute; 
    top: 0; 
    left: 0;
    width: 100%; 
    padding: 15px; 
    border-bottom: 1px solid var(--border-color); 
    height: 57px;
    z-index: 99;
    background-color: var(--success-color);
    opacity: 0.8;
}

.bar {
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
}
</style>