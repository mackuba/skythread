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
  import { pdsEndpointForDID } from '../api/identity.js';
  import ProfilePopoverContents from './ProfilePopoverContents.svelte';

  const hoverDelay = 500;
  const hideDelay = 120;

  type Props = {
    did: string;
    anchor: HTMLElement;
    anchorHovered: boolean;
    onDismissed: () => void;
  }

  let { did, anchor, anchorHovered, onDismissed }: Props = $props();

  let profile: json | undefined = $state();
  let pds: string | undefined = $state();
  let popover: HTMLDivElement | undefined = $state();
  let hideTimer: number | undefined;

  async function loadProfile(abortSignal: AbortSignal) {
    try {
      let [loadedProfile, pdsHost] = await Promise.all([
        api.loadUserProfile(did, true, { abortSignal }),

        pdsEndpointForDID(did).catch(error => {
          console.warn('Could not load PDS for profile popover:', error);
          return undefined;
        })
      ]);

      if (!abortSignal.aborted) {
        profile = loadedProfile;
        pds = pdsHost;
      }

      return loadedProfile;
    } catch (error) {
      if (!abortSignal.aborted) {
        console.warn('Could not load profile for popover:', error);
      }

      return null;
    }
  }

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = undefined;
    }
  }

  function hidePopover() {
    clearHideTimer();

    if (anchorHovered) {
      return;
    }

    if (popover?.matches(':popover-open')) {
      popover.hidePopover();
    }

    onDismissed();
  }

  function keepPopoverOpen() {
    clearHideTimer();
  }

  function queueHidePopover() {
    clearHideTimer();
    hideTimer = setTimeout(hidePopover, hideDelay);
  }

  $effect(() => {
    if (!supportsAnchorPositioning) { return }

    anchor.style.setProperty('anchor-name', '--profile-popover-anchor');

    let abortController = new AbortController();
    let loadProfilePromise = loadProfile(abortController.signal);

    let showTimer = setTimeout(async () => {
      let loadedProfile = await loadProfilePromise;

      if (abortController.signal.aborted || !loadedProfile) return;

      await tick();
      popover?.showPopover();
    }, hoverDelay);

    return () => {
      abortController.abort();
      clearTimeout(showTimer);
      clearHideTimer();

      if (popover?.matches(':popover-open')) {
        popover.hidePopover();
      }

      anchor.style.removeProperty('anchor-name');
    };
  });

  $effect(() => {
    clearHideTimer();

    if (!anchorHovered) {
      queueHidePopover();
    }
  });
</script>

{#if profile}
  <ProfilePopoverContents {profile} {pds} bind:element={popover}
    onmouseenter={keepPopoverOpen} onmouseleave={queueHidePopover} />
{/if}
