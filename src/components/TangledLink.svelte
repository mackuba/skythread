<div id="tangled">
  <a href="https://tangled.org/mackuba.eu/skythread" target="_blank">
    <img src="icons/tangled_dolly.svg" alt="Tangled">
  </a>
</div>

<style>
  #tangled {
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: 10;
  }

  img {
    width: 20px;
    opacity: 0.4;
  }

  a:hover img {
    opacity: 0.6;
  }

  @media (prefers-color-scheme: dark) {
    #tangled {
      filter: invert();
    }
  }
</style>
