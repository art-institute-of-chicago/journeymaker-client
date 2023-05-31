
function Analytics() {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////


	// Elements
	/////////////////////////////////////////////


	// Vars
	/////////////////////////////////////////////

	var _created		= false,
		_enabled		= false,
		_prefix			= "";


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"enabled": {
			get: function() {
				return _enabled;
			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.enable = function(id, pagePrefix, debugOn) {

		_enabled	= true;
		_prefix		= bwco.utils.defined(pagePrefix) ? pagePrefix : "";

		if (_prefix.charAt(0) != "/") _prefix = "/" + _prefix;
		if (_prefix.charAt(_prefix.length - 1) != "/") page = page + "/";

		if (!_created) {
			createAnalyticsObj(id, debugOn);
		}

	}
	this.disable = function() {

		_enabled	= false;

	}

	this.trackPage = function(page) {

		if (!_enabled) return;

		if (typeof page == "object") {
			var segments	= page,
				page		= "";
			for (var i = 0; i < page.length; i++) {
				page += "/" + segments[i];
			}
		}

		var fullPage	= makeFriendly(_prefix + page);

		ga("send", "pageview", fullPage);

	}
	this.trackEvent = function(category, action, label, value) {

		if (!_enabled) return;

		if (bwco.utils.defined(value)) {
			ga("send", "event", category, action, label, value);
		} else {
			ga("send", "event", category, action, label);
		}

	}


	// Event handlers
	/////////////////////////////////////////////


	// Methods
	/////////////////////////////////////////////

	function createAnalyticsObj(id, debug) {

		var jsFile	= debug ? "analytics_debug.js" : "analytics.js";

		(function(i,s,o,g,r,a,m){i["GoogleAnalyticsObject"]=r;i[r]=i[r]||function(){
		(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
		m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
		})(window,document,"script", "https://www.google-analytics.com/" + jsFile,"ga");

		ga("create", id, "auto");

		if (debug) {
			ga_debug = {
				trace: true
			};
		}

		_created	= true;

	}


	// Helpers
	/////////////////////////////////////////////

	function makeFriendly(s, keepCase) {
		if (!s || !s.length) return "";
		App.log("Analytics::makeFriendly...while start");
		while (s.charAt(s.length - 1) == " ") s	= s.substr(0, s.length - 1);
		App.log("Analytics::makeFriendly...while end");
		s	= s.split(" ").join("-");
		if (!keepCase) s	= s.toLowerCase();
		return s;
	}


}


// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(Analytics, bwco.events.Dispatcher);
bwco.utils.makeSingleton(Analytics);
