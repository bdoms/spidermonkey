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

Include `-v` as a command line argument to turn on verbose mode,
which will print much more information as the crawler does its work.

#### Debug Mode

Include `-d` as a command line argument to turn on debug mode.
This mode prints out an extreme amount of information useful for debugging,
including everything from verbose mode.

#### Logging In

If you include all the following options then once all the pages that can be
found on the domain are exhausted the crawler will attempt to login and
continue from wherever the login form redirects to.
The required parameters to achieve this are:

 * `login=rel-path-to-login-page`
 * `email=user@example.com`
 * `password=pw1234`

It's worth noting that the fields are assumed to be named `email` and `password` exactly.

Finally, you can pass an optional `logout` parameter with a value of the relative path to log out.
This path will be avoided until after all logged in pages are crawled.

Full example:

```bash
node --harmony spidermonkey.js localhost:8080 login=user/signin email=test@example.com password=testpass logout=user/signout
```
