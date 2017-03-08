
function ViewSpin($) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var FADE_IN_INFO_DELAY		= 200,
		FADE_IN_INFO_DURATION	= 350;

	var SPIN_END_DELAY			= 450;


	// Elements
	/////////////////////////////////////////////

	var $view			= $("#wrap-sections section#spin"),
		$bg				= $view.find("div.bg"),
		$continueBtn	= $view.find("button.continue");

	var $panel			= $view.find("div.panel");

	var $wrapTitle		= $panel.find("div.wrap-title"),
		$themeIcon		= $wrapTitle.find("div.icon"),
		$themeTitle		= $wrapTitle.find("h3"),
		$wrapInfo		= $panel.find("div.wrap-info"),
		$introParagraph	= $wrapInfo.find("p");


	// Vars
	/////////////////////////////////////////////

	var _self			= this;

	var _appModel,
		_dataModel;

	var _timouetSpinEnd;

	var _continueBtn;


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"shapeSpinning": {
			set: function(val) {

				clearTimeout(_timouetSpinEnd);

				if (val) {
					$panel.addClass("spinning");
				} else {
					_timouetSpinEnd	= setTimeout(onSpinEndTimeout, SPIN_END_DELAY);
				}

			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.show = function() {

		App.log("ViewSpin::show()");

		$view.fadeIn();

	}

	this.hide = function() {

		App.log("ViewSpin::hide()");

		$view.fadeOut();

	}


	// Event handlers
	/////////////////////////////////////////////

	function onAppStateUpdate(e) { }

	function onThemeIndexUpdate(e) {

		var theme	= _dataModel.getTheme(e.index);

		updateInfo(theme);

	}

	function onSpinEndTimeout() {

		App.log("ViewSpin::onSpinEndTimeout()");

		clearTimeout(_timouetSpinEnd);
		$panel.removeClass("spinning");

	}

	function onContinueTap(e) {

		App.log("ViewSpin::onContinueTap()");

		_self.dispatch(ViewEvent.SPIN_CONTINUE_TAP);

	}


	// Private methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel	= AppModel.getInstance();
		_appModel.addListener(ModelEvent.APP_STATE_UPDATE, onAppStateUpdate);
		_appModel.addListener(ModelEvent.THEME_INDEX_UPDATE, onThemeIndexUpdate);

		_dataModel	= DataModel.getInstance();

	}

	function initView() { }

	function initBtns() {

		_continueBtn	= new TouchBtn($continueBtn);
		_continueBtn.addListener(TouchBtn.TAP, onContinueTap);

	}

	function updateInfo(theme) {

		$themeIcon.empty();

		if (theme.icon && theme.icon.url) {
			$themeIcon.html("<img src=\"" + theme.icon.url + "\">");
		} else {
			$themeIcon.html("<img src=\"resources/images/theme-icon-none.png\">");
		}

		$themeTitle.html(theme.title);
		$introParagraph.html(theme.intro);

	}


	// Helpers
	/////////////////////////////////////////////


	// Init
	/////////////////////////////////////////////

	initModels();
	initView();
	initBtns();

}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewSpin, bwco.events.Dispatcher);


