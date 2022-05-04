<script>
    import { fade } from 'svelte/transition';
    import Balance from "/src/components/finance/Balance.svelte";
    import {user} from "$lib/stores/user.js";
    import {get_avatar} from "$lib/utils/hugin-utils.js";

    console.log('myAddress',$user.huginAddress);
    const myAddress = $user.huginAddress
    let address = myAddress.substring(0,99);
    let messageKey =  myAddress.substring(99,163);
    let avatar = get_avatar(address)
</script>

<main in:fade>
    <div class="top">
        <h1>Dashboard</h1>
        <Balance/>
    </div>

    <h1>Welcome back!</h1>

     <div id="profile">

       <h2>Profile</h2>
       <div class="inner">
          <div class="dashboard_avatar">
          <img class="avatar" src="data:image/png;base64,{avatar}" alt="avatar">
          </div>
       </div>
         <table style="width:100%">
           <br>
             <div id="headerText" class="inline">
               <div id="currentAddr" class="inline">

                 <span class="description">Payment address</span>&nbsp;
                 <br>
                 <span id="currentAddrSpan">{address}</span>
                 <br>

                 <span class="description">Message key</span>&nbsp;
                 <br>
                 <span id="currentPubKey">{messageKey}</span>

               </div>
               <button id="profile_copy_address">Copy both</button>

             </div>
         </table>

       </div>


</main>

<style>
    h1 {
        color: white;
        margin: 0
    }

    main {
        margin: 0 85px;
        z-index: 3;
    }

    .top {
        display: flex;
        justify-content: space-between;
        width: 100%;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding: 15px 20px 15px 20px;
        box-sizing: border-box;
    }

    h1 {
        font-weight: 400;
    }

    .huginAddress {

    }

</style>
