  
  <script>
  /** @type {{src: any}} */
  let { src } = $props();
  
  </script>
  
  <div>
      <audio
      {src}
        controls>
          <track />
      </audio>
  </div>