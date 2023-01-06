<script lang="typescript">
    import Highlight from "svelte-highlight";
    import typescript from "svelte-highlight/languages/typescript";
    import javascript from "svelte-highlight/languages/javascript";
    import github from "svelte-highlight/styles/github";
    import monokai from "svelte-highlight/styles/monokai";
    import vs2015 from "svelte-highlight/styles/vs2015";
    export let code: string
    export let style: boolean = false
    export let lang: string
    let language:any
    let codeStyle:any = vs2015

    $: if (style) {
      codeStyle = style
    }

    $: if (lang == "js") {
      language = javascript
    }

    $: if (lang == "ts") {
      language = typescript
    }
    
  </script>
  
  <svelte:head>
    {@html codeStyle}
  </svelte:head>
  <div class="code" style="user-select: text;">
  <Highlight language={language} code={code} />
  </div>

  <style lang="scss">
    .c {
      overflow: visible;
    }
    .c + .c {
      margin-top: 2em;
    }
    .file-name {
      display: flex;
      align-items: center;
      /* background: #3d6672; */
      margin-left: -0.7em;
      padding: 0.6em 1em;
      font-weight: 600;
      font-size: 0.9em;
      /* color: #64687a; */
      color: var(--text-light);
    }
    .file-name :global(svg) {
      margin-right: 0.3em;
    }
    .name {
      flex: 1;
    }
    a {
      display: flex;
      position: relative;
      padding: 0;
      height: 1em;
    }
    button {
      position: relative;
      height: 1em;
      margin: 0 0.6em;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      appearance: none;
      background: none;
      color: inherit;
      border: none;
      outline: none;
      cursor: pointer;
    }
    pre {
      margin: 0;
    }

    .code {
      display: flex;
      width: 100%;
    }
    
    code {
      --base: #282c34;
      display: block;
      overflow-x: auto;
      padding: 0.5em 1.6em;
      color: #f2f2f7;
      background: var(--base);
      background: #002451;
      color: white;
      font-family: "Montserrat";
      font-size: 0.9em;
    }

    pre code.hljs {
      white-space: pre-wrap;
    }
    
    code :global(.hljs-comment),
    code :global(.hljs-quote) {
      color: #7285b7;
      font-style: italic;
    }
    code :global(.hljs-doctag),
    code :global(.hljs-keyword),
    code :global(.hljs-formula) {
      color: #ff9da4;
    }
    code :global(.hljs-section),
    code :global(.hljs-name),
    code :global(.hljs-selector-tag),
    code :global(.hljs-deletion),
    code :global(.hljs-subst) {
      color: #d1f1a9;
    }
    code :global(.hljs-variable) {
      color: #ff9da4;
    }
    code :global(.hljs-literal) {
      color: #ff9da4;
    }
    code :global(.hljs-d3) {
      color: #c593ff;
      font-weight: 700;
    }
    code :global(.hljs-string),
    code :global(.hljs-regexp),
    code :global(.hljs-addition),
    code :global(.hljs-attribute),
    code :global(.hljs-meta-string) {
      color: #ebbbff;
    }
    code :global(.hljs-built_in),
    code :global(.hljs-class .hljs-title) {
      color: #ffc58f;
    }
    code :global(.hljs-attr),
    code :global(.hljs-variable),
    code :global(.hljs-template-variable),
    code :global(.hljs-type) {
      color: #bbdaff;
    }
    code :global(.hljs-selector-class),
    code :global(.hljs-selector-attr),
    code :global(.hljs-selector-pseudo),
    code :global(.hljs-number) {
      color: #ffeead;
    }
    code :global(.hljs-symbol),
    code :global(.hljs-bullet),
    code :global(.hljs-link),
    code :global(.hljs-meta),
    code :global(.hljs-selector-id),
    code :global(.hljs-title) {
      color: #ffc58f;
    }
    code :global(.hljs-emphasis) {
      font-style: italic;
    }
    code :global(.hljs-strong) {
      font-weight: bold;
    }
    code :global(.hljs-link) {
      text-decoration: underline;
    }
  </style>