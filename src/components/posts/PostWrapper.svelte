<script>
  import { PostComponent } from '../../post_component.js';

  let { post, context, ...props } = $props();
  let wrapper;

  $effect(() => {
    let component = new PostComponent(post, context);
    let element = component.buildElement();

    if (props.replaceClass) {
      element.className = props.replaceClass;
    } else if (props.class) {
      element.classList.add(props.class);
    }

    wrapper.replaceWith(element);
  });
</script>

<div class="PostWrapper" bind:this={wrapper}>
</div>
