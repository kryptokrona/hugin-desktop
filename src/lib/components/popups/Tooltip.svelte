<script>
  /** @type {{title?: string, leftAlign?: boolean, children?: import('svelte').Snippet}} */
  let { title = '', leftAlign = false, children } = $props();

    let isHovered = $state(false);
    let x = $state();
    let y = $state();
  
    function mouseOver(event) {
      isHovered = true;
      x = leftAlign ? event.pageX-120 : event.pageX + 5;
      y = event.pageY + 5;
    }
    function mouseMove(event) {
      x = leftAlign ? event.pageX-120 : event.pageX + 5;
      y = event.pageY + 5;
    }
    function mouseLeave() {
      isHovered = false;
    }
  </script>
  
  <div style="display: inline-block" onmouseover={mouseOver} onmouseleave={mouseLeave} onmousemove={mouseMove}>
    {@render children?.()}
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
  