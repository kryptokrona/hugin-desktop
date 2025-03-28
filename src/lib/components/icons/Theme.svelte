<script>
    let {
        active
    } = $props()

    let fill = $state("none")

    $effect(() => {
        if (active) fill = "var(--primary-color)"
    })
    
</script>

<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">
  <g id="vuesaxlinearmoon">
    <g id="vuesaxlinearmoon">
      <g id="moon">
        <path d="M11.9901 21.99C15.6801 22.15 18.9801 20.43 20.9601 17.72C21.7801 16.61 21.3401 15.87 19.9701 16.12C19.3001 16.24 18.6101 16.29 17.8901 16.26C13.0001 16.06 9.00009 11.97 8.98009 7.13996C8.97009 5.83996 9.24009 4.60996 9.73009 3.48996C10.2701 2.24996 9.62009 1.65996 8.37009 2.18996C4.41009 3.85996 1.70009 7.84996 2.03009 12.42C2.39009 17.57 6.76009 21.76 11.9901 21.99Z" id="Vector" fill="{fill}" fill-rule="evenodd" stroke="var(--text-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M1.90735e-06 24L0 0L24 -1.90735e-06L24 24L1.90735e-06 24Z" id="Vector" fill="none" fill-rule="evenodd" stroke="none" />
      </g>
    </g>
  </g>
</svg>

<style lang="scss">
    svg {
    transition: 200ms ease-in-out;
    cursor: pointer;

    &:hover {
        opacity: 80%;
    }
}
</style>
