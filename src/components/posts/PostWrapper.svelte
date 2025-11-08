<script>
  import { PostComponent } from '../../post_component.js';

  let { post, context } = $props();
  let wrapper;

  $effect(() => {
    let component = new PostComponent(post, context);
    let element = component.buildElement();
    wrapper.replaceWith(element);
  });
</script>

<div class="PostWrapper" bind:this={wrapper}>
</div>
