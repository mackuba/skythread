# Skythread

Skythread is a web tool that allows you to read long Bluesky threads in the form of a tree of comments nested under one another, like e.g. on Reddit, to make it easier to see which comment is a reply to which.

It looks like this:

<img width="600" src="https://github.com/mackuba/skythread/assets/28465/d1314c89-61e9-4667-b906-32e0cb96f198">

To use Skythread, open the GitHub pages view of this repo: https://mackuba.github.io/skythread/ (or download a copy and use it locally).


## Authentication

Bluesky API currently requires authentication to the `app.bsky.feed.getPostThread` endpoint, which is used to load complete threads. If this changes in the future, I will make authentication optional (it's also used to let you "like" comments from the thread view interface).

At the moment there is no way to log in using OAuth, only with a password. The password is only passed to the Bluesky API and isn't saved anywhere. The returned access token is stored in local storage. You can create an "app password" in the Bluesky app settings that you will only use to log in here.


## Bookmarklet

<p>To quickly access the Skythread view of a given thread when you're reading it on the <a href="https://bsky.app">bsky.app</a> website, you can use a bookmarklet. Drag <a href="javascript:(function(){let%20st=\"https:\\/mackuba.github.io/skythread/\";if(location.hostname.endsWith(\"bsky.app\")){let%20url=st+\"?q=\"+encodeURIComponent(location.href);let%20a=document.createElement('a');a.target='_blank';a.href=url;a.click()}else{location.href=st}}()))">this link</a> to the favorites bar in your browser and then click the bookmark when you're reading a thread.</p>

Alternatively, create a bookmark manually and paste this JavaScript link:

```
javascript:(function(){let%20st="https://mackuba.github.io/skythread/";if(location.hostname.endsWith("bsky.app")){let%20url=st+"?q="+encodeURIComponent(location.href);Object.assign(document.createElement('a'),{target:'_blank',href:url}).click()}else{location.href=st}}())
```

## TODO

* logging out
* showing images
* linkifying links


## Credits

Copyright © 2023 [Kuba Suder](https://mackuba.eu) (<a href="https://bsky.app/profile/mackuba.eu">@mackuba.eu</a> on Bluesky). Licensed under [zlib license](https://choosealicense.com/licenses/zlib/) (permissive, similar to MIT).

Pull requests, bug reports and suggestions are welcome :)
