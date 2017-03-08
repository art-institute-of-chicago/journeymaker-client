
function Keyboard($keyboard, keysLayoutPath, maxChars) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var KEY_W			= 62,
		KEY_COL_W		= 73,
		KEY_ROW_H		= 73;


	// Elements
	/////////////////////////////////////////////


	// Vars
	/////////////////////////////////////////////

	var _self				= this;

	var _maxChars			= bwco.utils.defined(maxChars) ? maxChars : -1,
		_keysLayoutPath		= keysLayoutPath,
		_text				= "";

	var _keyBtns			= [];


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"text": {
			get: function() {
				return _text;
			},
			set: function(val) {

				val		= (bwco.utils.defined(val) && val.length) ? val : "";

				App.log("Obj::text: " + val);

				if (_maxChars > 0) {
					if (val.length > _maxChars) {
						val	= val.substr(0, _maxChars);
					}
				}

				if (val != _text) {
					_text	= val;
					_self.dispatch(KeyboardEvent.TEXT_CHANGE, {
						text: _text
					});
				}

			}
		},

		"maxChars": {
			get: function() {
				return _maxChars;
			},
			set: function(val) {
				_maxChars	= val;

				App.log("Obj::maxChars: " + val);

				if (_maxChars > 0) {
					if (val.length > _maxChars) {
						val	= val.substr(0, _maxChars);
					}
				}
			}
		},

		"shiftOn": {
			get: function() {
				return $keyboard.hasClass("shift-on");
			},
			set: function(val) {
				App.log("Obj::shiftOn: " + val);
				$keyboard.toggleClass("shift-on", val);
			}
		},

		"empty": {
			get: function() {
				return !_text || !_text.length;
			}
		}


	});


	// Public
	/////////////////////////////////////////////

	this.clear = function() {

		App.log("Obj::clear()");

		_self.text	= "";

	}

	this.append = function(text) {

		App.log("Obj::append()");

		_self.text	= _text + text;

	}

	this.backspace = function() {

		App.log("Obj::backspace()");

		deleteFromEnd();

	}


	// Event handlers
	/////////////////////////////////////////////

	function onKeysLoadError(xhr, status) {

		App.log("Obj::onKeysLoadError()");

		alert("Could not load keyboard keys data");

	}
	function onKeysLoad(data) {

		App.log("Obj::onKeysLoad()");

		makeKeys(data);
		placeKeys();

	}

	function onKeyTap(e) {

		App.log("Obj::onKeyTap()");

		var $key		= e.target.$el;

		var char		= $key.data("char");
			hasChar		= bwco.utils.defined(char),
			isShift		= ($key.data("func") == "shift"),
			isBackspace	= ($key.data("func") == "backspace");

		if (hasChar) {
			appendText(char, _self.shiftOn);
		}

		if (isBackspace) {
			deleteFromEnd();
		}

		if (isShift) {
			_self.shiftOn	= !_self.shiftOn;
		} else {
			_self.shiftOn	= false;
		}

	}


	// Private methods
	/////////////////////////////////////////////

	function loadKeysLayout() {

		App.log("Obj::loadKeysLayout()");

		$.ajax({
			dataType: "json",
			url: _keysLayoutPath,
			error: onKeysLoadError,
			success: onKeysLoad
		});

	}

	function makeKeys(keysData) {

		App.log("Obj::makeKeys()");

		var template	= $.templates("#template-keyboard-key");

		for (var i = 0; i < keysData.length; i++) {

			var html	= template.render(keysData[i]),
				$el		= $(html);

			var btn		= new TouchBtn($el);
				btn.addListener(TouchBtn.TAP, onKeyTap);

			_keyBtns.push(btn);

			$keyboard.append($el);

		}

	}
	function placeKeys() {

		App.log("Obj::placeKeys()");

		$keyboard.find("button").each(function(i) {

			var $key		= $(this);

			var keyX		= KEY_COL_W * $key.data("col"),
				keyY		= KEY_ROW_H * $key.data("row"),
				keyW		= KEY_W + (($key.data("width") - 1) * KEY_COL_W)

			$key.css({
				"left": keyX,
				"top": keyY,
				"width": keyW
			})

		})

	}

	function appendText(text, shiftOn) {

		App.log("Obj::appendText()");

		_self.text	= _self.text + (shiftOn ? text.toUpperCase() : text);

	}
	function deleteFromEnd(count) {

		App.log("Obj::deleteFromEnd()");

		count		= bwco.utils.defined(count) ? count : 1;

		_self.text	= _self.text.substr(0, _self.text.length - count);

	}


	// Helpers
	/////////////////////////////////////////////


	// Init
	/////////////////////////////////////////////

	loadKeysLayout();


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(Keyboard, bwco.events.Dispatcher);

