<script lang="ts">

    import Highlight, { HighlightAuto } from "svelte-highlight";
    import ashes from "svelte-highlight/styles/ashes";
  interface Props {
    code: string;
    style?: boolean;
    lang: string;
  }

  let { code }: Props = $props();

    
  </script>
  
  <svelte:head>
    {@html ashes}
  </svelte:head>
  <div class="code" style="user-select: text;">
  <HighlightAuto code={code} />
  </div>

  <style lang="scss">
   

    .code {
      display: flex;
      width: 100%;
      border-radius: 5px;
      font-family: "Montserrat";
    }
   
  </style>