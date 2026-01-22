# Skythread

Skythread is a web tool that allows you to read long Bluesky threads in the form of a tree of comments nested under one another, like e.g. on Reddit, to make it easier to see which comment is a reply to which.

It looks like this:

<img width="600" src="https://github.com/mackuba/skythread/assets/28465/d1314c89-61e9-4667-b906-32e0cb96f198">


## List of features

Main parts of the app:

* viewing threads (look up by [bsky.app](https://bsky.app) URL or an at:// URI)
* listing quotes of a given post (including "detached" ones)
* hashtag feed – latest posts with a given hashtag
* personal statistics & search tools:
  - posting stats: statistics of who posts how much
  - like stats: who likes your posts and vice versa
  - timeline search: search in the recent posts in your Following feed
  - archive search: search in your likes, reposts, quotes and bookmarks (pins)

Also:

* liking comments in the thread
* loading contents of a blocked post on demand
* detecting & loading "hidden replies" hidden by Bluesky because of a "nuclear block" (look for an orange link with a "biohazard" icon)
* alternatively, both "hidden replies" and blocked post links can be hidden for peace of mind by turning off "Show infohazards" in the top-right menu
* "incognito mode" which lets you browse threads logged out but still be able to like comments from your account
* displays outline tags (the `tags` field in the post record), link cards for normal links, starter packs, feeds and lists
* special handling for Mastodon posts bridged through [Bridgy](https://fed.brid.gy) – full post content beyond 300 characters is loaded from the record data
* Tenor GIFs are loaded and played inline once you click on the tenor.com link card
* nested quotes (quote-chains) are automatically loaded beyond the first level
* self-replies are collapsed into a flat vertical list if possible


## What is currently missing (but planned)

* images and videos aren't shown inline yet, only as links like `[Image]` (I'll need to make sure first that labels and moderation preferences are always applied as needed)
* UI is not currently designed with mobile phones in mind (though it *should* work)
* OAuth support – only app passwords are supported
* easy configuration of things like date format, language, preferred AppView and other services, enabled labellers, some UI preferences etc.


## Running

You can access the public Skythread site at [skythread.mackuba.eu](https://skythread.mackuba.eu).

You can also download a zipped copy of this repo or clone it and use it locally – just open the `index.html` at the root of the project, no need to start any servers!


## Development

If you want to make any changes, you'll need to install [Bun](https://bun.com) and install the project dependences with `bun install`. Use `bun build.js` or `bun serve.js` to recompile the bundles in `dist`.


## Credits

Copyright © 2026 [Kuba Suder](https://mackuba.eu) (<a href="https://bsky.app/profile/did:plc:oio4hkxaop4ao4wz2pp3f4cr">@mackuba.eu</a> on Bluesky). Licensed under [zlib license](https://choosealicense.com/licenses/zlib/) (permissive, similar to MIT).

Pull requests, bug reports and suggestions are welcome :)
