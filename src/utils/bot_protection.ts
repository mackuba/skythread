// Making sure you're not a bot! ^_^

export function checkIfNotBot(): Promise<string | undefined> {
  if (sessionStorage.getItem('is-not-bot')) {
    return Promise.resolve(undefined);
  }

  return new Promise(resolve => {
    let events = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'];

    function onActivity(event: Event) {
      if (!event.isTrusted || document.visibilityState !== 'visible') { return; }

      sessionStorage.setItem('is-not-bot', '1');
      events.forEach(name => window.removeEventListener(name, onActivity));
      resolve(event.type);
    }

    events.forEach(name => window.addEventListener(name, onActivity, { passive: true }));
  });
}
