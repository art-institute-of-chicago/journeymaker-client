
function ViewHeader($header) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher			= bwco.events.Dispatcher;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var ATTRACT_INTERVAL		= 5000;

	var NAV_TEXT				= [

		{
			"kiosk": {
				"title": "<em>Spin</em> to select a theme",
				"description": "<p>Begin your journey by choosing a theme.<br>Swipe the shape to see the options!</p>"
			},
			"home": {
				"title": "<em>Spin</em> to select a theme",
				"description": "<p>Begin your journey by choosing a theme.<br>Drag the shape to see the options!</p>"
			}
		},

		{
			"kiosk": {
				"title": "<em>Build</em> a journey",
				"description": "<p>Explore these artworks. Select the ones<br>you want to take on your journey.</p>"
			},
			"home": {
				"title": "<em>Build</em> a journey",
				"description": "<p>Explore these artworks. Select the ones<br>you want to take on your journey.</p>"
			}
		},

		{
			"kiosk": {
				"title": "<em>Print</em> your custom guide",
				"description": "<p>Give your Journey Guide a personal touch by adding your name. Then send it to the printer!</p>"
			},
			"home": {
				"title": "<em>Print</em> your custom guide",
				"description": "<p>Give your Journey Guide a personal touch by adding your name. Then send it to the printer!</p>"
			}
		},

		{
			"kiosk": {
				"title": "<em>Tour</em> the galleries",
				"description": "<p>Grab your family, Journey Guide, and museum admission ticket or member card and start exploring the galleries!</p>"
			},
			"home": {
				"title": "<em>Visit</em> the Museum",
				"description": "<p>Grab your family, Journey Guide, and museum admission ticket or member card and start exploring the galleries!</p>"
			}
		}

	];


	// Elements
	/////////////////////////////////////////////

	var $nav				= $header.find("ul.nav"),
		$navItems			= $nav.find("li");

	var $attractIcons		= $header.find("ul.nav li div.attract-intro div.icon");

	var $helpBtn			= $header.find("#help-btn"),
		$creditsBtn			= $header.find("#credits-btn");


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
	function onPromptIndexUpdate(e) {

	}

	function onHelpModelUpdate(e) {

		$helpBtn.toggleClass("on", _helpModel.on);

		if (_helpModel.on) {
			$helpBtn.html("Close");
		} else {
			$helpBtn.html("Help");
		}

	}
	function onCreditsUpdate(e) {

		$creditsBtn.toggleClass("on", _appModel.creditsOn);

		if (_appModel.creditsOn) {
			$creditsBtn.html("Close");
		} else {
			$creditsBtn.html("Credits");
		}

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
	function initTexts() {

		$navItems.each(function(i) {

			var texts	= App.isKiosk ? NAV_TEXT[i].kiosk : NAV_TEXT[i].home,
				$title	= $(this).find("div.item span.title"),
				$desc	= $(this).find("div.description");

			$title.html(texts.title);
			$desc.html(texts.description);

		});

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
	initEvents();
	initBtns();
	initTexts();
	initAttractAnims();


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewHeader, bwco.events.Dispatcher);


