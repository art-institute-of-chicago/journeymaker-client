
function ViewFooter($) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Geom			= bwco.utils.Geom;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////


	// Elements
	/////////////////////////////////////////////

	var $body					= $("body"),
		$view					= $("#footer");

	var $theme,
		$themeChangeBtn,
		$themeChangeAcceptBtn,
		$themeChangeBg,
		$themeIcon,
		$themeTitle,
		$themeInfo,
		$themeIntro,
		$themeChangeScreen;

	var $trayList,
		$trayItems,
		$trayCloseBtns,
		$promptTitles;

	var $wrapContinue,
		$continueBtn;


	// Vars
	/////////////////////////////////////////////

	var _self					= this;

	var _appModel,
		_helpModel,
		_dataModel;

	var _themePanelOpen			= false,
		_polyhedronThemeIndex	= -1;

	var _themeChangeBtn,
		_themeChangeAcceptBtn,
		_themeChangeBgBtn,
		_themeChangeScreen,
		_continueBtn,
		_trayCloseBtns,
		_trayItems;

	var _trayItemBtns			= [],
		_trayCloseBtns			= [];


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"themePanelOn": {
			get: function() {
				return _themePanelOpen;
			}
		},

		"polyhedronThemeIndex": {
			set: function(val) {

				if (!_themePanelOpen) return;

				_polyhedronThemeIndex	= val;
				updateTheme(true);

			}
		}

	});


	// Public
	/////////////////////////////////////////////


	// Event handlers
	/////////////////////////////////////////////

	function onAppStateUpdate(e) {

		if (e.state == AppState.ATTRACT || e.state == AppState.PRINT) {
			closeThemeChange();
		}

		updateView();
		updateTrayItems();
		updateContinue();

	}
	function onThemeIndexUpdate(e) {

		updateTheme();
		updateContinue();

	}
	function onPromptIndexUpdate(e) {

		updateTrayItems();
		updateContinue();

	}
	function onObjsUpdate(e) {

		updateTrayItems();
		updateContinue();

	}
	function onVisitorNameUpdate(e) { }

	function onHelpModelUpdate(e) {

		if (_helpModel.on) {
			var detailOn	= $body.find("#build .wrap-obj-detail").hasClass("on");
			$view.find(".help-item").toggleClass("disabled", detailOn);
		}

	}

	function onThemeChangeTap(e) {

		App.log("ViewFooter.onThemeChangeTap()");

		if ($view.hasClass("theme-locked")) {
			_self.dispatch(ViewEvent.FOOTER_BACK);

		} else if (_themePanelOpen) {
			onThemeChangeCancel(e);

		} else {
			openThemeChange();
		}

	}
	function onThemeChangeCancel(e) {

		App.log("ViewFooter.onThemeChangeCancel()");

		_self.dispatch(ViewEvent.FOOTER_THEME_CHANGE_CANCEL);

		closeThemeChange();

	}
	function onThemeChangeAccept(e) {

		App.log("ViewFooter.onThemeChangeAccept()");

		var index	= _polyhedronThemeIndex;

		closeThemeChange();

		_self.dispatch(ViewEvent.FOOTER_THEME_CHANGE, {
			index: index
		});

	}

	function onTrayCloseBtnTap(e) {

		App.log("ViewFooter.onTrayCloseBtnTap()");

		_self.dispatch(ViewEvent.FOOTER_TRAY_OBJ_CLOSE, {
			index: _trayCloseBtns.indexOf(e.target)
		});

	}
	function onTrayItemTap(e) {

		App.log("ViewFooter.onTrayItemTap()");

		_self.dispatch(ViewEvent.FOOTER_TRAY_OBJ_TAP, {
			index: _trayItemBtns.indexOf(e.target)
		});

	}

	function onContinueTap(e) {

		App.log("ViewFooter.onContinueTap()");

		_self.dispatch(ViewEvent.FOOTER_CONTINUE);

	}


	// Methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel	= AppModel.getInstance();
		_appModel.addListener(ModelEvent.APP_STATE_UPDATE, onAppStateUpdate);
		_appModel.addListener(ModelEvent.THEME_INDEX_UPDATE, onThemeIndexUpdate);
		_appModel.addListener(ModelEvent.PROMPT_INDEX_UPDATE, onPromptIndexUpdate);
		_appModel.addListener(ModelEvent.OBJECTS_UPDATE, onObjsUpdate);
		_appModel.addListener(ModelEvent.VISITOR_NAME_UPDATE, onVisitorNameUpdate);

		_dataModel	= DataModel.getInstance();

		_helpModel	= HelpModel.getInstance();
		_helpModel.addListener(ModelEvent.UPDATE, onHelpModelUpdate);

	}
	function initTemplate() {

		var html		= $.templates({
			markup: "#template-footer"
		}).render({
			strings: _appModel.strings
		});

		$view.html(html);

		$theme					= $view.find("div.theme");
		$themeChangeBtn			= $theme.find("button.change");
		$themeChangeAcceptBtn	= $theme.find("button.accept");
		$themeChangeBg			= $theme.find("div.theme-change-bg");
		$themeIcon				= $theme.find("div.icon");
		$themeTitle				= $theme.find("h2.title");
		$themeInfo				= $theme.find("div.theme-expanded div.wrap-info");
		$themeIntro				= $themeInfo.find("p");
		$themeChangeScreen		= $view.find("div.theme-change-screen");

		$trayList				= $view.find("ol.tray");
		$trayItems				= $trayList.find("li");
		$trayCloseBtns			= $trayList.find("button.close");
		$promptTitles			= $trayList.find("p.prompt-title");

		$wrapContinue			= $view.find("div.wrap-continue");
		$continueBtn			= $wrapContinue.find("button.continue");


	}
	function initBtns() {

		_themeChangeBtn			= new TouchBtn($themeChangeBtn);
		_themeChangeAcceptBtn	= new TouchBtn($themeChangeAcceptBtn);
		_themeChangeBgBtn		= new TouchBtn($themeChangeBg, {
			enabled: false,
			enableSfx: false
		});
		_themeChangeScreen		= new TouchBtn($themeChangeScreen, {
			enabled: false
		});
		_continueBtn			= new TouchBtn($continueBtn);

		_themeChangeBtn.addListener(TouchBtn.TAP, onThemeChangeTap);
		_themeChangeAcceptBtn.addListener(TouchBtn.TAP, onThemeChangeAccept)
		_themeChangeScreen.addListener(TouchBtn.TAP, onThemeChangeCancel);
		_continueBtn.addListener(TouchBtn.TAP, onContinueTap);

		$trayItems.each(function(i) {

			var itemBtn		= new TouchBtn($trayItems.eq(i)),
				closeBtn	= new TouchBtn($trayCloseBtns.eq(i));

			_trayItemBtns.push(itemBtn);
			_trayCloseBtns.push(closeBtn);

			itemBtn.addListener(TouchBtn.TAP, onTrayItemTap);
			closeBtn.addListener(TouchBtn.TAP, onTrayCloseBtnTap);

		});

	}

	function updateView() {

		switch (_appModel.state) {

			case AppState.OFF:
			case AppState.ATTRACT:
			case AppState.SPIN:
				$view.addClass("hidden");
				$view.removeClass("theme-locked printed");
				_themeChangeBgBtn.disable();
				break;

			case AppState.BUILD:
				$view.removeClass("hidden theme-locked printed");
				_themeChangeBgBtn.enable();
				break;

			case AppState.PRINT:
				$view.removeClass("hidden printed");
				$view.addClass("theme-locked");
				_themeChangeBgBtn.enable();
				break;

			case AppState.TOUR:
				$view.removeClass("hidden");
				$view.addClass("theme-locked printed");
				_themeChangeBgBtn.disable();
				break;

		}

	}
	function updateTheme(dontUpdatePrompts) {

		var themeIndex	= (_polyhedronThemeIndex == -1) ? _appModel.themeIndex : _polyhedronThemeIndex,
			theme		= _dataModel.getTheme(themeIndex);

		$themeIcon.empty();

		if (theme.icon && theme.icon.url) {
			$themeIcon.html("<img src=\"" + theme.icon.url + "\">");
		} else {
			$themeIcon.html("<img src=\"resources/images/theme-icon-none.png\">");
		}

		$themeTitle.html(theme.title);
		$themeIntro.html(theme.intro);


		if (themeIndex != _appModel.themeIndex) {
			_themeChangeAcceptBtn.enable();
		} else {
			_themeChangeAcceptBtn.disable();
		}

		if (!dontUpdatePrompts) {

			$promptTitles.each(function(index, item) {

				var prompt	= theme.prompts[index];
				var title	= prompt.title;

				$promptTitles.eq(index).html(title);

			});

		}

	}
	function updateTrayItems() {

		// Chosen items
		/////////////////////////////////////////////

		var objs		= _appModel.objs;

		$trayItems.each(function(index) {

			var objId		= objs[index],
				$trayItem	= $(this),
				$imgWrap	= $trayItem.find("div.wrap-img"),
				$closeBtn	= $trayItem.find("button.close");

			if (objId) {

				$trayItem.addClass("chosen");

				if ($trayItem.data("obj-id") != objId) {
					$trayItem.data("obj-id", objId);
					$trayItem.addClass("adding");

					var obj		= _dataModel.getObjById(objId);

					if (!obj.img) {
						$imgWrap.empty();
						return;
					}

					var trayMaxW	= App.isKiosk ? ViewFooter.THM_MAX_W : ViewFooter.THM_MAX_W_HOME,
						rect		= Geom.getFitRect(obj.img.width, obj.img.height, 0, 0, trayMaxW, ViewFooter.THM_MAX_H),
						imgW		= rect.width,
						imgH		= rect.height;

					$closeBtn.css({
						"left": imgW / 2
					});

					$imgWrap.html("<img src=\"" + obj.img.url + "\" width=\"" + imgW + "\" height=\"" + imgH + "\">");

					setTimeout(function() {
						$trayItem.removeClass("adding");
					}, 950);

				}

			} else {
				$trayItem.removeClass("chosen");
				$trayItem.removeData("obj-id");
				$imgWrap.empty();

			}


		});


		// Current item
		/////////////////////////////////////////////

		$trayItems.removeClass("current");

		if (_appModel.state == AppState.BUILD) {
			$trayItems.eq(_appModel.promptIndex).addClass("current");
		}

	}
	function updateContinue() {

		var fiveAdded		= _appModel.objs.length == 5,
			noneMissed		= _appModel.firstMissedObjIndex == -1,
			isBuildStep		= _appModel.state == AppState.BUILD;

		var continueOn		= fiveAdded && noneMissed && isBuildStep;

		$wrapContinue.toggleClass("on", continueOn);

		if (continueOn) {
			_continueBtn.enable();
		} else {
			_continueBtn.disable();
		}

	}

	function openThemeChange() {

		App.log("ViewFooter.openThemeChange()");

		_themePanelOpen			= true;

		$view.addClass("theme-change");
		_self.dispatch(ViewEvent.FOOTER_THEME_CHANGE_OPEN);

		_themeChangeScreen.enable();
		_themeChangeBgBtn.enable();

	}
	function closeThemeChange() {

		App.log("ViewFooter.closeThemeChange()");

		_themePanelOpen			= false;
		_polyhedronThemeIndex	= -1;

		updateTheme();

		$view.removeClass("theme-change");
		_self.dispatch(ViewEvent.FOOTER_THEME_CHANGE_CLOSE);

		_themeChangeScreen.disable();
		_themeChangeBgBtn.disable();

	}


	// Helpers
	/////////////////////////////////////////////


	// Init
	/////////////////////////////////////////////

	initModels();
	initTemplate();
	initBtns();


}

// Static
/////////////////////////////////////////////

ViewFooter.THM_MAX_W		= 172;
ViewFooter.THM_MAX_H		= 122;
ViewFooter.THM_MAX_W_HOME	= 140;


// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewFooter, bwco.events.Dispatcher);

