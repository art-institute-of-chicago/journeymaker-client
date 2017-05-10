
function Keyboard($keyboard, maxChars) {

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

	var _appModel;

	var _maxChars			= bwco.utils.defined(maxChars) ? maxChars : -1,
		_text				= "";

	var _layout				= {},
		_keys				= [];


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

	this.revert = function() {

		if (_layout.revertTo) {

			var layout	= _appModel.getKeyboardLayout(_layout.revertTo);

			if (layout) {
				_self.setLayout(layout);
			}

		}

	}

	this.append = function(text) {

		App.log("Obj::append()");

		_self.text	= _text + text;

	}

	this.backspace = function() {

		App.log("Obj::backspace()");

		deleteFromEnd();

	}

	this.setLayout = function(layout) {

		App.log("Obj::setLayout()");

		_layout		= layout;

		clearKeys();
		makeKeys();

	}


	// Event handlers
	/////////////////////////////////////////////

	function onKeyTap(e) {

		App.log("Obj::onKeyTap()");

		var $key		= e.target.$el,
			key			= getKeyByEl($key);

		if (!key) return;

		if (key.data.func) {
			switch (key.data.func) {

				case "layout":
					var layout	= _appModel.getKeyboardLayout(key.data.val);
					if (layout) {
						_self.setLayout(layout);
					}
					break;

				case "backspace":
					deleteFromEnd();
					break;

			}

		} else if (key.data.char) {
			appendText(key.data.char, _self.shiftOn);
		}

		if (key.data.func && key.data.func == "shift") {
			_self.shiftOn	= !_self.shiftOn;
		} else {
			_self.shiftOn	= false;
		}

	}


	// Private methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel	= AppModel.getInstance();

	}

	function clearKeys() {

		App.log("Obj::clearKeys()");

		$keyboard.empty();

		for (var i = 0; i < _keys.length; i++) {
			if (_keys[i] && _keys[i].btn) {
				_keys[i].btn.removeListener(TouchBtn.TAP, onKeyTap);
			}
		}

		_keys	= [];

	}
	function makeKeys() {

		App.log("Obj::makeKeys()");

		var template	= $.templates("#template-print-keyboard-key");

		for (var i = 0; i < _layout.layout.length; i++) {

			var data	= _layout.layout[i],
				$el		= $(template.render(data));

			var btn		= new TouchBtn($el);
				btn.addListener(TouchBtn.TAP, onKeyTap);

			$el.css({
				"left":  KEY_COL_W * data.col,
				"top":   KEY_ROW_H * data.row,
				"width": KEY_W + ((data.width - 1) * KEY_COL_W)
			})

			$keyboard.append($el);

			_keys.push({
				btn: btn,
				$el: $el,
				data: _layout.layout[i]
			})

		}

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

	function getKeyByEl($el) {
		for (var i = 0; i < _keys.length; i++) {
			if (_keys[i] && _keys[i].$el) {
				if ($el.is(_keys[i].$el)) {
					return _keys[i];
				}
			}
		}
		return null;
	}


	// Init
	/////////////////////////////////////////////

	initModels();


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(Keyboard, bwco.events.Dispatcher);
