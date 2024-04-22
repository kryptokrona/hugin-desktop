<script>
    export let title = '';
    export let leftAlign = false;

    let isHovered = false;
    let x;
    let y;
  
    function mouseOver(event) {
      isHovered = true;
      x = leftAlign ? -45 : event.pageX + 5;
      y = event.pageY + 5;
    }
    function mouseMove(event) {
      x = leftAlign ? -45 : event.pageX + 5;
      y = event.pageY + 5;
    }
    function mouseLeave() {
      isHovered = false;
    }
  </script>
  
  <div on:mouseover={mouseOver} on:mouseleave={mouseLeave} on:mousemove={mouseMove}>
    <slot />
  </div>
  
  {#if isHovered}
    <div style="top: {y}px; left: {x}px;" class='tooltip'>{title}</div>
  {/if}
  
  <style>
    .tooltip {
      z-index: 999;
      border-radius: 4px;
      padding: 6px;
      position: absolute;
      border: 1px solid var(--text-color);
      color: var(--text-color);
      background-color: var(--backgound-color);
      font-family: "Montserrat";
      font-size: 14px;
    }
  </style>
  