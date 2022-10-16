<script>
    import { misc } from "$lib/stores/user.js";

    const createRoom = () => {
        let video = true
        console.log('creating room..')
        window.api.createRoom(video)
    }
  
  </script>
  
  <div class="cards">
    <div class="card" on:click={createRoom}>
      <h4>Create room</h4>
    </div>
    <div class="card">
      <h4>Create group chat</h4>
    </div>
  </div>
  
  <style lang="scss">
  
    .cards {
        display: flex;
        grid-gap: 1rem;
        justify-content: space-around;
        cursor: pointer;
        margin: 10px;
          
      .card {
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
      }
    }

  
  </style>