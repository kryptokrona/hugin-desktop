<script>
    import { onMount, onDestroy } from 'svelte';   
    import { notify } from "$lib/stores/user.js";
    import {fade, fly} from "svelte/transition";
    import {cubicOut , cubicIn} from "svelte/easing"
    import { createEventDispatcher } from 'svelte';
    import {get_avatar} from "$lib/utils/hugin-utils.js";

	const dispatch = createEventDispatcher();
    let timer
    export let error
	export let message;
    onMount(()=> 
    
	timer = setTimeout(function() {
        hideNotification(message.h)
   }, 5000)
)
    onDestroy(()=> {
        clearTimeout(timer)
        hideNotification()
    })

	function hideNotification(id) {
		dispatch('hide', {
			hash: message.h
		});
	}
    $: console.log('notifications', $notify)

  </script>
{#if !error}
<div on:click={hideNotification} in:fly="{{x: 200, duration:200, easing: cubicOut}}" out:fly="{{y: -200, duration: 200, easing: cubicIn}}" class="card">
    <div class="inner-card">
        <div class="header">
            <img class="avatar" src="data:image/png;base64,{get_avatar(message.k)}" alt="">
            <h4 class="name">{message.n}</h4><p>in {message.brd}</p>
        </div>
            <p class="message">{message.m}</p>
         <br>
    </div>
</div>
{:else if error}
<div on:click={hideNotification} in:fly="{{x: 200, duration:200, easing: cubicOut}}" out:fly="{{y: -200, duration: 200, easing: cubicIn}}" class="card">
    <div class="inner-card">
        <div class="header">
            <img class="avatar" src="data:image/png;base64,{get_avatar('SEKReU6UELRfBmKNUuo5mP58LVQcQqEKwZgfC7hMd5puRjMLJ5cJcLbFLkJCh6CpsB9WD2z4kqKWQGVABJxRAG5z9Hc1Esg1KV4')}" alt="">
            <h4 class="name">{message.n}</h4>
        </div>
            <p class="message">{message.m}</p>
         <br>
    </div>
</div>
{/if}

  <style>
      .card {
        display: flex;
        padding: 1px;
        height: 68px;
        width: 300px;
        flex-direction: column;
        box-sizing: border-box;
        border-radius: 5px;
        box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255,255,255, 0.1);
        z-index: 500;
    }

    .inner-card {
        justify-content: space-between;
        align-items: center;
        width: 100%;
        border-radius: 3px;
        background-color: #202020;
    }

    .avatar {
        height: 30px;
        width: 30px;
    }

    .name {
        font-size: 12px;
        display: flex;
        font-weight: bold;
        padding-right: 10px;
    }

    
    p {
        margin-top: 0px;
    font-size: 12px;
    display: contents;
    }

    h4 {
        margin: 0;
        color: rgba(255, 255, 255, 0.8);
        font-weight: normal;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis
    }

    .header {
        margin-left: 10px;
        padding-top: 5px;
        align-items: center;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .message {
        font-family: "Montserrat";
        font-size: 12px;
        display: inline-flex;
        margin-left: 44px;
    }


    
  </style>