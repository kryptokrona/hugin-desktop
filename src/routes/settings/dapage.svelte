<script>
import { goto } from '$app/navigation'
import { fade } from 'svelte/transition'
import SettingsList from '/src/routes/settings/SettingsList.svelte'

    const gotoPage = (name) => {
        console.log('Goto page', name)
        goto("/" + name)
    }

</script>
<main in:fade="{{ duration: 350 }}">
    
<SettingsList on:change={(e) => gotoPage(e.detail)}/>

<div class="right_side" in:fade="{{ duration: 350 }}" out:fade="{{ duration: 100 }}">
    <div class="fade"></div>
    <div class="outer" id="settings_window">
        <div class="inner">
            <slot/>
        </div>
    </div>
</div>

</main>

<style lang="scss">

main {
    display: flex;
    margin-left: 85px;
    margin-right: 0px;
    z-index: 3;
    height: 100vh;
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
padding-top: 20px;
width: 100%;
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