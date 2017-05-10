
function ViewSpin($) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Pt				= bwco.geom.Pt;


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

	var $view					= $("#wrap-sections section#spin");

	var $bg,
		$continueBtn,
		$panel,
		$panelBtm,
		$wrapTitle,
		$themeIcon,
		$themeTitle,
		$wrapInfo,
		$introParagraph,
		$ghostHand;


	// Vars
	/////////////////////////////////////////////

	var _self			= this;

	var _on				= false;

	var _appModel,
		_tuioModel,
		_dataModel,
		_config;

	var _timeoutSpinEnd;

	var _continueBtn;

	var _ghostHandAnim,
		_ghostHandOn	= false,
		_ghostTimeouts	= {},
		_ghostVec		= new Pt(0, 0);


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"shapeSpinning": {
			set: function(val) {

				clearTimeout(_timeoutSpinEnd);

				if (val) {
					$panel.addClass("spinning");
				} else {
					_timeoutSpinEnd	= setTimeout(onSpinEndTimeout, SPIN_END_DELAY);
				}

			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.show = function() {

		App.log("ViewSpin::show()");

		_on	= true;

		$view.fadeIn();
		resetGhostHandIdleTimeout();

	}

	this.hide = function() {

		App.log("ViewSpin::hide()");

		_on	= false;

		$view.fadeOut();
		endGhostHand();

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

		clearTimeout(_timeoutSpinEnd);
		$panel.removeClass("spinning");

	}

	function onContinueTap(e) {

		App.log("ViewSpin::onContinueTap()");

		_self.dispatch(ViewEvent.SPIN_CONTINUE_TAP);

	}

	function onInteraction(e) {

		if (_on) {

			clearTimeout(_ghostTimeouts.idle);
			clearTimeout(_ghostTimeouts.down);
			clearTimeout(_ghostTimeouts.up);
			clearTimeout(_ghostTimeouts.spin);

			if (_ghostHandOn) {
				_ghostHandOn	= false;
				$ghostHand.stop(true).fadeOut(350);
			}

			resetGhostHandIdleTimeout();

		}

	}

	function onGhostHandIdleTimeout() {

		if (_ghostHandOn) return;

		startGhostHand();

	}
	function onGhostHandFinish() {

		exitGhostHand();

	}


	// Private methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel	= AppModel.getInstance();
		_appModel.addListener(ModelEvent.APP_STATE_UPDATE, onAppStateUpdate);
		_appModel.addListener(ModelEvent.THEME_INDEX_UPDATE, onThemeIndexUpdate);

		_tuioModel		= TuioModel.getInstance();
		_tuioModel.addListener(TouchEvent.START, onInteraction);
		_tuioModel.addListener(TouchEvent.MOVE, onInteraction);
		_tuioModel.addListener(TouchEvent.END, onInteraction);

		_dataModel	= DataModel.getInstance();

		_config		= ConfigModel.getInstance();

	}
	function initTemplate() {

		var html		= $.templates({
			markup: "#template-spin"
		}).render({
			strings: _appModel.strings
		});

		$view.html(html);

		$bg					= $view.find("div.bg");
		$continueBtn		= $view.find("button.continue");
		$panel				= $view.find("div.panel");
		$panelBtm			= $panel.find("div.panel-bottom");
		$wrapTitle			= $panel.find("div.wrap-title");
		$themeIcon			= $wrapTitle.find("div.icon");
		$themeTitle			= $wrapTitle.find("h3");
		$wrapInfo			= $panel.find("div.wrap-info");
		$introParagraph		= $wrapInfo.find("p");
		$ghostHand			= $("#ghost-hand");

	}
	function initBtns() {

		_continueBtn	= new TouchBtn($continueBtn);
		_continueBtn.addListener(TouchBtn.TAP, onContinueTap);

	}
	function initGhostHand() {

		var data		= _appModel.spriteSheetsData.ghostHandIn;

		_ghostHandAnim	= new SpriteAnim($ghostHand, data.img, data.sprites, {
			fps: 60,
			play: false,
			loop: false
		});

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

	function resetGhostHandIdleTimeout() {

		if (_ghostHandOn) return;

		var delay			= _config.val("spinTutorialIdleDelay") * 1000;

		if (delay < 0) return;

		clearTimeout(_ghostTimeouts.idle);
		_ghostTimeouts.idle	= setTimeout(onGhostHandIdleTimeout, delay);

	}

	function startGhostHand() {

		_ghostHandOn	= true;

		clearTimeout(_ghostTimeouts.idle);
		clearTimeout(_ghostTimeouts.down);
		clearTimeout(_ghostTimeouts.up);
		clearTimeout(_ghostTimeouts.spin);

		var spacer		= $panelBtm.width() / 10;

		var areaStart	= new Area(
			$panelBtm.offset().left + (spacer * 2),
			$panelBtm.offset().top + (spacer * 2),
			($panelBtm.width() * 1/3) - (spacer * 2),
			$panelBtm.height() - (spacer * 5)
		);
		var areaEnd		= new Area(
			$panelBtm.offset().left + ($panelBtm.width() * 3/4),
			$panelBtm.offset().top + spacer,
			($panelBtm.width() * 1/4),
			$panelBtm.height() - (spacer * 4)
		);

		/////////////////////////////////////////////

		var asx	= Math.round(areaStart.x),
			asy	= Math.round(areaStart.y),
			asw	= Math.round(areaStart.width),
			ash	= Math.round(areaStart.height);

		var aex	= Math.round(areaEnd.x),
			aey	= Math.round(areaEnd.y),
			aew	= Math.round(areaEnd.width),
			aeh	= Math.round(areaEnd.height);

		/////////////////////////////////////////////

		var ptStart		= areaStart.randomPt,
			ptEnd		= areaEnd.randomPt;

		var vec			= new Pt(ptEnd.x - ptStart.x, ptEnd.y - ptStart.y);
			vec.x		= vec.x / 45;
			vec.y		= vec.y / 45;

		$ghostHand.stop(true);
		$ghostHand.css({
			"left": ptStart.x,
			"top": ptStart.y
		});
		$ghostHand.fadeIn(750).delay(450).animate({
			"left": ptEnd.x,
			"top": ptEnd.y,
		}, 1500, "easeInOutQuart", onGhostHandFinish);

		_ghostTimeouts.spin	= setTimeout(function() {
			_self.dispatch(ViewEvent.SPIN_GHOST_SPIN, {
				spinVel: vec
			});
		}, 1750);

		_ghostTimeouts.down	= setTimeout(function() {
			_ghostHandAnim.reverse	= false;
			_ghostHandAnim.play(true);
		}, 750);

		_ghostTimeouts.up	= setTimeout(function() {
			_ghostHandAnim.reverse	= true;
			_ghostHandAnim.play(true);
		}, 2150);

	}
	function exitGhostHand() {

		_ghostHandOn	= false;

		clearTimeout(_ghostTimeouts.idle);
		clearTimeout(_ghostTimeouts.down);
		clearTimeout(_ghostTimeouts.up);
		clearTimeout(_ghostTimeouts.spin);

		$ghostHand.delay(1000).fadeOut(750);

		resetGhostHandIdleTimeout();

	}

	function endGhostHand() {

		_ghostHandOn	= false;

		clearTimeout(_ghostTimeouts.idle);
		clearTimeout(_ghostTimeouts.down);
		clearTimeout(_ghostTimeouts.up);
		clearTimeout(_ghostTimeouts.spin);

		$ghostHand.stop(true);
		$ghostHand.fadeOut(250);

	}


	// Helpers
	/////////////////////////////////////////////


	// Init
	/////////////////////////////////////////////

	initModels();
	initTemplate();
	initBtns();
	initGhostHand();

}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewSpin, bwco.events.Dispatcher);
