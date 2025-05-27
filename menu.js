class Menu {
  constructor() {
    this.menuElement = $id('account_menu');
    this.icon = $id('account');

    this.setupEvents();
  }

  setupEvents() {
    let html = $(document.body.parentNode);

    html.addEventListener('click', (e) => {
      this.menuElement.style.visibility = 'hidden';
    });

    this.icon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleAccountMenu();
    });

    this.menuElement.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    $(this.menuElement.querySelector('a[data-action=biohazard]')).addEventListener('click', (e) => {
      e.preventDefault();

      let hazards = document.querySelectorAll('p.hidden-replies, .content > .post.blocked, .blocked > .load-post');

      if (window.biohazardEnabled === false) {
        window.biohazardEnabled = true;
        localStorage.setItem('biohazard', 'true');
        this.toggleMenuButtonCheck('biohazard', true);
        Array.from(hazards).forEach(p => { $(p).style.display = 'block' });
      } else {
        window.biohazardEnabled = false;
        localStorage.setItem('biohazard', 'false');
        this.toggleMenuButtonCheck('biohazard', false);
        Array.from(hazards).forEach(p => { $(p).style.display = 'none' });
      }
    });

    $(this.menuElement.querySelector('a[data-action=incognito]')).addEventListener('click', (e) => {
      e.preventDefault();

      if (window.isIncognito) {
        localStorage.removeItem('incognito');
      } else {
        localStorage.setItem('incognito', '1');
      }

      location.reload();
    });

    $(this.menuElement.querySelector('a[data-action=login]')).addEventListener('click', (e) => {
      e.preventDefault();

      toggleDialog(loginDialog);
      this.menuElement.style.visibility = 'hidden';
    });

    $(this.menuElement.querySelector('a[data-action=logout]')).addEventListener('click', (e) => {
      e.preventDefault();
      logOut();
    });
  }

  toggleAccountMenu() {
    this.menuElement.style.visibility = (this.menuElement.style.visibility == 'visible') ? 'hidden' : 'visible';
  }

  /** @param {string} buttonName */

  showMenuButton(buttonName) {
    let button = $(this.menuElement.querySelector(`a[data-action=${buttonName}]`));
    let item = $(button.parentNode);
    item.style.display = 'list-item';
  }

  /** @param {string} buttonName */

  hideMenuButton(buttonName) {
    let button = $(this.menuElement.querySelector(`a[data-action=${buttonName}]`));
    let item = $(button.parentNode);
    item.style.display = 'none';
  }

  /** @param {string} buttonName, @param {boolean} state */

  toggleMenuButtonCheck(buttonName, state) {
    let button = $(this.menuElement.querySelector(`a[data-action=${buttonName}]`));
    let check = $(button.querySelector('.check'));
    check.style.display = (state) ? 'inline' : 'none';
  }

  /** @param {boolean | 'incognito'} loggedIn, @param {string | undefined | null} [avatar] */

  showLoggedInStatus(loggedIn, avatar) {
    if (loggedIn === true && avatar) {
      let button = $(this.icon.querySelector('i'));

      let img = $tag('img.avatar', { src: avatar });
      img.style.display = 'none';
      img.addEventListener('load', () => {
        button.remove();
        img.style.display = 'inline';
      });
      img.addEventListener('error', () => {
        this.showLoggedInStatus(true, null);
      })

      this.icon.append(img);
    } else if (loggedIn === false) {
      this.icon.innerHTML = `<i class="fa-regular fa-user-circle fa-xl"></i>`;
    } else if (loggedIn === 'incognito') {
      this.icon.innerHTML = `<i class="fa-solid fa-user-secret fa-lg"></i>`;
    } else {
      this.icon.innerHTML = `<i class="fa-solid fa-user-circle fa-xl"></i>`;
    }
  }

  /** @returns {Promise<void>} */

  async loadCurrentUserAvatar() {
    try {
      let url = await api.loadCurrentUserAvatar();
      this.showLoggedInStatus(true, url);      
    } catch (error) {
      console.log(error);
      this.showLoggedInStatus(true, null);
    }
  }
}
