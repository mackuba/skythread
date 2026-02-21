<script lang="ts">
  type Props = {
    children: any;
    id?: string;
    class?: string;
    onClose?: () => void;
  }

  let { children, onClose = undefined, id = undefined, ...props }: Props = $props();

  function onclick(e: Event) {
    // close the dialog (if it's closable) on click on the overlay, but not on anything inside
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }
</script>

<div {id} class="dialog {props.class}" {onclick}>
  {@render children()}
</div>

<style>
  .dialog {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-bottom: 5%;
    z-index: 10;
    background-color: rgba(240, 240, 240, 0.4);
  }

  .dialog:global(.expanded) {
    padding-bottom: 0;
  }

  .dialog ~ :global(main) {
    filter: blur(8px);
  }

  .dialog :global {
    form {
      position: relative;
      border: 2px solid hsl(210, 100%, 85%);
      background-color: hsl(210, 100%, 98%);
      border-radius: 10px;
      padding: 15px 25px;
    }

    .close {
      position: absolute;
      top: 5px;
      right: 5px;
      color: hsl(210, 100%, 75%);
      opacity: 0.6;
    }

    .close:hover {
      color: hsl(210, 100%, 65%);
      opacity: 1.0;
    }

    p {
      text-align: center;
      line-height: 125%;
    }

    h2 {
      font-size: 13pt;
      font-weight: 600;
      text-align: center;
      margin-bottom: 25px;
      padding-right: 10px;
    }

    input[type="text"], input[type="password"] {
      width: 200px;
      font-size: 11pt;
      border: 1px solid #d6d6d6;
      border-radius: 4px;
      padding: 5px 6px;
      margin: 0px 15px;
    }

    p.submit {
      margin-top: 25px;
    }

    input[type="submit"] {
      width: 150px;
      font-size: 11pt;
      border: 1px solid hsl(210, 90%, 85%);
      background-color: hsl(210, 100%, 92%);
      border-radius: 4px;
      padding: 5px 6px;
    }

    input[type="submit"]:hover {
      background-color: hsl(210, 100%, 90%);
      border: 1px solid hsl(210, 90%, 82%);
    }

    input[type="submit"]:active {
      background-color: hsl(210, 100%, 87%);
      border: 1px solid hsl(210, 90%, 80%);
    }
  }

  @media (prefers-color-scheme: dark) {
    .dialog {
      background-color: rgba(240, 240, 240, 0.15);
    }

    .dialog :global {
      form {
        border-color: hsl(210, 20%, 40%);
        background-color: hsl(210, 12%, 25%);
      }

      .close {
        color: hsl(210, 20%, 50%);
        opacity: 0.6;
      }

      .close:hover {
        color: hsl(210, 20%, 50%);
        opacity: 1.0;
      }

      input[type="text"], input[type="password"] {
        border-color: #666;
      }

      input[type="submit"] {
        background-color: hsl(210, 53.33%, 35.29%);
        border-color: hsl(210, 45.28%, 41.57%);
      }

      input[type="submit"]:hover {
        background-color: hsl(210, 45.28%, 41.57%);
        border-color: hsl(210, 39.34%, 47.84%);
      }

      input[type="submit"]:active {
        border-color: hsl(210, 64.86%, 29.02%);
        background-color: hsl(210, 53.33%, 35.29%);
      }
    }
  }
</style>
