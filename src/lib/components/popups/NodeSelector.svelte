<script>
  import FillButton from '$lib/components/buttons/FillButton.svelte'
  import {getBestNode, nodelist} from '$lib/stores/nodes.js'
  import {fade} from 'svelte/transition'
  import {misc} from "$lib/stores/user.js";

  let nodeInput = $state('')
  let selectedNode = $state()
  let loading = $state(false)

  let {
    goBack,
    onConnect
  } = $props()

  const back = () => {
    goBack()
  }

  const auto = async () => {
    loading = true
    const randomNode = await getBestNode();

    if (!randomNode) {
        window.api.errorMessage('Auto node did not load')
        return
    }

    loading = false

    nodeInput = randomNode
  }

  const connectTo = () => {
     onConnect({
      node: nodeInput,
    })
  }

  function chooseNode(node, i) {
    nodeInput = `${node.url}:${node.port}`
    selectedNode = i
  }
</script>

<div in:fade|global class="wrapper">
    <h1>Pick a node</h1>
    <input spellcheck="false" type="text" placeholder="Enter url & port" bind:value="{nodeInput}"/>
    <div class="node-list">
        {#each $nodelist.nodes as node, i}
            <div
                    class="node-card"
                    class:selected="{selectedNode === i}"
                    onclick={() => {
                    chooseNode(node, i)
                }}
            >
                <p id="node">{node.name}</p>
            </div>
        {/each}
    </div>
    <div class="button_wrapper">
        <FillButton text="Back" disabled="{false}" on:click="{back}"/>
        <FillButton text="Auto" disabled="{false}" info={true} loading={loading} on:click="{auto}"/>
        <FillButton
                text="Connect"
                disabled="{!(nodeInput.length > 0)}"
                enabled="{nodeInput.length > 0}"
                on:click="{connectTo}"
                loading={$misc.loading}
        />
    </div>
</div>

<style lang="scss">
  .wrapper {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    justify-content: center;
    align-items: center;
    max-width: 840px;
  }

  .node-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .node-card {
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    padding: 0.75rem;
    border-radius: 0.4rem;
    cursor: pointer;

    p {
      margin: 0;
      font-size: 0.75rem;
    }
  }

  .selected {
    background-color: var(--success-color);
  }

  input {
    margin: 0 auto;
    max-width: 700px;
    width: 100%;
    height: 48px;
    padding: 0 15px;
    border-radius: 0.5rem;
    transition: 200ms ease-in-out;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    color: var(--text-color);
    font-size: 1.1rem;

    &:focus {
      outline: none;
    }
  }

  .button_wrapper {
    display: flex;
    gap: 1rem;
    width: 400px;
    justify-content: center;
  }
</style>
