const Browser = require('zombie');


var SpiderMonkey = function() {

    var self = this;
    self.browser = new Browser({'features': 'scripts css img iframe', 'waitDuration': 30000});
    self.domain = '';
    self.found_urls = [];
    self.completed_urls = {};
    self.referals = {};
    self.verbose = false;
    self.waiting = '';
    self.delay = 800; // time to wait in ms
    self.i = 0;
    self.logged_in = false;
    self.logged_out = false;
    self.login_path = '';
    self.logout_path = '';
    self.logout_url = '';
    self.email = '';
    self.password = '';
    

    self.parseArgs = function(args) {
        var url = '';
        for (var i=0; i < args.length; i++) {
            var arg = args[i];
            if (arg.indexOf('-') == 0) {
                var key = arg.substr(1);
                if (key == 'v') {
                    self.verbose = true;
                }
            }
            else if (arg.indexOf('=') != -1) {
                // option
                var pair = arg.split('=');
                var key = pair[0];
                var value = pair[1];
                if (key == 'login') {
                    self.login_path = self.makeRelPath(value);
                }
                else if (key == 'logout') {
                    self.logout_path = self.makeRelPath(value);
                }
                else if (key == 'email') {
                    self.email = value;
                }
                else if (key == 'password') {
                    self.password = value;
                }
            }
            else {
                url = arg;
            }
        }

        // coerce url into a domain even if it's just a host
        if (url.indexOf('http') != 0) {
            url = 'http://' + url;
        }
        if (url.indexOf('/') != url.length - 1) {
            url += '/';
        }
        self.domain = url;
        self.found_urls = [url];
    };

    self.makeRelPath = function(path) {
        if (path.indexOf('/') == 0) {
            path = path.substr(1);
        }
        return path;
    };

    self.canonicalURL = function(url) {
        // reduce the URL down to a single canonical version per page
        var hash_index = url.indexOf('#');
        if (hash_index != -1) {
            url = url.substring(0, hash_index);
        }
        return url;
    };

    self.addUrl = function(url, status, referer) {
        url = self.canonicalURL(url);

        var exists = url.length > 0;
        var completed = url in self.completed_urls;
        var is_logout = url == self.logout_url;
        var on_domain = url.indexOf(self.domain) == 0;

        if (exists && !completed && !is_logout && on_domain) {
            var found_index = self.found_urls.indexOf(url);
            if (found_index == -1) {
                if (status) {
                    self.completed_urls[url] = status;
                    //console.log('Auto completed', url, status);
                }
                else {
                    self.found_urls.push(url);
                    //console.log('Added', url);
                }
            }
            else if (status) {
                self.completed_urls[url] = status;
                self.found_urls.splice(found_index, 1);
                //console.log('Completed', url, status);
            }
            if (referer) {
                self.addReferal(url, referer);
            }
        }
    };

    self.addReferal = function(url, referer) {
        var referals = [];
        if (url in self.referals) {
            referals = self.referals[url];
        }
        if (referals.indexOf(referer) == -1) {
            referals.push(referer);
            self.referals[url] = referals;
        }
    };

    self.addResources = function(from_url) {
        for (var i in self.browser.resources) {
            var resource = self.browser.resources[i];
            if (resource.request) {
                var url = resource.request.url;
                var status = resource.response.status;
                self.addUrl(url, status, from_url);
            }
        }
    };

    self.addLinks = function(from_url) {
        var links = self.browser.querySelectorAll('a');
        for (var i=0; i < links.length; i++) {
            var link = links[i];
            var href = link.href;
            self.addUrl(href, null, from_url);
        }
    };

    self.login = function() {
        var login_url = self.domain + self.login_path;
        self.waiting = login_url;

        self.browser.visit(login_url).then(function() {
            var page_status = self.browser.statusCode;
            if (page_status === 200) {
                self.addResources(login_url);
                self.addLinks(login_url);

                if (self.verbose) {
                    console.log('Logging in');
                }

                self.browser.fill('email', self.email);
                self.browser.fill('password', self.password);
                self.browser.query('input[name=email]').form.submit();
                self.browser.wait().then(function() {
                    self.found_urls.push(self.browser.url);
                    self.logout_url = self.domain + self.logout_path;
                    self.waiting = '';
                });
            }
        }).catch(function(error) {
            if (self.verbose) {
                console.log(error);
            }
            self.addUrl(login_url, self.browser.statusCode);
            self.waiting = '';
        });
    };

    self.crawlPage = function(page_url) {
        self.waiting = page_url;

        self.browser.visit(page_url).then(function() {
            var page_status = self.browser.statusCode;
            if (page_status === 200) {
                self.addResources(page_url);
                self.addLinks(page_url);
            }
            self.waiting = '';
        }).catch(function(error) {
            if (self.verbose) {
                console.log(error);
            }
            self.addUrl(page_url, self.browser.statusCode);
            self.waiting = '';
        });
    };

    self.crawl = function() {
        while (self.found_urls.length > 0) {
            var url = self.found_urls[0];
            url = self.canonicalURL(url);
            if (self.waiting != url) {
                self.i += 1;
                if (self.verbose) {
                    console.log('Crawling', url);
                }
                else {
                    var total_pages = self.found_urls.length + self.i - 1;
                    process.stdout.clearLine(); // clear current text
                    process.stdout.cursorTo(0); // move cursor to beginning of line
                    process.stdout.write('Crawling page ' + self.i.toString() + ' of ' + total_pages.toString());
                }
                self.crawlPage(url);
            }
            else {
                break;
            }
        }

        if (self.waiting != '') {
            //console.log('Waiting', self.waiting);
            setTimeout(self.crawl, self.delay);
        }
        else if (self.login_path && !self.logged_in) {
            self.login();
            self.logged_in = true;
            setTimeout(self.crawl, self.delay);
        }
        else if (self.logout_path && !self.logged_out) {
            var logout_url = self.logout_url;
            self.logout_url = '';
            self.addUrl(logout_url);
            self.logged_out = true;
            if (self.verbose) {
                console.log('Logging out');
            }
            setTimeout(self.crawl, self.delay);
        }
        else {
            var total = 0;
            var errors = [];
            for (var url in self.completed_urls) {
                if (self.completed_urls.hasOwnProperty(url)) {
                    total += 1;
                    var status = self.completed_urls[url];
                    if (status < 200 || status > 399) {
                        errors.push([status, url]);
                    }
                }
            }

            if (!self.verbose) {
                process.stdout.write('\n');
            }

            console.log('Fetched ' + total.toString() + ' URL(s) total');
            if (errors.length > 0) {
                console.log('With ' + errors.length.toString() + ' error(s):');
                for (var i=0; i < errors.length; i++) {
                    var error = errors[i];
                    console.log(error[0], error[1]);
                    if (self.verbose) {
                        console.log('  Refered by', self.referals[error[1]]);
                    }
                }
            }
            else {
                console.log('No errors');
            }
        }
    };
};


if (!module.parent) {
    var spidermonkey = new SpiderMonkey();
    spidermonkey.parseArgs(process.argv);
    spidermonkey.crawl();
}
