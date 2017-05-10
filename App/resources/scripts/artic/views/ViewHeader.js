
function ViewHeader($view) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher			= bwco.events.Dispatcher;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var ATTRACT_INTERVAL	= 5000;


	// Elements
	/////////////////////////////////////////////

	var $nav,
		$navItems,
		$attractIcons,
		$helpBtn,
		$creditsBtn;


	// Vars
	/////////////////////////////////////////////

	var _self				= this;

	var _appModel,
		_helpModel;

	var _intervalAttract;

	var _attractIndex;

	var _attractAnims		= [];

	var _helpBtn,
		_creditsBtn;


	// Public
	/////////////////////////////////////////////


	// Event handlers
	/////////////////////////////////////////////

	function onAppStateUpdate(e) {

		if (e.state == AppState.ATTRACT) {
			clearDescription();
			startAttract();

		} else {
			endAttract();
			selectStep();
		}

	}
	function onPromptIndexUpdate(e) { }

	function onHelpModelUpdate(e) {

		$helpBtn.toggleClass("on", _helpModel.on);

	}
	function onCreditsUpdate(e) {

		$creditsBtn.toggleClass("on", _appModel.creditsOn);

	}

	function onAttractInterval() {

		App.log("ViewHeader::onAttractInterval()");

		_attractIndex	= Maths.wrap(++_attractIndex, 0, 3);

		$navItems.each(function(i) {
			$(this).toggleClass("selected", i == _attractIndex);
		});

		for (var i = 0; i < _attractAnims.length; i++) {
			if (i == _attractIndex) {
				_attractAnims[i].restart();
			} else {
				_attractAnims[i].pause();
			}
		}

	}

	function onHelpTap(e) {

		App.log("ViewHeader::onHelpTap()");

		if (_helpModel.on) {
			_helpModel.hide();
		} else {
			_helpModel.show();
		}

	}
	function onCreditsTap(e) {

		App.log("ViewHeader::onCreditsTap()");

		if (_appModel.creditsOn) {
			_appModel.closeCredits();
		} else {
			_appModel.openCredits();
		}

	}


	// Methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel	= AppModel.getInstance();
		_appModel.addListener(ModelEvent.CREDITS_UPDATE, onCreditsUpdate);

		_helpModel	= HelpModel.getInstance();
		_helpModel.addListener(ModelEvent.UPDATE, onHelpModelUpdate);

	}
	function initTemplate() {

		var html		= $.templates({
			markup: "#template-header"
		}).render({
			strings: _appModel.strings
		});

		$view.html(html);

		$nav				= $view.find("ul.nav");
		$navItems			= $nav.find("li");
		$attractIcons		= $view.find("ul.nav li div.attract-intro div.icon");
		$helpBtn			= $view.find("#help-btn");
		$creditsBtn			= $view.find("#credits-btn");

	}
	function initEvents() {

		_appModel.addListener(ModelEvent.APP_STATE_UPDATE, onAppStateUpdate);
		_appModel.addListener(ModelEvent.PROMPT_INDEX_UPDATE, onPromptIndexUpdate);

	}
	function initBtns() {

		_helpBtn	= new TouchBtn($helpBtn);
		_helpBtn.addListener(TouchBtn.TAP, onHelpTap);

		_creditsBtn	= new TouchBtn($creditsBtn);
		_creditsBtn.addListener(TouchBtn.TAP, onCreditsTap);

	}
	function initAttractAnims() {

		var sheets	= _appModel.spriteSheetsData.attractAnims;

		$attractIcons.each(function(i) {

			var $el		= $(this),
				imgUrl	= sheets[i].img,
				sprites	= sheets[i].sprites,
				opts	= {
					initFrame: -1,
					play: false,
					loop: false
				};

			_attractAnims.push(new SpriteAnim($el, imgUrl, sprites, opts));

		});

	}

	function clearDescription() {

		App.log("ViewHeader::clearDescription()");

		$navItems.removeClass("selected");
		$navItems.removeClass("description-on");

	}
	function selectStep() {

		App.log("ViewHeader::selectStep()");

		var index	= getStateIndex(_appModel.state);

		$navItems.each(function(i) {
			$(this).toggleClass("selected", i == index);
			$(this).toggleClass("description-on", i == index);
		});

	}

	function startAttract() {

		App.log("ViewHeader::startAttract()");

		clearInterval(_intervalAttract);
		_intervalAttract	= setInterval(onAttractInterval, ATTRACT_INTERVAL);

		_attractIndex	= -1;
		onAttractInterval();

	}
	function endAttract() {

		App.log("ViewHeader::endAttract()");

		clearInterval(_intervalAttract);

	}


	// Helpers
	/////////////////////////////////////////////

	function getStateIndex(state) {

		switch (state) {

			case AppState.OFF:
			case AppState.ATTRACT:
				return -1;

			case AppState.SPIN:
				return 0;

			case AppState.BUILD:
				return 1;

			case AppState.PRINT:
			case AppState.PRINT:
				return 2;

			case AppState.TOUR:
				return 3;

		}

		return "";

	}


	// Init
	/////////////////////////////////////////////

	initModels();
	initTemplate();
	initEvents();
	initBtns();
	initAttractAnims();


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewHeader, bwco.events.Dispatcher);


