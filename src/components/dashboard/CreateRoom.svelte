<script>
    import { misc } from "$lib/stores/user.js";
    import { goto } from "$app/navigation";

    const createRoom = () => {
        let video = true
        console.log('creating room..')
        window.api.createRoom(video)
    }
  
  </script>
  
  <div class="cards">
    <div class="card" on:click={createRoom}>
      <h4>Create video room</h4>
    </div>
    <div class="card" on:click={() => goto('/groups')}>
      <h4 >Create group chat</h4>
    </div>
  </div>
  
  <style lang="scss">
  
    .cards {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        cursor: pointer;
        margin-top: 3rem;
        height: 100%;
        margin-right: 1rem;
          
      .card {
        height: 100px;
        width: 230px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        background-color: var(--card-background);
        border: 1px solid var(--card-border);
        border-radius: 0.4rem;
        grid-column: span 3 / span 3;
  
        p {
          margin: 0;
        }

        &:hover {
          opacity: 80%;
        }
      }
    }

  
  </style>