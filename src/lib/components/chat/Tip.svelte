<script>
    import { onMount } from 'svelte';
    import { tweened } from 'svelte/motion';
    import { cubicOut, linear } from 'svelte/easing';
    import { prettyNumbers } from '$lib/utils/utils'

    export let tip;
  
    let rotation = tweened(0, {
      duration: 600,
      easing: linear,
    });
  
    let rotateX = '80deg';
    let opacity = 0;
  
    onMount(() => {
      rotation.set(1); // Start animation
    });
  
    $: {
      rotateX = `${80 - 80 * $rotation}deg`; // Interpolate rotation
      opacity = $rotation; // Interpolate opacity
    }
  </script>
  
  <style>
    .cardContainer {
        border-radius: 12px;
        width: fit-content;
        opacity: 0;
        padding: 5px;
        margin: 0px;
        margin-left: 25px;
    }
  
    .insetBorder {
        flex: 1;
        border-radius: 8px;
        border-width: 1px;
        border: 1px solid black;
        padding: 0px;
        border-color: var(--backgound-color);
    }

    p {
        color: black;
        font-family: Montserrat;
        font-size: 15px;
        padding-right: 10px;
        padding-left: 10px;
    }
  </style>
  
  <div
    class="cardContainer"
    style="
      background-color: #f5f5f5;
      transform: rotateX({rotateX});
      opacity: {opacity};
    "
  >
    <div class="insetBorder">
      <p style="color: black; font-family: Montserrat">
        Sent {prettyNumbers(tip.amount)} to {tip.receiver}! 💸
      </p>
    </div>
  </div>