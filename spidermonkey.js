const Browser = require('zombie');


var SpiderMonkey = function(url) {

    var self = this;
    self.browser = new Browser({'features': 'scripts css img iframe'});
    self.domain = url;
    self.found_urls = [url];
    self.completed_urls = {};
    self.waiting = '';
    self.delay = 1000; // time to wait in ms
    self.referals = {};

    self.canonicalURL = function(url) {
        // reduce the URL down to a single canonical version per page
        var hash_index = url.indexOf('#');
        if (hash_index != -1) {
            url = url.substring(0, hash_index);
        }
        return url;
    };

    self.addUrl = function(url, status) {
        url = self.canonicalURL(url);

        if (url.length > 0 && !(url in self.completed_urls)) {
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

    self.crawlPage = function(page_url) {
        self.waiting = page_url;

        self.browser.visit(page_url).then(function() {
            var page_status = self.browser.statusCode;
            //console.log(page_url, page_status);
            if (page_status === 200) {
                for (var i in self.browser.resources) {
                    var resource = self.browser.resources[i];
                    if (resource.request) {
                        var url = resource.request.url;
                        var status = resource.response.status;
                        self.addUrl(url, status);
                        self.addReferal(url, page_url);
                    }
                }
                
                var links = self.browser.querySelectorAll('a');
                for (var i=0; i < links.length; i++) {
                    // only add links that are on this domain
                    var link = links[i];
                    var href = link.href;
                    if (href.indexOf(self.domain) == 0) {
                        self.addUrl(href);
                        self.addReferal(href, page_url);
                    }
                }
            }
            self.waiting = '';
        }).catch(function(error) {
            self.addUrl(page_url, self.browser.statusCode);
            self.waiting = '';
        });
    };

    self.crawl = function() {
        while (self.found_urls.length > 0) {
            var url = self.found_urls[0];
            url = self.canonicalURL(url);
            if (self.waiting != url) {
                console.log('Crawling', url);
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
            console.log('Fetched ' + total.toString() + ' URL(s)');
            if (errors.length > 0) {
                console.log('With ' + errors.length.toString() + ' error(s):');
                for (var i=0; i < errors.length; i++) {
                    var error = errors[i];
                    console.log(error[0], error[1]);
                    //console.log('  Refered by', self.referals[error[1]]);
                }
            }
            else {
                console.log('No errors');
            }
        }
    };
};


if (!module.parent) {
    // coerce url into a domain even if it's just a host
    var url = process.argv.slice(2);
    if (url.indexOf('http') != 0) {
        url = 'http://' + url;
    }
    if (url.indexOf('/') != url.length - 1) {
        url += '/';
    }

    var spidermonkey = new SpiderMonkey(url);
    spidermonkey.crawl();
}
