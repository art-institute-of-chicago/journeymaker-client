
function ViewPolyhedron($) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Keys			= bwco.utils.Keys,
		Random			= bwco.utils.Random,
		Maths			= bwco.utils.Maths;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var WEBGL_CANVAS_ID					= "render-canvas";

	var FACE_COLOR_HEXAGON				= 0xeeeeee,
		FACE_COLOR_SELECTED				= 0xcccccc,
		FACE_COLOR_OTHER				= 0xeeeeee;

	var TRUNCATED_OCTAHEDRON			= "truncatedOctahedron",
		TRUNCATED_ICOSIDODECAHEDRON		= "truncatedIcosidodecahedron",
		CUBE							= "cube";

	var DRAG_SPEED						= 0.25,
		DRAG_EASE_AMT					= 1/10,
		ROTATION_FRICTION				= 0.035;

	var FACES_SCALE						= 3.4,
		SKELETON_SCALE					= 3.5;

	var CAMERA_V3						= new THREE.Vector3(0, 0, 6),
		CAMERA_FOV						= 40;

	var AUTO_SPIN_TIMEOUT_RANGE			= new bwco.math.Range(3500, 7000),
		AUTO_SPIN_VEL_RANGE				= new bwco.math.Range(-15, 15);

	var MIN_DRAG_VEL					= 1/100;

	var TEXTURE_OUTER					= "resources/images/shape-outer-texture.png",
		TEXTURE_OUTER_ALPHA				= "resources/images/shape-outer-alpha.png",
		TEXTURE_INNER					= "resources/images/shape-inner-texture.png",
		TEXTURE_INNER_ALPHA				= "resources/images/shape-inner-alpha.png";

	var MODEL_SKELETON					= "resources/models/shape-skeleton.dae",
		MODEL_FACES						= "resources/models/shape-faces.dae";

	var FACE_ANGLES						= [
		{ norm: [ 2,  Math.sqrt(0.5) * 2,  0], turn: 1/12 },	// 1
		{ norm: [ 0,  1, -Math.sqrt(0.5) * 2], turn: 0 },		// 2
		{ norm: [ 0, -1, -Math.sqrt(0.5) * 2], turn: 0 },		// 3
		{ norm: [ 0,  1,  Math.sqrt(0.5) * 2], turn: 0 },		// 4
		{ norm: [ 2, -Math.sqrt(0.5) * 2,  0], turn: 1/12 },	// 5
		{ norm: [-2,  Math.sqrt(0.5) * 2,  0], turn: 1/12 },	// 6
		{ norm: [-2, -Math.sqrt(0.5) * 2,  0], turn: 1/12 },	// 7
		{ norm: [ 0, -1,  Math.sqrt(0.5) * 2], turn: 0 },		// 8
	];

	var FACE_INDEX_MAPPING				= [ 0, 1, 7, 6, 4, 5, 3, 2 ];


	// Elements
	/////////////////////////////////////////////

	var $wrapMain				= $("#wrap-polyhedron");

	var $polyhedron				= $("#polyhedron"),
		$wrapAnims				= $("#wrap-anims");


	// Vars
	/////////////////////////////////////////////

	var _self				= this;

	var _appModel;

	var _camera,
		_scene,
		_renderer;

	var _controls;

	var _dragVel			= new THREE.Vector2(0, 0);

	var _on					= false,
		_ready				= false;

	var _meshSkeleton,
		_meshOuter,
		_meshInner,
		_textureOuter,
		_textureInner,
		_alphaMapOuter,
		_alphaMapInner;

	var _faceQuats			= [];

	var _autoSpinTimeout,
		_hideTimeout;

	var _quatTrgt			= null,
		_quat				= new THREE.Quaternion();

	var _faceIndex			= -1;

	var _debugLines;

	var _shapeAnims			= [];

	var _firstSwipe			= true,
		_swipeCount			= 0;


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"firstSwipe": {
			get: function() {
				return _firstSwipe;
			}
		},
		"swipeCount": {
			set: function(val) {
				_swipeCount	= val;
			},
			get: function() {
				return _swipeCount;
			}
		},

	});


	// Public
	/////////////////////////////////////////////

	this.nextFrame = function() {

		if (_on && _ready) {

			updateRender();

			updateControls();
			updateDrag();
			updateRotation();

		}

	}

	this.show = function() {

		clearTimeout(_hideTimeout);

		if (_on) return;

		_on		= true;
		$wrapMain.removeClass("off");
		$polyhedron.removeClass("off");

	}
	this.hide = function(delay) {

		clearTimeout(_hideTimeout);

		if (!_on) return;

		if (delay) {
			_hideTimeout	= setTimeout(_self.hide, delay);
			return;
		}

		_on			= false;
		_dragVel.set(0, 0);

		$polyhedron.addClass("off");
		$wrapMain.addClass("off");
		_renderer.clear();

	}

	this.setFaceIndex = function(index) {

		_faceIndex		= index;
		var quat		= _faceQuats[_faceIndex][0];

		setQuat(quat);

	}

	this.setSpin = function(vel) {

		_dragVel.x	= vel.y;
		_dragVel.y	= vel.x;

		$wrapAnims.removeClass("parked");

	}


	// Event handlers
	/////////////////////////////////////////////

	function onAppStateUpdate(e) {

		_firstSwipe		= true;
		_swipeCount		= 0;

		if (e.state == AppState.SPIN) {
			_self.show();
			$wrapMain.append($polyhedron);
			$wrapMain.append($wrapAnims);
			autoSpin();

		} else {

			var $wrapFooter		= $("#footer .theme .theme-expanded .change-theme .wrap-polyhedron");

			if ($wrapFooter.length) {
				$wrapFooter.append($polyhedron);
				$wrapFooter.append($wrapAnims);
				_self.hide();
			}

		}

	}
	function onPromptIndexUpdate(e) { }

	function onFacesModelLoad(collada) {

		_meshOuter	= collada.scene.children[0].children[0];
		_meshOuter.scale.set(FACES_SCALE, FACES_SCALE, FACES_SCALE);

		_meshInner	= _meshOuter.clone();
		_meshInner.scale.set(FACES_SCALE, FACES_SCALE, FACES_SCALE);

		loadSkeletonModel();

	}
	function onSkeletonModelLoad(collada) {

		_meshSkeleton	= collada.scene.children[0].children[0];
		_meshSkeleton.scale.set(SKELETON_SCALE, SKELETON_SCALE, SKELETON_SCALE);

		loadOuterTexture();

	}

	function onOuterTextureLoad(texture) {

		_textureOuter	= texture;

		loadInnerTexture()

	}
	function onInnerTextureLoad(texture) {

		_textureInner	= texture;

		loadOuterAlphaMap()

	}
	function onOuterAlphaMapLoad(alphaMap) {

		_alphaMapOuter	= alphaMap;

		loadInnerAlphaMap();

	}
	function onInnerAlphaMapLoad(alphaMap) {

		_alphaMapInner	= alphaMap;

		calcFaceQuats();
		makeShape();

		_quat			= _faceQuats[0][0].clone();
		updateMeshQuats();

		_ready			= true;

	}

	function onDragStart(e) {

		_spinning	= true;

		setQuatTrgt(null);

		_self.dispatch(ViewEvent.POLYHEDRON_DRAG_START);
		$wrapAnims.removeClass("parked");

	}
	function onDragMove(e) { }
	function onDragEnd(e) {

		_self.dispatch(ViewEvent.POLYHEDRON_DRAG_END);

		_firstSwipe	= false;
		_swipeCount++;

	}

	function onAutoSpinTimeout() {

		App.log("ViewPolyhedron::onAutoSpinTimeout()");

		autoSpin();
		queueAutoSpin();

	}


	// Methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel	= AppModel.getInstance();
		_appModel.addListener(ModelEvent.APP_STATE_UPDATE, onAppStateUpdate);
		_appModel.addListener(ModelEvent.PROMPT_INDEX_UPDATE, onPromptIndexUpdate);

	}
	function initView() {

		var el		= $polyhedron.get(0);
		var w		= el.offsetWidth;
		var h		= el.offsetHeight;

		_camera		= new THREE.PerspectiveCamera(CAMERA_FOV, w / h, 1, 1000);
		_camera.position.set(CAMERA_V3.x, CAMERA_V3.y, CAMERA_V3.z);

		_scene		= new THREE.Scene();
		_scene.add(_camera);

		_camera.lookAt(_scene.position);

		var opts	= {
			alpha: true,
			antialias: true
		};

		_renderer	= new THREE.WebGLRenderer(opts);
		_renderer.setSize(w, h);

		el.appendChild(_renderer.domElement);

	}
	function initShapeAnims() {

		var sheets	= _appModel.spriteSheetsData.shapeAnims;

		for (var i = 0; i < sheets.length; i++) {

			var $el		= $("<div class=\"anim\"></div>"),
				imgUrl	= sheets[i].img,
				sprites	= sheets[i].sprites,
				opts	= {
					play: false,
					loop: false
				};

			if (!imgUrl || !sprites.length) continue;

			$wrapAnims.append($el);

			_shapeAnims[i]	= new SpriteAnim($el, imgUrl, sprites, opts);

		}

	}
	function initControls() {

		_controls			= new PolyhedronControls($polyhedron);

		_controls.addListener(ControlEvent.DRAG_START, onDragStart);
		_controls.addListener(ControlEvent.DRAG_MOVE, onDragMove);
		_controls.addListener(ControlEvent.DRAG_END, onDragEnd);

	}

	function loadFacesModel() {

		var loader = new THREE.ColladaLoader();
			loader.options.convertUpAxis = true;
			loader.load(MODEL_FACES, onFacesModelLoad);

	}
	function loadSkeletonModel() {

		var loader = new THREE.ColladaLoader();
			loader.options.convertUpAxis = true;
			loader.load(MODEL_SKELETON, onSkeletonModelLoad);

	}
	function loadOuterTexture() {

		var loader = new THREE.TextureLoader();
			loader.load(TEXTURE_OUTER, onOuterTextureLoad);

	}
	function loadInnerTexture() {

		var loader = new THREE.TextureLoader();
			loader.load(TEXTURE_INNER, onInnerTextureLoad);

	}
	function loadOuterAlphaMap() {

		var loader = new THREE.TextureLoader();
			loader.load(TEXTURE_OUTER_ALPHA, onOuterAlphaMapLoad);

	}
	function loadInnerAlphaMap() {

		var loader = new THREE.TextureLoader();
			loader.load(TEXTURE_INNER_ALPHA, onInnerAlphaMapLoad);

	}

	function calcFaceQuats() {

		var trgtV3	= new THREE.Vector3(0, 0, 1);

		for (var i = 0; i < FACE_ANGLES.length; i++) {

			var fa	= FACE_ANGLES[i];

			// Calc
			/////////////////////////////////////////////

			var baseV3		= new THREE.Vector3(fa.norm[0], fa.norm[1], fa.norm[2]);
				baseV3.normalize();
			var baseQuat	= new THREE.Quaternion();
				baseQuat.setFromUnitVectors(baseV3, trgtV3);
			var baseEuler	= new THREE.Euler();
				baseEuler.setFromQuaternion(baseQuat, "ZYX");

			_faceQuats[i]	= [];

			for (var j = 0; j < 6; j++) {

				var euler	= baseEuler.clone();
					euler.z	= (fa.turn + (j * 1/6)) * (Math.PI * 2);
				var quat	= new THREE.Quaternion();
					quat.setFromEuler(euler);

				_faceQuats[i].push(quat);

			}

		}

	}
	function makeShape() {

		_meshSkeleton.material	= new THREE.MeshLambertMaterial({
			color: 0xffffff
		});

		_meshInner.material		= new THREE.MeshLambertMaterial({
			map: _textureInner,
			alphaMap: _alphaMapInner,
			side: THREE.BackSide,
			transparent: false
		});

		_meshOuter.material	= new THREE.MeshLambertMaterial({
			map: _textureOuter,
			alphaMap: _alphaMapOuter,
			overdraw: true,
			transparent: true
		});

		_scene.add(_meshInner);
		_scene.add(_meshOuter);
		_scene.add(_meshSkeleton);

		var lightA = new THREE.DirectionalLight(0xffffff, 0.25);
			lightA.position.set(-1, -1, 1);
		_scene.add(lightA);

		var lightB = new THREE.DirectionalLight(0xffffff, 0.25);
			lightB.position.set(1, 1, 1);
		_scene.add(lightB);

		var lightC = new THREE.AmbientLight(0xcccccc);
		_scene.add(lightC);


	}

	function setQuatTrgt(quat) {

		App.log("ViewPolyhedron::setQuatTrgt()");

		_quatTrgt	= quat ? quat.clone() : null;

	}
	function setQuat(quat) {

		App.log("ViewPolyhedron::setQuat()");

		_quat.copy(quat);
		_quatTrgt	= null;

		parkShape();

		updateMeshQuats();
		updateAnims();

	}

	function updateControls() {

		_controls.update();

	}
	function updateDrag() {

		var SNAP_DRAG_VEL	= 4;

		if (_controls.dragging) {

			var deltaPt	= _controls.dragDelta;
				deltaPt.multiplyScalar(DRAG_SPEED);

			_dragVel.x	= bwco.utils.Maths.lerp(_dragVel.x, deltaPt.y, DRAG_EASE_AMT);
			_dragVel.y	= bwco.utils.Maths.lerp(_dragVel.y, deltaPt.x, DRAG_EASE_AMT);

		} else if (_dragVel.length()) {

			_dragVel.multiplyScalar(1 - ROTATION_FRICTION);

			if (_dragVel.length() <= SNAP_DRAG_VEL) {

				_self.dispatch(ViewEvent.POLYHEDRON_SPIN_END);

				setQuatTrgt(calcEndQuat(_quat, _dragVel));
				_dragVel.set(0, 0);

			}
		}

	}
	function updateRotation() {

		if (_dragVel.length()) {
			rotateAtVel();
			updateFaceIndex();

		} else if (_quatTrgt) {
			rotateTowardTrgt();
			updateFaceIndex();

		}

	}
	function updateFaceIndex() {

		var index	= nearestFaceIndex(_quat);

		if (index != _faceIndex) {

			_faceIndex	= index;

			updateAnims();

			_self.dispatch(ViewEvent.POLYHEDRON_THEME_CHANGE, {
				index: _faceIndex
			});

		}

	}
	function updateRender() {

		_renderer.render(_scene, _camera);

	}

	function rotateAtVel() {

		var velQuat	= getVelQuat(_dragVel);

		_quat.multiplyQuaternions(velQuat, _quat);

		updateMeshQuats();

	}
	function rotateTowardTrgt() {

		var MIN_DIFF	= 0.0025,
			PARKED_DIFF	= 0.1;

		var diff		= calcQuatDiff(_quat, _quatTrgt);

		if (diff < PARKED_DIFF) {
			parkShape();
		}

		if (diff > MIN_DIFF) {
			_quat.slerp(_quatTrgt, 1/20);

		} else {
			_quat.copy(_quatTrgt);
			setQuatTrgt(null);

		}

		updateMeshQuats();

	}
	function updateMeshQuats() {

		_meshOuter.quaternion.copy(_quat);
		_meshInner.quaternion.copy(_quat);
		_meshSkeleton.quaternion.copy(_quat);

		if (_debugLines) {
			_debugLines.quaternion.copy(_quat);
		}

	}

	function queueAutoSpin() {

		clearTimeout(_autoSpinTimeout);
		_autoSpinTimeout	= setTimeout(onAutoSpinTimeout, AUTO_SPIN_TIMEOUT_RANGE.random)

	}
	function autoSpin() {

		$wrapAnims.removeClass("parked");

		App.log("ViewPolyhedron::autoSpin...while start");
		do {

			var vel			= new THREE.Vector2(0, 0);
				vel.x		= AUTO_SPIN_VEL_RANGE.random;
				vel.y		= AUTO_SPIN_VEL_RANGE.random;

			var index		= calcEndFaceIndex(_quat, vel),
				sameFace	= index == _faceIndex;

		} while (sameFace)
		App.log("ViewPolyhedron::autoSpin...while end");

		_dragVel.x			= vel.x;
		_dragVel.y			= vel.y;

	}
	function endAutoSpin() {

		clearTimeout(_autoSpinTimeout);

	}

	function updateAnims() {

		App.log("ViewPolyhedron::updateAnims()");

		for (var i = 0; i < _shapeAnims.length; i++) {
			if (i == _faceIndex) {
				_shapeAnims[i].show();
			} else {
				_shapeAnims[i].hide();
			}
		}

	}
	function parkShape() {

		if ($wrapAnims.hasClass("parked")) return;

		App.log("ViewPolyhedron::parkShape()");

		$wrapAnims.addClass("parked");

		for (var i = 0; i < _shapeAnims.length; i++) {

			var anim	= _shapeAnims[i];

			if (anim) {
				if (i == _faceIndex) {
					if (anim.paused) {
						anim.restart();
					}
				} else {
					if (anim.playing) {
						anim.pause();
					}
				}
			}

		}
	}


	// Helpers
	/////////////////////////////////////////////

	function calcEndQuat(quat, vel) {

		quat	= _quat.clone();
		vel		= vel.clone();

		while (vel.length() > MIN_DRAG_VEL) {
			vel.multiplyScalar(1 - ROTATION_FRICTION);
			quat.multiplyQuaternions(getVelQuat(vel), quat);
		}

		return nearestFaceQuat(quat);

	}
	function calcEndFaceIndex(quat, vel) {

		quat	= _quat.clone();
		vel		= vel.clone();

		while (vel.length() > MIN_DRAG_VEL) {
			vel.multiplyScalar(1 - ROTATION_FRICTION);
			quat.multiplyQuaternions(getVelQuat(vel), quat);
		}

		return nearestFaceIndex(quat);

	}

	function nearestFaceIndex(q) {

		var minDist		= -1,
			minIndex	= -1;

		for (var i = 0; i < FACE_ANGLES.length; i++) {

			var fa		= FACE_ANGLES[i];

			var v3		= new THREE.Vector3(fa.norm[0], fa.norm[1], fa.norm[2]);
				v3.normalize();
				v3.applyQuaternion(q);

			var dist	= v3.distanceTo(CAMERA_V3);

			if (minIndex == -1 || dist < minDist) {
				minDist		= dist;
				minIndex	= i;
			}

		}

		return minIndex;

	}
	function nearestFaceQuat(q) {

		var minDiff		= -1,
			minQuat		= null;

		for (var i = 0; i < _faceQuats.length; i++) {
			for (var j = 0; j < _faceQuats[i].length; j++) {

				var diff		= calcQuatDiff(q, _faceQuats[i][j]);

				if (minQuat == null || diff < minDiff) {
					minDiff		= diff;
					minQuat		= _faceQuats[i][j];
				}

			}
		}

		return minQuat;

	}

	function calcQuatDiff(quat1, quat2) {

		var q1	= quat1.clone(),
			q2	= quat2.clone();

		q1.normalize();
		q2.normalize();

		var prod	= (q1.x * q2.x) + (q1.y * q2.y) + (q1.z * q2.z) + (q1.w * q2.w),
			diff	= Math.acos(2 * Math.pow(prod, 2) - 1);

		return diff;

	}

	function getVelQuat(vel) {

		var angleX	= bwco.utils.Geom.degToRad(vel.x),
			angleY	= bwco.utils.Geom.degToRad(vel.y);

		var euler	= new THREE.Euler(angleX, angleY, 0, 'XYZ');
		var quat	= new THREE.Quaternion();
			quat.setFromEuler(euler);

		return quat;

	}

	function makeDebugFaceAngleLines() {

		_debugLines	= new THREE.Group();

		for (var i = 0; i < FACE_ANGLES.length; i++) {

			var fa	= FACE_ANGLES[i];

			var v3		= new THREE.Vector3(fa.norm[0], fa.norm[1], fa.norm[2]);
				v3.normalize();
				v3.multiplyScalar(3);

			var mat		= new THREE.LineBasicMaterial({
				color: 0xff0066,
				linewidth: 3
			}),
				geom	= new THREE.Geometry();
				geom.vertices.push(new THREE.Vector3(0, 0, 0), v3);

			var line	= new THREE.Line(geom, mat);

			_debugLines.add(line);

		}

		_scene.add(_debugLines);

	}


	// Init
	/////////////////////////////////////////////

	initModels();
	initView();
	initShapeAnims();
	initControls();

	loadFacesModel();



}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewPolyhedron, bwco.events.Dispatcher);

