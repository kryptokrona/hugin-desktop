<script>
  import { createBubbler } from 'svelte/legacy';

  const bubble = createBubbler();
</script>

<svg onclick={bubble('click')} width="18px" height="18px" viewBox="0 0 24 24" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">
    <g id="vuesaxlinearmore">
      <g id="vuesaxlinearmore">
        <g id="more">
          <path d="M3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10C3.9 10 3 10.9 3 12Z" id="Vector" fill="none" fill-rule="evenodd" stroke="var(--text-color)" stroke-width="1.5" />
          <path d="M17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10C17.9 10 17 10.9 17 12Z" id="Vector" fill="none" fill-rule="evenodd" stroke="var(--text-color)" stroke-width="1.5" />
          <path d="M10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10C10.9 10 10 10.9 10 12Z" id="Vector" fill="none" fill-rule="evenodd" stroke="var(--text-color)" stroke-width="1.5" />
          <path d="M24 0L24 24L0 24L0 0L24 0Z" id="Vector" fill="none" fill-rule="evenodd" stroke="none" />
        </g>
      </g>
    </g>
  </svg>

<style lang="scss">

svg {
    cursor: pointer;

    &:hover {
        opacity: 80%;
    }
}

</style>
