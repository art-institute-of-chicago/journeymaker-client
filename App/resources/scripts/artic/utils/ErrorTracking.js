
function ErrorTracking() {

	// Superclass
	/////////////////////////////////////////////

	bwco.events.Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var SENTRY_SCRIPT_URL			= "https://browser.sentry-cdn.com/10.66.0/bundle.min.js";
	var SENTRY_SCRIPT_INTEGRITY		= "sha384-rtwsnRY5j8smljaOw72wBKVSXCYaWu7dWy/6NH+Iy0524oU2b5VpFHc83FOev09R";


	// Vars
	/////////////////////////////////////////////

	var _enabled		= false;


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

	this.enable = function(dsn, environment) {

		if (_enabled) return;
		_enabled	= true;

		loadScript(function() {
			window.Sentry.init({
				dsn: dsn,
				environment: environment
			});
		});

	}
	this.addBreadcrumb = function(msg, level) {

		if (!_enabled || !window.Sentry) return;

		window.Sentry.addBreadcrumb({
			category: "app.log",
			message: msg,
			level: mapLevel(level)
		});

	}


	// Methods
	/////////////////////////////////////////////

	function mapLevel(level) {

		switch (level) {
			case "error":	return "error";
			case "warn":	return "warning";
			case "trace":	return "debug";
			default:		return "info";
		}

	}
	function loadScript(onLoad) {

		var script			= document.createElement("script");
			script.src			= SENTRY_SCRIPT_URL;
			script.integrity	= SENTRY_SCRIPT_INTEGRITY;
			script.crossOrigin	= "anonymous";
			script.onload		= onLoad;

		document.head.appendChild(script);

	}

}


// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ErrorTracking, bwco.events.Dispatcher);
bwco.utils.makeSingleton(ErrorTracking);
