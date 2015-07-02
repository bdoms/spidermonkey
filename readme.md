# SpiderMonkey

## Test a site's links and resources

> Chip, I'm gonna come at you like a spider monkey!

## Setup

Depends on [Zombie](http://zombie.js.org/),
which needs a more recent version of Node than Ubuntu supports by default.
So if you're on Ubuntu you should add the PPA. Digital Ocean has a
[great little write up](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-an-ubuntu-14-04-server)
explaining how to do this. Then:

```bash
npm install zombie
```

## Run

Call it with the root domain to crawl, and if you're on an old version of Node (like on Ubuntu)
you'll need the `harmony` flag:

```bash
node --harmony spidermonkey.js localhost:8080
```

Or:

```bash
node --harmony spidermonkey.js http://www.example.com/
```

### Options

#### Verbose Mode

Include a `-v` as a command line argument to turn on verbose mode,
which will print much more information as the crawler does its work.
