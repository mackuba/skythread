<script lang="ts">
    import RichTextFromFacets from "./RichTextFromFacets.svelte";

  type Props = {
    profile: json;
    pds: string | undefined;
    element?: HTMLDivElement | undefined;
    onmouseenter?: (event: MouseEvent) => void;
    onmouseleave?: (event: MouseEvent) => void;
  };

  let { profile, pds, element = $bindable(), onmouseenter, onmouseleave }: Props = $props();

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
      <div class="handle">{handle}
        {#if profile.pronouns}<span class="pronouns">• {profile.pronouns}</span>{/if}
      </div>

      {#if pds && !pds.endsWith('.bsky.network')}
        <div class="pds">{pds}</div>
      {/if}

      {#if profile.description}
        <p><RichTextFromFacets text={profile.description} facets={[]} /></p>
      {/if}
    </div>
  </div>
</div>

<style>
  .profile-popover {
    position: fixed;
    width: 400px;
    border: 1px solid #dddddd;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 7px 20px rgba(0, 0, 0, 0.16);
    box-sizing: border-box;
    position-anchor: --profile-popover-anchor;
    position-area: bottom center;
    position-try-fallbacks: top center;
    margin: unset;
    margin-top: 6px;
    margin-bottom: 6px;
  }

  .contents {
    display: flex;
    gap: 15px;
    padding: 14px 12px 14px 14px;
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
    margin-top: 4px;
    color: #666;
    font-size: 11pt;
  }

  .pds {
    display: inline-block;
    margin-top: 8px;
    border: 1px solid #aaa;
    border-radius: 10px;
    color: #666;
    font-size: 9pt;
    padding: 1px 6px 2px;
  }

  .main-column p {
    margin: 14px 0 0;
    color: #333;
    font-size: 11pt;
    line-height: 1.45;
  }

  .pronouns {
    color: #9a9a9a;
    font-size: 10.5pt;
    vertical-align: 0.5px;
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
    .pds { color: #999; }
    .pronouns { color: #7f7f7f; }
    .main-column p { color: #ddd; }
  }
</style>
