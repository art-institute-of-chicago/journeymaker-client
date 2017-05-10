
function ViewCredits($view) {

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

	var $screen,
		$closeBtn;


	// Vars
	/////////////////////////////////////////////

	var _self			= this;

	var _appModel;

	var _screenBtn,
		_closeBtn;


	// Getters & setters
	/////////////////////////////////////////////

	// Object.defineProperties(this, { });


	// Public
	/////////////////////////////////////////////


	// Event handlers
	/////////////////////////////////////////////

	function onCreditsUpdate(e) {

		if (_appModel.creditsOn) {
			_screenBtn.addListener(TouchBtn.TAP, onScreenTap);
			_closeBtn.addListener(TouchBtn.TAP, onCloseTap);
		} else {
			_screenBtn.removeListener(TouchBtn.TAP, onScreenTap);
			_closeBtn.removeListener(TouchBtn.TAP, onCloseTap);
		}

	}

	function onCloseTap(e) {

		_appModel.closeCredits();

	}
	function onScreenTap(e) {

		_appModel.closeCredits();

	}


	// Private methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel	= AppModel.getInstance();
		_appModel.addListener(ModelEvent.CREDITS_UPDATE, onCreditsUpdate);

	}
	function initTemplate() {

		var html		= $.templates({
			markup: "#template-credits"
		}).render({
			strings: _appModel.strings
		});

		$view.html(html);

		$screen			= $view.find("div.screen");
		$closeBtn		= $view.find("button.close");

	}
	function initBtns() {

		_screenBtn	= new TouchBtn($screen);

		_closeBtn	= new TouchBtn($closeBtn);

	}


	// Helpers
	/////////////////////////////////////////////


	// Init
	/////////////////////////////////////////////

	initModels();
	initTemplate();
	initBtns();


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewCredits, bwco.events.Dispatcher);


