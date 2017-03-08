
function ViewBgs($view) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Random			= bwco.utils.Random;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var WAIT_DELAY			= 2250,
		FADE_IN_DURATION	= 1750;

	var ATTRACT_INTERVAL	= 7583;


	// Elements
	/////////////////////////////////////////////

	var $list				= $view.find("ul");


	// Vars
	/////////////////////////////////////////////

	var _self		= this;

	var _appModel,
		_dataModel;

	var _on			= false;

	var _theme,
		_lastBgUrl,
		_waitTimeout;

	var _attractInterval;


	// Public
	/////////////////////////////////////////////


	// Constructor
	/////////////////////////////////////////////

	init();

	function init() {

		initModels();

	}


	// Event handlers
	/////////////////////////////////////////////

	function onAppStateUpdate(e) {

		if (_appModel.state == AppState.ATTRACT) {
			startAttract();
		} else {
			endAttract();
		}

		switch (_appModel.state) {

			case AppState.ATTRACT:
				_on		= true;
				selectRandomTheme();
				$view.removeClass("spin end");
				$view.addClass("attract");
				break;

			case AppState.SPIN:
				_on		= true;
				$view.removeClass("attract end");
				$view.addClass("spin");
				break;

			case AppState.BUILD:
				_on		= false;
				$view.removeClass("attract spin end");
				break;

			case AppState.PRINT:
			case AppState.TOUR:
				_on		= true;
				$view.removeClass("attract spin");
				$view.addClass("end");
				break;

		}

		if (_on && !$list.children("li").length) {
			swapBg();
		}

	}
	function onThemeIndexUpdate(e) {

		_theme		= _dataModel.getTheme(e.index);

		if (_on) {
			clearTimeout(_waitTimeout);
			_waitTimeout	= setTimeout(onWaitTimeout, WAIT_DELAY);
		}

	}

	function onWaitTimeout() {

		App.log("ViewBgs::onWaitTimeout()");

		clearTimeout(_waitTimeout);
		swapBg();

	}

	function onFadeIn() {

		App.log("ViewBgs::onFadeIn()");

		var $bgs		= $list.children("li"),
			bgCount		= $bgs.length;

		$bgs.stop(true);

		for (var i = 0; i < bgCount - 1; i++) {
			$bg	= $bgs.eq(i);
			$bg.css({ "background-image": "none" });
			$bg.remove();
			$bg	= null;
		}

		$bgs	= null;

	}

	function onAttractInterval() {

		App.log("ViewBgs::onAttractInterval()");

		selectRandomTheme();
		swapBg();

	}


	// Private methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel	= AppModel.getInstance();
		_appModel.addListener(ModelEvent.APP_STATE_UPDATE, onAppStateUpdate);
		_appModel.addListener(ModelEvent.THEME_INDEX_UPDATE, onThemeIndexUpdate);

		_dataModel	= DataModel.getInstance();

	}

	function selectRandomTheme() {

		App.log("ViewBgs::selectRandomTheme()");

		App.log("ViewBgs::selectRandomTheme...while start");
		do {
			_theme	= Random.item(_dataModel.themes);
		} while (!_theme.bgs || !_theme.bgs.length)
		App.log("ViewBgs::selectRandomTheme...while end");

	}

	function swapBg() {

		App.log("ViewBgs::swapBg()");

		var hasTheme	= _theme && _theme.bgs && _theme.bgs.length;

		if (_on && hasTheme) {

			App.log("ViewBgs::swapBg...while start");
			do {
				var bg		= Random.item(_theme.bgs),
					url		= bg ? bg.url : undefined;
			} while (url == _lastBgUrl && _theme.bgs.length > 1)
			App.log("ViewBgs::swapBg...while end");

			_lastBgUrl		= url;

			var $bgs		= $list.children("li");
				$bgs.stop(true);
				$bgs		= null;

			var $bg	= $("<li style=\"background-image: url('" + url + "');\"></li>");
				$bg.css("opacity", 0);
				$bg.animate({ "opacity": 1 }, FADE_IN_DURATION, "swing", onFadeIn);

			$list.append($bg);

		}

	}

	function startAttract() {

		App.log("ViewBgs::startAttract()");

		clearInterval(_attractInterval);
		_attractInterval	= setInterval(onAttractInterval, ATTRACT_INTERVAL);

	}
	function endAttract() {

		App.log("ViewBgs::endAttract()");

		clearInterval(_attractInterval);

	}


	// Helpers
	/////////////////////////////////////////////


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewBgs, bwco.events.Dispatcher);

