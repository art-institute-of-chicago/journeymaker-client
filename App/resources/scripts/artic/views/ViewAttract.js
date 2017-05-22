
function ViewAttract($) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var LANG_MENU_TIMEOUT		= 8000

	// Elements
	/////////////////////////////////////////////

	var $view			= $("#wrap-sections section#attract");

	var $beginBtn,
		$logo,
		$language,
		$selectBtn,
		$langItems;


	// Vars
	/////////////////////////////////////////////

	var _self			= this;

	var _appModel,
		_config;

	var _beginBtn,
		_selectBtn;

	var _langBtns		= [];

	var _index			= -1;

	var _timeoutLangMenu,
		_timeoutLangChange;


	// Getters & setters
	/////////////////////////////////////////////

	// Object.defineProperties(this, { });


	// Public
	/////////////////////////////////////////////

	this.show = function() {

		App.log("ViewAttract::show()");

		$view.stop(true);
		$view.delay(1000).fadeIn();

		$view.addClass("idle");

	}
	this.hide = function() {

		App.log("ViewAttract::hide()");

		$view.stop(true);
		$view.delay(250).fadeOut();

		$view.removeClass("idle");

	}


	// Event handlers
	/////////////////////////////////////////////

	function onBeginTap(e) {

		_self.dispatch(ViewEvent.ATTRACT_BEGIN_TAP);

	}
	function onSelectTap(e) {

		$language.toggleClass("open");

		if ($language.hasClass("open")) {
			resetLangMenuTimeout();
		} else {
			endLangMenuTimeout();
		}

	}
	function onLangBtnTap(e) {

		_index		= _langBtns.indexOf(e.target);

		updateBtns();

		resetLangMenuTimeout();
		resetLangChangeTimeout();

	}

	function onLangMenuTimeout() {

		endLangMenuTimeout();
		$language.removeClass("open");

	}
	function onLangChangeTimeout() {

		var $item		= $langItems.eq(_index),
			lang		= $item.data("lang");

		_self.dispatch(ViewEvent.ATTRACT_LANGUAGE_CHANGE, {
			"lang": lang
		});

	}


	// Private methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel	= AppModel.getInstance();
		_config		= ConfigModel.getInstance();

	}
	function initTemplate() {

		var html		= $.templates({
			markup: "#template-attract"
		}).render({
			strings: _appModel.strings,
			langs: _config.val("languages")
		});

		$view.html(html);

		$beginBtn		= $view.find("button.begin");
		$logo			= $view.find(".artic-log"),
		$language		= $view.find(".language-select");
		$selectBtn		= $language.find("button.select"),
		$langItems		= $language.find("li");

	}
	function initIndex() {

		$langItems.each(function(index) {
			if ($(this).data("lang") == _appModel.langCode) {
				_index	= index;
				return;
			}
		})

	}

	function initBtns() {

		if (App.isHomeCompanion) {

			$logo.click(function(e) {
				window.open("http://artic.edu", "_blank");
			});

		}

		_beginBtn	= new TouchBtn($beginBtn);
		_beginBtn.addListener(TouchBtn.TAP, onBeginTap);

		_selectBtn	= new TouchBtn($selectBtn);
		_selectBtn.addListener(TouchBtn.TAP, onSelectTap);

		$langItems.each(function(index) {

			var $btn			= $(this).find("button");

			if ($btn.length) {
				var btn				= new TouchBtn($btn);
					btn.addListener(TouchBtn.TAP, onLangBtnTap);

				_langBtns.push(btn);
			}

		});

		updateBtns();

	}
	function updateBtns() {

		$langItems.each(function(index) {
			$(this).toggleClass("selected", index == _index);
		})

		for (var i = 0; i < _langBtns.length; i++) {
			var btn	= _langBtns[i];
			if (i == _index) {
				btn.disable();
			} else {
				btn.enable();
			}
		}

	}

	function resetLangMenuTimeout() {

		clearTimeout(_timeoutLangMenu);
		_timeoutLangMenu	= setTimeout(onLangMenuTimeout, LANG_MENU_TIMEOUT);

	}
	function endLangMenuTimeout() {

		clearTimeout(_timeoutLangMenu);

	}

	function resetLangChangeTimeout() {

		clearTimeout(_timeoutLangChange);
		_timeoutLangChange	= setTimeout(onLangChangeTimeout, _config.val("languageChangeDelay", 500));

	}


	// Helpers
	/////////////////////////////////////////////


	// Init
	/////////////////////////////////////////////

	initModels();
	initTemplate();
	initIndex();
	initBtns();


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewAttract, bwco.events.Dispatcher);


