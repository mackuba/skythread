<script lang="ts">
  type Props = {
    profile: json;
    element?: HTMLDivElement | undefined;
    onmouseenter?: (event: MouseEvent) => void;
    onmouseleave?: (event: MouseEvent) => void;
  };

  let { profile, element = $bindable(), onmouseenter, onmouseleave }: Props = $props();

  let displayName = $derived.by(() => {
    let name = profile.displayName?.trim();

    if (name) {
      return name;
    } else if (profile.handle.endsWith('.bsky.social')) {
      return profile.handle.replace(/\.bsky\.social$/, '');
    } else {
      return profile.handle;
    }
  });

  let handle = $derived.by(() => {
    if (profile.handle.endsWith('.ap.brid.gy')) {
      return `@${profile.handle.replace(/\.ap\.brid\.gy$/, '').replace('.', '@')}`;
    } else if (profile.handle == 'handle.invalid') {
      return '[invalid handle]';
    } else {
      return `@${profile.handle}`;
    }
  });
</script>

<div popover class="profile-popover" bind:this={element} {onmouseenter} {onmouseleave}>
  <div class="contents">
    <div class="avatar-column">
      {#if profile.viewer?.muted}
        <i class="muted-avatar fa-regular fa-circle-user fa-3x"></i>
      {:else if profile.avatar}
        <img class="avatar" alt="Avatar" loading="lazy" src={profile.avatar}>
      {:else}
        <i class="no-avatar fa-regular fa-face-smile fa-3x"></i>
      {/if}
    </div>

    <div class="main-column">
      <h3>{displayName}</h3>
      <div class="handle">{handle}</div>

      {#if profile.pronouns}
        <div class="pronouns">{profile.pronouns}</div>
      {/if}

      {#if profile.description}
        <p>{profile.description}</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .profile-popover {
    position: fixed;
    width: 360px;
    border: 1px solid #dddddd;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 7px 20px rgba(0, 0, 0, 0.16);
    box-sizing: border-box;
    position-anchor: --profile-popover-anchor;
    position-area: bottom center;
    position-try-fallbacks: top center;
    margin: unset;
  }

  .contents {
    display: flex;
    gap: 15px;
    padding: 14px 12px 12px 14px;
  }

  .avatar-column {
    flex: 0 0 auto;
  }

  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 32px;
    display: block;
  }

  .main-column {
    min-width: 0;
  }

  h3 {
    margin: 0;
    font-size: 15pt;
    line-height: 1.2;
  }

  .handle {
    margin-top: 2px;
    color: #666;
    font-size: 11pt;
  }

  .main-column p {
    margin: 14px 0 0;
    color: #333;
    font-size: 11pt;
    line-height: 1.45;
  }

  .pronouns {
    margin-top: 4px;
    color: #9a9a9a;
    font-size: 10.5pt;
  }

  .no-avatar, .muted-avatar {
    color: #aaa;
    background-color: #eee;
    border-radius: 36px;
    vertical-align: middle;
  }

  .muted-avatar {
    color: #bbb;
  }

  @media (prefers-color-scheme: dark) {
    .profile-popover {
      border-color: #4a4a4a;
      background: #333;
      box-shadow: 0 7px 20px rgba(0, 0, 0, 0.4);
    }

    .handle { color: #aaa; }
    .pronouns { color: #7f7f7f; }
    .main-column p { color: #ddd; }
  }
</style>
