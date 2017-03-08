
function ViewAttract($) {

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

	var $view			= $("#wrap-sections section#attract"),
		$beginBtn		= $view.find("button.begin");


	// Vars
	/////////////////////////////////////////////

	var _self			= this;


	// Getters & setters
	/////////////////////////////////////////////

	// Object.defineProperties(this, { });


	// Public
	/////////////////////////////////////////////

	this.show = function() {

		App.log("ViewAttract::show()");

		$view.stop(true);
		$view.delay(1000).fadeIn();

		$view.addClass("idle");

	}
	this.hide = function() {

		App.log("ViewAttract::hide()");

		$view.stop(true);
		$view.delay(250).fadeOut();

		$view.removeClass("idle");

	}


	// Event handlers
	/////////////////////////////////////////////


	// Private methods
	/////////////////////////////////////////////

	function initBtn() {

		if (App.isHomeCompanion) {
			$beginBtn.text("Begin");
		}

	}


	// Helpers
	/////////////////////////////////////////////


	// Init
	/////////////////////////////////////////////

	initBtn();


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewAttract, bwco.events.Dispatcher);


