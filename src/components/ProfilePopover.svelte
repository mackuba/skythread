<script module lang="ts">
  const supportsAnchorPositioning =
    CSS.supports('anchor-name: --x')
    && CSS.supports('anchor-scope: --x')
    && CSS.supports('position-anchor: --x')
    && CSS.supports('position-area: block-start');
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import { api } from '../api.js';
  import ProfilePopoverContents from './ProfilePopoverContents.svelte';

  const hoverDelay = 500;

  let { did, anchor }: { did: string, anchor: HTMLElement } = $props();

  let profile: json | undefined = $state();
  let popover: HTMLDivElement | undefined = $state();

  async function loadProfile(abortSignal: AbortSignal) {
    try {
      let loadedProfile = await api.loadUserProfile(did, true, { abortSignal });

      if (!abortSignal.aborted) {
        profile = loadedProfile;
      }

      return loadedProfile;
    } catch (error) {
      if (!abortSignal.aborted) {
        console.warn('Could not load profile for popover:', error);
      }

      return null;
    }
  }

  $effect(() => {
    if (!supportsAnchorPositioning) { return }

    anchor.style.setProperty('anchor-name', '--profile-popover-anchor');

    let abortController = new AbortController();
    let loadProfilePromise = loadProfile(abortController.signal);

    let timer = window.setTimeout(async () => {
      let loadedProfile = await loadProfilePromise;

      if (abortController.signal.aborted || !loadedProfile) return;

      await tick();
      popover?.showPopover();
    }, hoverDelay);

    return () => {
      abortController.abort();
      window.clearTimeout(timer);

      if (popover?.matches(':popover-open')) {
        popover.hidePopover();
      }

      anchor.style.removeProperty('anchor-name');
    };
  });
</script>

{#if profile}
  <ProfilePopoverContents {profile} bind:element={popover} />
{/if}
