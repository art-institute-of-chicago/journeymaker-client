// Constructor
/////////////////////////////////////////////

function App($) {


	// Imports
	/////////////////////////////////////////////

	var Dispatcher			= bwco.events.Dispatcher,
		IdleModel			= bwco.idle.IdleModel,
		IdleEvent			= bwco.idle.IdleEvent,
		Pt					= bwco.geom.Pt,
		Maths				= bwco.utils.Maths,
		Random				= bwco.utils.Random,
		Strings				= bwco.utils.Strings;

	var Sound				= createjs.Sound;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var CONFIG_DEFAULTS_PATH		= "config.defaults.json";
	var CONFIG_CUSTOM_PATH			= "config.custom.json";
	var CONFIG_AUTO_PATH				= "config.auto.json";

	var SFX_SHAPE_ROTATE	= "resources/sfx/sfx-shape-rotate_artic.wav",
		MIN_TIME_PER_SFX	= 35;


	// Elements
	/////////////////////////////////////////////

	var $doc				= $(document),
		$win				= $(window),
		$body				= $("body");

	var $header				= $("#header"),
		$bgs				= $("#bgs"),
		$credits			= $("#credits");


	// Vars
	/////////////////////////////////////////////

	var _viewAttract,
		_viewBgs,
		_viewHeader,
		_viewFooter,
		_viewPolyhedron,
		_viewSpin,
		_viewBuild,
		_viewPrint;

	var _appModel,
		_config,
		_dataModel,
		_helpModel,
		_idleModel,
		_tuioModel;

	var _timeoutFreeze,
		_timeoutAdvance,
		_timeoutPrint,
		_timeoutRestartIdle;

	var _timeLastSfx;

	var _keyboardOn			= false;

	var _idleIsFromRestart	= false;


	// Event handlers
	/////////////////////////////////////////////

	function onConfigReady(e) {

		if (_config.val("isHomeCompanion")) {
			App.isHomeCompanion			= true;
			App.isKiosk					= false;
			_idleModel.timeoutSecs		= -1;
			$body.addClass("home-companion");
		} else {
			_idleModel.timeoutSecs		= _config.val("timeoutSecs", 180);
		}

		initAnalytics();

		_appModel.validateLang();
		loadContentData();

	}
	function onContentDataReady(e) {

		loadSpriteSheetsData();

	}
	function onSpriteSheetsDataReady(e) {

		_appModel.spriteSheetsData	= e;

		loadKeyboardLayoutsData();

	}
	function onKeyboardLayoutsReady(e) {

		_appModel.keyboardLayouts	= e;

		loadStringsData();

	}
	function onStringsDataReady(e) {

		_appModel.stringsData	= e;

		if (isMobile() || noWebGL()) {
			showUnsupportedBrowserMsg();
		} else {
			preloadBgImgs();
			start();
		}

	}

	function onConfigError(e) {
		console.log("Problem loading config.json file.");
	}
	function onContentDataError(e) {
		var lang	= _appModel.lang,
			path	= lang ? lang.contentPath : "undefined";

		console.log("Problem loading content json (" + path + ").");
	}
	function onSpriteSheetsDataError(e) {
		console.log("Problem loading sprites sheet json (" + _config.val("spriteSheetsPath") + ").");
	}
	function onKeyboardLayoutsError(e) {
		console.log("Problem loading keyboard layouts json (" + _config.val("keyboardLayoutsPath") + ").");
	}
	function onStringsDataError(e) {
		console.log("Problem loading strings json (" + _config.val("stringsPath") + ").");
	}

	function onAppStateUpdate(e) {

		var state	= _appModel.state;

		if (state == AppState.ATTRACT) {
			_idleModel.startIdle();
			$body.addClass("attract");
			_viewAttract.show();
		} else {
			$body.removeClass("attract");
			_viewAttract.hide();
		}

		if (e.state == AppState.SPIN) {
			_appModel.reset();
			_viewSpin.show();
		} else {
			_viewSpin.hide();
		}

		if (e.state == AppState.BUILD) {
			_viewBuild.show();
		} else {
			_viewBuild.hide();
		}

		if (e.state == AppState.PRINT || e.state == AppState.TOUR) {
			_viewPrint.show();
		} else {
			_viewPrint.hide();
		}

		switch (_appModel.state) {
			case AppState.SPIN:
				App.trackPage("spin");
				break;
			case AppState.BUILD:
				App.trackPage("build/" + getThemeId());
				App.trackPage("build/" + getThemeId() + "/" + getPromptId());
				break;
			case AppState.PRINT:
				App.trackPage("print");
				break;
			case AppState.TOUR:
				App.trackPage("tour");
				break;
		}

		freezeInteraction(2000);

	}
	function onThemeIndexUpdate(e) {

		_appModel.clearObjs();

		if (_appModel.state == AppState.BUILD) {
			App.trackPage("build/" + getPrevThemeId() + "/theme-change-panel/change-theme/" + getThemeId() + "/" + _viewPolyhedron.swipeCount + "-swipes");
		}

	}
	function onPromptIndexUpdate(e) {

		App.log("App::onPromptIndexUpdate: " + getPromptId());

		if (_appModel.state == AppState.BUILD) {
			App.trackPage("build/" + getThemeId() + "/" + getPromptId());
		}

	}

	function onLanguageUpdate(e) {

		var langCodes = _appModel.langCodes;

		for (var i = 0; i < langCodes.length; i++) {
			$body.removeClass("lang-" + langCodes[i]);
		}

		$body.addClass("lang-" + _appModel.langCode);

	}

	function onCreditsUpdate(e) {

		$body.toggleClass("credits-on", _appModel.creditsOn);

		if (_appModel.creditsOn) {

			switch (_appModel.state) {
				case AppState.SPIN:
					App.trackPage("credits/begin/spin");
					break;
				case AppState.BUILD:
					App.trackPage("credits/begin/build");
					break;
				case AppState.PRINT:
					App.trackPage("credits/begin/print");
					break;
				case AppState.TOUR:
					App.trackPage("credits/begin/tour");
					break;
			}

		} else {
			App.trackPage("credits/end");

		}

	}
	function onHelpModelUpdate(e) {

		$body.toggleClass("help-on", _helpModel.on);

		if (_helpModel.on) {

			_appModel.closeCredits();

			switch (_appModel.state) {

				case AppState.SPIN:
					App.trackPage("help/begin/spin");
					break;

				case AppState.BUILD:
					if (_viewFooter.themePanelOn) {
						App.trackPage("help/begin/build/theme-change-panel-open");
					} else if (_viewBuild.detailOn) {
						App.trackPage("help/begin/build/detail-open");
					} else {
						App.trackPage("help/begin/build");
					}
					break;

				case AppState.PRINT:
					if (_viewPrint.keyboardOn) {
						App.trackPage("help/begin/print/keyboard-open");
					} else if (_appModel.visitorName && _appModel.visitorName.length) {
						App.trackPage("help/begin/print/named");
					} else {
						App.trackPage("help/begin/print/unnamed");
					}
					break;

				case AppState.TOUR:
					App.trackPage("help/begin/tour");
					break;

			}
		} else {
			App.trackPage("help/end");
		}

	}

	function onFrame() {

		requestAnimationFrame(onFrame);

		_viewPolyhedron.nextFrame();

	}

	function onKeyDown(e) {

		if (!_config.val("enableDebugKeys")) return;
		if (_keyboardOn) return;

		App.log("App::onKeyDown()");
		App.log("\te.keyCode: " + e.keyCode);

		var KEY_CODE_A		= 65,
			KEY_CODE_M		= 77,
			KEY_CODE_1		= 49,
			KEY_CODE_2		= 50,
			KEY_CODE_3		= 51,
			KEY_CODE_4		= 52,
			KEY_CODE_LEFT	= 37,
			KEY_CODE_RIGHT	= 39;

		switch (e.keyCode) {

			case KEY_CODE_A:
				_idleModel.startIdle();
				break;

			case KEY_CODE_M:
				$body.toggleClass("hide-mouse");
				break;

			case KEY_CODE_1:
				_appModel.state	= AppState.SPIN;
				break;

			case KEY_CODE_2:
				_appModel.state	= AppState.BUILD;
				break;

			case KEY_CODE_3:
				debugSelectRandomObjs();
				_appModel.state	= AppState.PRINT;
				break;

			case KEY_CODE_4:
				_appModel.state	= AppState.TOUR;
				break;

		}

	}
	function onInteraction(e) {

		_idleModel.breakIdle();

		if (_helpModel.on) {

			var hitHelpBtn	= e.touchTarget && e.touchTarget.id == "help-btn";

			if (e.type == TouchEvent.END && !hitHelpBtn) {
				_helpModel.hide();
			}

		}

	}

	function onIdleBreak(e) {

		// this now doesn't do anything
		// you have to press the 'begin' button to exit attract

	}
	function onIdleTimeout(e) {

		App.log("App::onIdleTimeout()");

		switch (_appModel.state) {
			case AppState.SPIN:
				App.trackPage("session/end/timeout/spin");
				break;

			case AppState.BUILD:
				App.trackPage("session/end/timeout/build/" + getThemeId() + "/" + getPromptId());
				break;

			case AppState.PRINT:
				App.trackPage("session/end/timeout/print");
				break;

			case AppState.TOUR:
				if (_idleIsFromRestart) {
					App.trackPage("session/end/exit-btn-tap");
				} else {
					App.trackPage("session/end/timeout/tour");
				}
				break;
		}

		if (!_idleIsFromRestart && (_appModel.state != AppState.OFF)) {
			if (_appModel.langCode != "en") {
				changeToLangCode("en");
			}
		}

		_appModel.state	= AppState.ATTRACT;

	}

	function onAttractBeginTap(e) {

		if (_appModel.state == AppState.ATTRACT) {
			_appModel.state	= AppState.SPIN;
		}

		App.trackPage("session/begin");

	}
	function onAttractLanguageChange(e) {

		changeToLangCode(e.lang);

	}

	function onSpinContinueTap(e) {

		App.log("App::onSpinContinueTap()");

		App.trackPage("spin/select-theme/" + getThemeId() + "/" + _viewPolyhedron.swipeCount + "-swipes");

		_appModel.state			= AppState.BUILD;

	}

	function onSpinGhostSpin(e) {

		_viewPolyhedron.setSpin(e.spinVel);

	}

	function onObjAdded(e) {

		App.log("App::onObjAdded()");

		var isReplacement	= bwco.utils.defined(_appModel.objs[_appModel.promptIndex]);

		if (isReplacement) {
			App.trackPage("build/" + getThemeId() + "/" + getPromptId() + "/detail/replace-artwork/" + getArtworkId(e.id));
		} else {
			App.trackPage("build/" + getThemeId() + "/" + getPromptId() + "/detail/add-artwork/" + getArtworkId(e.id));
		}

		_appModel.addObj(e.id);

		freezeInteraction(900);

		clearTimeout(_timeoutAdvance);
		_timeoutAdvance	= setTimeout(advanceBuildStep, 850);

	}
	function onDetailCancel(e) {

		App.log("App::onDetailCancel()");

		App.trackPage("build/" + getThemeId() + "/" + getPromptId() + "/detail/cancel/" + getArtworkId(e.id));

	}
	function onArtworkSelect(e) {

		App.log("App::onArtworkSelect()");

		App.trackPage("build/" + getThemeId() + "/" + getPromptId() + "/select-artwork/" + getArtworkId(e.id));
		App.trackPage("build/" + getThemeId() + "/" + getPromptId() + "/detail/open/" + getArtworkId(e.id));

	}

	function onFreezeTimeout() {

		App.log("App::onFreezeTimeout()");

		clearTimeout(_timeoutFreeze);

		unfreezeInteraction();

	}

	function onCreateTap(e) {

		App.log("App::onCreateTap()");

		App.trackPage("print/print-btn-tap");

		_appModel.state			= AppState.TOUR;

		if (App.isHomeCompanion) {
			if (_config.val("enableWebPdfGeneration")) {
				createWebJourneyGuidePDF();
			} else {
				_viewPrint.onPrinterResponse({
					success: false
				});
			}

		} else {
			if (_config.val("enablePrintSocket")) {
				printJourneyGuide();
			} else {
				_viewPrint.onPrinterResponse({
					success: false
				});
			}

		}

	}
	function onFinishExitTap(e) {

		App.log("App::onFinishExitTap()");

		App.trackPage("tour/exit-btn-tap");

		restartApp();

	}
	function onNameSet(e) {

		App.log("App::onNameSet()");

		App.trackPage("print/set-name/" + e.name);

	}
	function onPrintRestartTap(e) {

		App.log("App::onPrintRestartTap()");
		App.trackPage("print/restart-btn-tap");

		restartApp();

	}
	function onFinishDownloadTap(e) {

		App.log("App::onFinishDownloadTap()");

		App.trackPage("tour/download-btn-tap");

	}
	function onFinishRedoTap(e) {

		App.log("App::onFinishRedoTap()");

		App.trackPage("tour/create-another-btn-tap");

		restartApp();

	}
	function onFinishBuyTap(e) {

		App.log("App::onFinishBuyTap()");

		App.trackPage("tour/buy-btn-tap");

	}
	function onFinishVisitTap(e) {

		App.log("App::onFinishVisitTap()");

		App.trackPage("tour/visit-btn-tap");

	}

	function onRestartIdleTimeout() {

		App.log("App::onRestartIdleTimeout()");

		_idleIsFromRestart	= false;

	}

	function onKeyboardOpen(e) {

		App.log("App::onKeyboardOpen()");

		_keyboardOn = true;

		App.trackPage("print/open-keyboard/" + (e.named ? "named" : "unnamed"));

	}
	function onKeyboardClose(e) {

		App.log("App::onKeyboardClose()");

		_keyboardOn = false;

		App.trackPage("print/close-keyboard/" + (e.named ? "named" : "unnamed"));

	}

	function onFooterThemeChangeOpen(e) {

		App.log("App::onFooterThemeChangeOpen()");

		if (App.isHomeCompanion) {
			$header.addClass("no-descriptions");
		}

		App.trackPage("build/" + getThemeId() + "/theme-change-panel/open");

		_viewPolyhedron.swipeCount	= 0;
		_viewPolyhedron.setFaceIndex(_appModel.themeIndex);
		_viewPolyhedron.show();

	}
	function onFooterThemeChangeClose(e) {

		App.log("App::onFooterThemeChangeClose()");

		_viewPolyhedron.hide(500);
		$header.removeClass("no-descriptions");

	}
	function onFooterThemeChangeCancel(e) {

		App.log("App::onFooterThemeChangeCancel()");

		App.trackPage("build/" + getThemeId() + "/theme-change-panel/cancel/" + _viewPolyhedron.swipeCount + "-swipes");
		$header.removeClass("no-descriptions");

	}
	function onFooterThemeChange(e) {

		App.log("App::onFooterThemeChange()");

		var index		= e.index;

		if (index != _appModel.themeIndex) {
			_appModel.themeIndex	= index;
			freezeInteraction(3000);
		}

	}
	function onFooterTrayObjClose(e) {

		App.log("App::onFooterTrayObjClose()");

		var index	= e.index,
			id		= _appModel.objs[index];

		_appModel.clearObj(index);

		App.trackPage("build/" + getThemeId() + "/" + getPromptId() + "/remove-artwork/" + getArtworkId(id));

	}
	function onFooterTrayObjTap(e) {

		App.log("App::onFooterTrayObjTap()");

		var index		= e.index;
		var objs		= _appModel.objs;

		if (index <= objs.length && index != _appModel.promptIndex) {

			App.trackPage("build/" + getThemeId() + "/" + getPromptId() + "/tray-item-tap/" + getPromptId(index));
			_appModel.promptIndex	= index;

			freezeInteraction(3000);

		}

	}
	function onFooterContinue(e) {

		App.log("App::onFooterContinue()");

		App.trackPage("build/" + getThemeId() + "/continue-btn-tap");

		_appModel.state	= AppState.PRINT;

	}
	function onFooterBack(e) {

		App.log("App::onFooterBack()");

		App.trackPage("print/back-btn-tap");

		_appModel.state	= AppState.BUILD;

	}

	function onPolyhedronThemeChange(e) {

		App.log("App::onPolyhedronThemeChange()");

		playRotateSfx();

		if (_appModel.state == AppState.SPIN) {
			_appModel.themeIndex				= e.index;

		} else {
			_viewFooter.polyhedronThemeIndex	= e.index;

		}

	}
	function onPolyhedronDragStart(e) {

		App.log("App::onPolyhedronDragStart()");

		if (_appModel.state == AppState.SPIN) {
			_viewSpin.shapeSpinning		= true;
		}

	}
	function onPolyhedronDragEnd(e) {

		App.log("App::onPolyhedronDragEnd()");

		if (_viewPolyhedron.firstSwipe) {
			if (_appModel.state == AppState.SPIN) {
				App.trackPage("spin/first-swipe");
			} else if (_appModel.state == AppState.BUILD) {
				App.trackPage("build/" + getThemeId() + "/theme-change-panel/first-swipe");
			}
		}

	}
	function onPolyhedronSpinEnd(e) {

		App.log("App::onPolyhedronSpinEnd()");

		if (_appModel.state == AppState.SPIN) {
			_viewSpin.shapeSpinning		= false;
		}

	}

	function onLogSocketConnect(e) {

		App.log("App::onLogSocketConnect()");

	}
	function onLogSocketError(e) {

		App.log("App::onLogSocketError()");

	}

	function onPrintSocketConnect(e) {

		App.log("App::onPrintSocketConnect()");

		var html		= makeJourneyGuideHTML();

		var socket		= e.target;
			socket.send(html);

	}
	function onPrintSocketMsg(e) {

		App.log("App::onPrintSocketMsg()");

		var socket		= e.target,
			response	= e.msg ? JSON.parse(e.msg) : null;

		if (response) {

			clearTimeout(_timeoutPrint);
			disposeSocket(socket);

			if (response.success) {
				App.trackPage("tour/printing-success/" + response.printerName);
			} else {
				if (response.printerName) {
					App.trackPage("tour/printing-error/printer-problem/" + response.printerName);
				} else {
					App.trackPage("tour/printing-error/printer-connection-problem");
				}
			}

			_viewPrint.onPrinterResponse(response);

		} else {
			App.log("\tEmpty message received from print socket");
		}

	}
	function onPrintSocketError(e) {

		App.log("App::onPrintSocketError()");

		clearTimeout(_timeoutPrint);
		disposeSocket(e.target);

		App.trackPage("tour/printing-error/socket-server-problem");

		_viewPrint.onPrinterResponse({
			success: false
		});

	}
	function onPrintSocketDisconnect(e) {

		App.log("App::onPrintSocketDisconnect()");

		clearTimeout(_timeoutPrint);
		disposeSocket(e.target);

	}

	function onPrintTimeout(socket) {

		App.log("App::onPrintTimeout()");

		clearTimeout(_timeoutPrint);
		disposeSocket(socket);

		App.trackPage("tour/printing-error/printer-connection-timeout");

		_viewPrint.onPrinterResponse({
			success: false
		});

	}

	function onWebPDFSuccess(data, textStatus, jqXHR) {

		App.log("App::onWebPDFSuccess()");

		if (data && data.length) {
			App.trackPage("tour/web-pdf-success");

			_viewPrint.onPrinterResponse({
				success: true,
				pdfUrl: data
			});

		} else {
			App.trackPage("tour/web-pdf-error/bad-response");

			_viewPrint.onPrinterResponse({
				success: false
			});

		}

	}
	function onWebPDFError(jqXHR) {

		App.log("App::onWebPDFError()");

		App.trackPage("tour/web-pdf-error/service-error");

		_viewPrint.onPrinterResponse({
			success: false
		});

	}


	// Private methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel		= AppModel.getInstance();
		_appModel.addListener(ModelEvent.APP_STATE_UPDATE, onAppStateUpdate);
		_appModel.addListener(ModelEvent.THEME_INDEX_UPDATE, onThemeIndexUpdate);
		_appModel.addListener(ModelEvent.PROMPT_INDEX_UPDATE, onPromptIndexUpdate);
		_appModel.addListener(ModelEvent.CREDITS_UPDATE, onCreditsUpdate);
		_appModel.addListener(ModelEvent.LANGUAGE_UPDATE, onLanguageUpdate);

		_config			= ConfigModel.getInstance();
		_config.addListener(ModelEvent.LOAD_ERROR, onConfigError);
		_config.addListener(ModelEvent.READY, onConfigReady);

		_dataModel		= DataModel.getInstance();
		_dataModel.addListener(ModelEvent.LOAD_ERROR, onContentDataError);
		_dataModel.addListener(ModelEvent.READY, onContentDataReady);

		_helpModel		= HelpModel.getInstance();
		_helpModel.addListener(ModelEvent.UPDATE, onHelpModelUpdate);

		_tuioModel		= TuioModel.getInstance();
		_tuioModel.addListener(TouchEvent.START, onInteraction);
		_tuioModel.addListener(TouchEvent.MOVE, onInteraction);
		_tuioModel.addListener(TouchEvent.END, onInteraction);

		_idleModel		= IdleModel.getInstance();
		_idleModel.addListener(IdleEvent.BREAK, onIdleBreak);
		_idleModel.addListener(IdleEvent.IDLE, onIdleTimeout);

	}

	function loadConfig() {
	  _config.load($, [CONFIG_DEFAULTS_PATH, CONFIG_CUSTOM_PATH, CONFIG_AUTO_PATH]);
	}
	function getContentPath() {

		return _config.has("contentPath") ? _config.val("contentPath") : _config.val("contentOrigin");

	}
	function loadContentData() {

		var lang = _appModel.lang,
		path = lang.contentPath;
		_dataModel.load($, path);

	}
	function loadSpriteSheetsData() {

		$.ajax({
			dataType: "json",
			url: _config.val("spriteSheetsPath"),
			error: onSpriteSheetsDataError,
			success: onSpriteSheetsDataReady
		});

	}
	function loadKeyboardLayoutsData() {

		$.ajax({
			dataType: "json",
			url: _config.val("keyboardLayoutsPath"),
			error: onKeyboardLayoutsError,
			success: onKeyboardLayoutsReady
		});

	}
	function loadStringsData() {

		$.ajax({
			dataType: "json",
			url: _config.val("stringsPath"),
			error: onStringsDataError,
			success: onStringsDataReady
		});

	}
	function start() {

		initLogging();
		initTouch();
		initTweening();
		initView();
		initEvents();
		initSfx();

		onFrame();

		_idleModel.startIdle();

		$body.addClass("on");

	}

	function initAnalytics() {

		App.analytics	= Analytics.getInstance();

		if (_config.val("enableAnalytics", false) && _config.val("analyticsId")) {

			var id		= _config.val("analyticsId"),
				prefix	= _config.val("analyticsPrefix", ""),
				debug	= _config.val("analyticsDebug", false);

			if (_config.val("analyticsTrackLanguage", false)) {
				var lang	= _appModel.langCode;
				if (prefix.charAt(prefix.length - 1) == "/") {
					prefix	+= lang + "/";
				} else {
					prefix	+= "/" + lang + "/";
				}
			}
			App.analytics.enable(id, prefix, debug);
		}

	}
	function initLogging() {

		if (_config.val("enableLogging", false)) {

			var host					= _config.val("loggingSocketHost"),
				protocol				= _config.val("loggingSocketProtocol");

			App.loggingEnabled			= true;

			App.logger					= new Socket(host, protocol, false); // third parameter: do not enable logging within the logger socket, as you may create infinite loops
			App.logger.label			= "Log Socket";
			App.logger.addListener(Socket.CONNECT, onLogSocketConnect);
			App.logger.addListener(Socket.ERROR, onLogSocketError);

		}

	}
	function initTouch() {

		if (_config.val("enableMouse")) {
            _tuioModel.emulateTouch = true;
        }
        else {
			$body.addClass("hide-mouse");
		}

	}
	function initTweening() {

		createjs.Ticker.timingMode	= createjs.Ticker.RAF;

	}
	function initEvents() {

		$doc.keydown(onKeyDown);

	}
	function initSfx() {

		Sound.registerSound(SFX_SHAPE_ROTATE);

	}
	function initView() {

		_viewAttract	= new ViewAttract($);
		_viewAttract.addListener(ViewEvent.ATTRACT_BEGIN_TAP, onAttractBeginTap);
		_viewAttract.addListener(ViewEvent.ATTRACT_LANGUAGE_CHANGE, onAttractLanguageChange);

		_viewSpin		= new ViewSpin($);
		_viewSpin.addListener(ViewEvent.SPIN_CONTINUE_TAP, onSpinContinueTap);
		_viewSpin.addListener(ViewEvent.SPIN_GHOST_SPIN, onSpinGhostSpin);

		_viewBuild		= new ViewBuild($);
		_viewBuild.addListener(ViewEvent.DETAIL_ADD, onObjAdded);
		_viewBuild.addListener(ViewEvent.DETAIL_CANCEL, onDetailCancel);
		_viewBuild.addListener(ViewEvent.ARTWORK_SELECT, onArtworkSelect);

		_viewPrint		= new ViewPrint($);
		_viewPrint.addListener(ViewEvent.CREATE_TAP, onCreateTap);
		_viewPrint.addListener(ViewEvent.PRINT_RESTART, onPrintRestartTap);
		_viewPrint.addListener(ViewEvent.FINISH_EXIT_TAP, onFinishExitTap);
		_viewPrint.addListener(ViewEvent.FINISH_DOWNLOAD_TAP, onFinishDownloadTap);
		_viewPrint.addListener(ViewEvent.FINISH_REDO_TAP, onFinishRedoTap);
		_viewPrint.addListener(ViewEvent.FINISH_BUY_TAP, onFinishBuyTap);
		_viewPrint.addListener(ViewEvent.FINISH_VISIT_TAP, onFinishVisitTap);
		_viewPrint.addListener(ViewEvent.NAME_SET, onNameSet);
		_viewPrint.addListener(ViewEvent.KEYBOARD_OPEN, onKeyboardOpen);
		_viewPrint.addListener(ViewEvent.KEYBOARD_CLOSE, onKeyboardClose);

		_viewPolyhedron = new ViewPolyhedron($);
		_viewPolyhedron.addListener(ViewEvent.POLYHEDRON_THEME_CHANGE, onPolyhedronThemeChange);
		_viewPolyhedron.addListener(ViewEvent.POLYHEDRON_DRAG_START, onPolyhedronDragStart);
		_viewPolyhedron.addListener(ViewEvent.POLYHEDRON_DRAG_END, onPolyhedronDragEnd);
		_viewPolyhedron.addListener(ViewEvent.POLYHEDRON_SPIN_END, onPolyhedronSpinEnd);

		_viewBgs		= new ViewBgs($bgs);
		_viewHeader		= new ViewHeader($header);
		_viewCredits	= new ViewCredits($credits);

		_viewFooter		= new ViewFooter($);
		_viewFooter.addListener(ViewEvent.FOOTER_THEME_CHANGE_OPEN, onFooterThemeChangeOpen);
		_viewFooter.addListener(ViewEvent.FOOTER_THEME_CHANGE_CLOSE, onFooterThemeChangeClose);
		_viewFooter.addListener(ViewEvent.FOOTER_THEME_CHANGE_CANCEL, onFooterThemeChangeCancel);
		_viewFooter.addListener(ViewEvent.FOOTER_THEME_CHANGE, onFooterThemeChange);
		_viewFooter.addListener(ViewEvent.FOOTER_TRAY_OBJ_CLOSE, onFooterTrayObjClose);
		_viewFooter.addListener(ViewEvent.FOOTER_TRAY_OBJ_TAP, onFooterTrayObjTap);
		_viewFooter.addListener(ViewEvent.FOOTER_CONTINUE, onFooterContinue);
		_viewFooter.addListener(ViewEvent.FOOTER_BACK, onFooterBack);

	}

	function preloadBgImgs() {

		for (var i = 0; i < _dataModel.themes.length; i++) {

			var theme	= _dataModel.themes[i],
				bgs		= theme.bgs;

			for (var j = 0; j < bgs.length; j++) {
				var bg		= bgs[j];
				if (bg && bg.url) {
					var img		= new Image();
						img.src = bg.url;
				}
			}

		}

	}

	function advanceBuildStep() {

		App.log("App::advanceBuildStep()");

		clearTimeout(_timeoutAdvance);

		var trgtIndex		= _appModel.promptIndex + 1;

		if (_appModel.state == AppState.BUILD) {

			if (trgtIndex >= 5) {
				var missedIndex = _appModel.firstMissedObjIndex;
				if (missedIndex != -1) {
					trgtIndex	= missedIndex;
				}
			}

			if (trgtIndex < 5) {
				App.trackPage("build/" + getThemeId() + "/" + getPromptId() + "/auto-advance/" + getPromptId(trgtIndex));
				_appModel.promptIndex		= trgtIndex;
				freezeInteraction(3000);
			}

		}

	}

	function freezeInteraction(delay) {

		App.log("App::freezeInteraction()", "trace");

		delay	= bwco.utils.defined(delay) ? delay : 1000;

		$body.addClass("no-interaction");

		clearTimeout(_timeoutFreeze);
		_timeoutFreeze = setTimeout(onFreezeTimeout, delay);

	}
	function unfreezeInteraction() {

		App.log("App::unfreezeInteraction()", "trace");

		$body.removeClass("no-interaction");

	}

	function playRotateSfx() {

		var timeNow		= Date.now(),
			timeSince	= timeNow - (_timeLastSfx || 0);

		if (timeSince >= MIN_TIME_PER_SFX) {
			Sound.play(SFX_SHAPE_ROTATE);
			_timeLastSfx	= timeNow;
		}

	}

	function printJourneyGuide() {

		var host		= _config.val("printSocketHost"),
			protocol	= _config.val("printSocketProtocol");

		App.log("App::printJourneyGuide()");
		App.log("\thost:     " + host);
		App.log("\tprotocol: " + protocol);

		var socket			= new Socket(host, protocol);
			socket.label	= "Print Socket";
			socket.addListener(Socket.CONNECT, onPrintSocketConnect);
			socket.addListener(Socket.MSG, onPrintSocketMsg);
			socket.addListener(Socket.ERROR, onPrintSocketError);
			socket.addListener(Socket.DISCONNECT, onPrintSocketDisconnect);

		clearTimeout(_timeoutPrint);
		var timeoutDelay	= _config.val("printTimeoutSecs", 30) * 1000;
		_timeoutPrint		= setTimeout(onPrintTimeout, timeoutDelay, socket);

	}
	function createWebJourneyGuidePDF() {

		App.log("App::createWebJourneyGuidePDF()");

		var guideHtml	= makeJourneyGuideHTML();

		$.ajax({
			type: "POST",
			url: _config.val("webPdfGeneratorPath"),
			data: { input: guideHtml },
			success: onWebPDFSuccess,
			error: onWebPDFError,
			dataType: "html"
		});

	}
	function disposeSocket(socket) {

		socket.removeListener(Socket.CONNECT, onPrintSocketConnect);
		socket.removeListener(Socket.MSG, onPrintSocketMsg);
		socket.removeListener(Socket.ERROR, onPrintSocketError);
		socket.removeListener(Socket.DISCONNECT, onPrintSocketDisconnect);

		socket.dispose();

	}

	function showUnsupportedBrowserMsg() {

		App.log("App::showUnsupportedBrowserMsg()");

		$body.addClass("unsupported-browser");
		$body.addClass("on");

		var $title	= $("#unsupported-browser h2"),
			$text	= $("#unsupported-browser p");

		if (isMobile()) {
			$title.html(_appModel.getString("unsupportedBrowserMobileTitle"));
			$text.html(_appModel.getString("unsupportedBrowserMobileText"));

		} else if (noWebGL()) {
			$title.html(_appModel.getString("unsupportedBrowserWebGLTitle"));
			$text.html(_appModel.getString("unsupportedBrowserWebGLText"));
		}

	}

	function debugSelectRandomObjs() {

		App.log("App::debugSelectRandomObjs()");

		var theme	= Random.item(_dataModel.themes);

		for (var i = 0; i < theme.prompts.length; i++) {

			var artwork		= Random.item(theme.prompts[i].artworks);

			_appModel.promptIndex	= i;
			_appModel.addObj(artwork.lookupId);

		}

	}
	function debugTestMapSorting() {

		App.log("App::debugTestMapSorting()");

		var startX			= ConfigModel.getInstance().val("guideStartX"),
			startY			= ConfigModel.getInstance().val("guideStartY"),
			startFloor		= ConfigModel.getInstance().val("guideStartFloor");

		var pts		= [];

		var minX	= startX,
			minY	= startY,
			maxX	= startX,
			maxY	= startY;

		var theme	= Random.item(_dataModel.themes);

		for (var i = 0; i < theme.prompts.length; i++) {

			var artwork		= Random.item(theme.prompts[i].artworks);

			_appModel.promptIndex	= i;
			_appModel.addObj(artwork.lookupId);

			if (!bwco.utils.defined(minX) || artwork.mapX < minX) minX = artwork.mapX;
			if (!bwco.utils.defined(maxX) || artwork.mapX > maxX) maxX = artwork.mapX;

			if (!bwco.utils.defined(minY) || artwork.mapY < minY) minY = artwork.mapY;
			if (!bwco.utils.defined(maxY) || artwork.mapY > maxY) maxY = artwork.mapY;

		}

		var MIN_X	= 100,
			MAX_X	= App.stgW() - 100,
			MIN_Y	= 100,
			MAX_Y	= App.stgH() - 100;

		var sx	= Maths.map(startX, minX, maxX, MIN_X, MAX_X),
			sy	= Maths.map(startY, minY, maxY, MIN_Y, MAX_Y);

		$body.empty();
		$body.append("<div style=\"position: absolute; left: " + sx + "px; top: " + sy + "px; width: 25px; height: 25px; background-color: #fff; border-radius: 15px\"></div>");

		for (var i = 0; i < _appModel.sortedObjs.length; i++) {

			var id				= _appModel.sortedObjs[i],
				artwork			= _dataModel.getObjById(id);

			var pt	= new Pt(artwork.mapX, artwork.mapY),
				px	= Maths.map(pt.x, minX, maxX, MIN_X, MAX_X),
				py	= Maths.map(pt.y, minY, maxY, MIN_Y, MAX_Y);

			var hue = Maths.map(i, 0, 5, 0, 330);

			$body.append("<div style=\"position: absolute; width: 10px; height: 10px; border-radius: 15px; left: " + px + "px; top: " + py + "px; background-color: hsl(" + hue + ", 100%, 50%);\"></div>");

		}


	}
	function debugPrintAllJourneyGuides() {

		// Create sets
		/////////////////////////////////////////////

		var activityIds = _config.val("activityTemplateIds");

		var sets		= [],
			setIndex	= 0;

		for (var i = 0; i < _dataModel.themes.length; i++) {
			var theme	= _dataModel.themes[i];

			for (var j = 0; j < theme.prompts.length; j++) {
				var prompt	= theme.prompts[j];

				for (var k = 0; k < prompt.artworks.length; k++) {
					var artwork = prompt.artworks[k];

					if (!sets[setIndex]) {
						sets[setIndex]	= {
							theme: theme,
							selections: [],
							visitorName: "Sample " + (setIndex + 1)
						}
					}

					/////////////////////////////////////////////

					var prompt		= _dataModel.getPromptByObjId(artwork.lookupId);
						activityId	= null;

					for (var prop in activityIds) {
						if (activityIds[prop] == artwork.activityTemplate) {
							activityId	= prop;
						}
					}

					if (!artwork.galleryName) artwork.galleryName					= "";
					if (!artwork.locationDirections) artwork.locationDirections		= "";
					if (!artwork.viewingDescription) artwork.viewingDescription		= "";

					sets[setIndex].selections.push({
						artwork: artwork,
						prompt: prompt,
						activityId: activityId
					});

					/////////////////////////////////////////////

					if (sets[setIndex].selections.length >= 5) {
						setIndex++;
					}

				}

			}

			if (sets && sets[setIndex] && sets[setIndex].selections && sets[setIndex].selections.length) {
				setIndex++;
			}

		}

		// Create HTML
		/////////////////////////////////////////////

		for (var i = 0; i < sets.length; i++) {

			var html		= $.templates({
				markup: "#template-tour-journey-guide-pdf",
				allowCode: true
			}).render({
				isHomeCompanion: false,
				strings: _appModel.strings,
				theme: sets[i].theme,
				selections: sets[i].selections,
				visitorName: sets[i].visitorName,
				lang: _appModel.langCode
			});


			App.log("App::debugPrintAllJourneyGuides...while start");
			while (!Strings.startsWith(html, "<html>")) {
				html		= html.substr(1);
			}
			App.log("App::debugPrintAllJourneyGuides...while end");

			sets[i].html	= html;

		}

		// Connect to socket
		/////////////////////////////////////////////

		var activityIds = _config.val("activityTemplateIds");

		var host		= _config.val("printSocketHost"),
			protocol	= _config.val("printSocketProtocol"),
			socket		= new Socket(host, protocol);

		socket.addListener(Socket.CONNECT, sendNextHTML);
		socket.addListener(Socket.MSG, sendNextHTML);


		// Send HTML to make PDF
		/////////////////////////////////////////////

		setIndex	= 0;

		function sendNextHTML(e) {

			var socket		= e.target,
				response	= e.msg ? JSON.parse(e.msg) : null;

			var socket	= e.target,
				nextSet = sets[setIndex];

			socket.send(nextSet.html);
			setIndex++;

		}


	}

	function restartApp() {

		clearTimeout(_timeoutRestartIdle);
		_idleIsFromRestart	= true;
		_timeoutRestartIdle	= setTimeout(onRestartIdleTimeout, 500);

		freezeInteraction(250);
		setTimeout(_idleModel.startIdle, 100);

	}

	function changeToLangCode(langCode) {

		if (!langCode || !langCode.length) return;
		if (!_appModel.isSupportedLang(langCode)) return;

		var baseUrl			= window.location.protocol + '//' + window.location.host + window.location.pathname,
			url				= baseUrl + "?lang=" + langCode;

		window.location		= url;

	}

	// Helpers
	/////////////////////////////////////////////

	function getPrevThemeId() {
		var theme	= _dataModel.themes[_appModel.prevThemeIndex];
		return theme ? theme.title.trim() : "undefined-theme";
	}
	function getThemeId() {
		var theme	= _dataModel.themes[_appModel.themeIndex];
		return theme ? theme.title.trim() : "undefined-theme";
	}
	function getPromptId(promptIndex) {
		if (!bwco.utils.defined(promptIndex)) {
			promptIndex = _appModel.promptIndex;
		}
		if (_appModel.state == AppState.BUILD && promptIndex != -1) {
			return "prompt-" + (promptIndex + 1);
		} else {
			return "undefined-prompt";
		}
	}
	function getArtworkId(lookupId) {

		var artwork		= _dataModel.getObjById(lookupId);

		return artwork.title.trim();

	}

	function makeJourneyGuideHTML() {

		var theme			= _dataModel.getTheme(_appModel.themeIndex),
			selections		= [];

		var activityIds		= _config.val("activityTemplateIds");

		for (var i = 0; i < _appModel.sortedObjs.length; i++) {

			var id				= _appModel.sortedObjs[i],
				prompt			= _dataModel.getPromptByObjId(id),
				artwork			= _dataModel.getObjById(id),
				activityId		= "dialogue";

			for (var prop in activityIds) {
				if (activityIds[prop] == artwork.activityTemplate) {
					activityId	= prop;
				}
			}

			if (!artwork.galleryName) artwork.galleryName					= "";
			if (!artwork.locationDirections) artwork.locationDirections		= "";
			if (!artwork.viewingDescription) artwork.viewingDescription		= "";

			selections.push({
				artwork: artwork,
				prompt: prompt,
				activityId: activityId
			});

		}

		var html	= $.templates({
			markup: "#template-tour-journey-guide-pdf",
			allowCode: true
		}).render({
			strings: _appModel.strings,
			isHomeCompanion: App.isHomeCompanion,
			isKiosk: App.isKiosk,
			theme: theme,
			selections: selections,
			visitorName: _appModel.visitorName,
			lang: _appModel.langCode
		});

		App.log("App::makeJourneyGuideHTML...while start");
		while (!Strings.startsWith(html, "<html>")) {
			html	= html.substr(1);
		}
		App.log("App::makeJourneyGuideHTML...while end");

		return html;

	}

	function isMobile() {
		var check = false;
		(function(a) {
			if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) {
				check = true
			}
		})(navigator.userAgent || navigator.vendor || window.opera);
		return check;
	}
	function noWebGL() {
		return !Detector.webgl;
	}


	// Init
	/////////////////////////////////////////////

	initModels();
	loadConfig();

}

// Static
/////////////////////////////////////////////

App.analytics = undefined;
App.trackPage = function(page) {

	if (App.analytics && App.analytics.enabled) {
		App.analytics.trackPage(page);
	}

}
App.trackEvent = function(category, action, label, value) {

	if (App.analytics && App.analytics.enabled) {
		App.analytics.trackEvent(category, action, label, value);
	}

}

App.loggingEnabled	= false;
App.logger			= undefined;
App.logOnlyLevel	= undefined;
App.log = function(msg, level) {

	if (!App.loggingEnabled) return;
	if (bwco.utils.defined(App.logOnlyLevel) && (level != App.logOnlyLevel)) return;

	if (App.logger && App.logger.connected) {
		App.logger.sendJSON({
			level: bwco.utils.defined(level) ? level : "debug",
			msg: msg
		});
	}

}

App.stgW = function() {
	return document.getElementById("viewport").clientWidth || 1920;
}
App.stgH = function() {
	return document.getElementById("viewport").clientHeight || 1080;
}

App.stgScaleX = function() { return (App.stgW() / 1920); }
App.stgScaleY = function() { return (App.stgH() / 1080); }
App.stgScale  = function() { return Math.min(App.stgScaleX(), App.stgScaleY()); }

App.isHomeCompanion = false;
App.isKiosk			= true;

App.getUrlParam = function(name) {

	var url	= window.location.href;

	name	= name.replace(/[\[\]]/g, "\\$&");

	var regex	= new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
		results = regex.exec(url);

	if (!results) return null;
	if (!results[2]) return '';

	return decodeURIComponent(results[2].replace(/\+/g, " "));

}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(App, bwco.events.Dispatcher);


// Init
/////////////////////////////////////////////

jQuery(App);
