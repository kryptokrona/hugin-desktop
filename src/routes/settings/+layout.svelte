<script>
    import { goto } from '$app/navigation'
    import { fade } from 'svelte/transition'
    import SettingsList from '/src/routes/settings/SettingsList.svelte'
    
        const gotoPage = async (route) => {
            await goto(route)
        }
    
    </script>
    <div class="wrap">
        
    <SettingsList on:changeCategory={(e) => gotoPage(e.detail)}/>
    
    <div class="right_side" in:fade="{{ duration: 350 }}" out:fade="{{ duration: 100 }}">
        <div class="fade"></div>
        <div class="outer" id="settings_window">
            <div class="inner">
                <slot/>
            </div>
        </div>
    </div>
    
</div>
    
    <style lang="scss">
    
    .wrap {
        display: flex;
        margin-left: 85px;
        margin-right: 0px;
        z-index: 3;
        height: 100vh;
        width: 100%;
    }
    
    .right_side {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    position: relative;
    width: 100%;
    margin-right: 85px;
    }
    
    .inner {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    padding: 10%;
    margin-left: -1.5%
    }
    
    .outer {
    display: flex;
    flex-direction: column-reverse;
    overflow: scroll;
    
    &::-webkit-scrollbar {
        display: none;
    }
    }
    
    .fade {
    position: absolute;
    top: 0;
    width: 100%;
    height: 40px;
    background: linear-gradient(180deg, #121212, #12121200);
    z-index: 100;
    }
    
    </style>