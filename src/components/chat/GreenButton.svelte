
 <script>
     export let text = 'Text'
     export let enabled = false
     export let rgb = false
     export let info = false
     export let disabled
 </script>

 <button
         disabled={disabled}
         on:click
         class:enabled
         class:info
         class:border_rgb={rgb}
 >{text}</button>

 <style lang="scss">
   button {
     background-color: var(--card-background);
     border: 1px solid var(--border-color);
     color: var(--text-color);
     border-radius: 0.4rem;
     padding: 9px 10px;
     width: 100px;
     cursor: pointer;
     font-weight: 600;
     transition: 250ms ease-in-out;
     &:hover {
       background-color: var(--card-border);
     }
   }
   .enabled {
     background-color: #3FD782;
     border-color: #63e79f;
     color: #fff;
     font-weight: 600;
     &:hover {
       background-color: #63e79f;
     }
   }
   .info {
     background: #5F86F2;
     border: 1px solid #83A4FF;
     color: white;
     &:hover{
       background-color: #83A4FF;
     }
   }
 </style>
