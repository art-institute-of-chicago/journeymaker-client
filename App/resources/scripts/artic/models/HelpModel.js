
function HelpModel() {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Vars
	/////////////////////////////////////////////

	var _self		= this;

	var _on			= false;


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"on": {
			get: function() {
				return _on;
			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.show = function() {

		if (_on) return;

		_on	= true;

		App.log("HelpModel::show()");

		_self.dispatch(ModelEvent.UPDATE);

	}

	this.hide = function() {

		if (!_on) return;

		_on	= false;

		App.log("HelpModel::hide()");

		_self.dispatch(ModelEvent.UPDATE);

	}


	// Event handlers
	/////////////////////////////////////////////


	// Methods
	/////////////////////////////////////////////


	// Helpers
	/////////////////////////////////////////////


}


// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(HelpModel, bwco.events.Dispatcher);
bwco.utils.makeSingleton(HelpModel);


