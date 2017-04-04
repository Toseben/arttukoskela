(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Composer
THREE.EffectComposer = require('../lib/EffectComposer');
THREE.CopyShader = require('../lib/CopyShader');
THREE.ShaderPass = require('../lib/ShaderPass');
THREE.RenderPass = require('../lib/RenderPass');

// Effects Shader & Pass
THREE.RGBShiftShader = require('../lib/RGBShiftShader');
THREE.VerticalBlurShader = require('../lib/VerticalBlurShader');
THREE.HorizontalBlurShader = require('../lib/HorizontalBlurShader');

AFRAME.registerSystem('deform', {

  init: function () {
    const entity = this;
    const sceneEl = this.sceneEl;
    var width = window.innerWidth;
    var height = window.innerHeight;

    if (!sceneEl.hasLoaded) {
      sceneEl.addEventListener('render-target-loaded', this.init.bind(this));
      return;
    }

    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('resize', function() {
      width = window.innerWidth;
      height = window.innerHeight;
      composer.setSize(width, height);
      const aspect = width / height;
      entity.rgbEffect.uniforms.aspect.value = aspect;
      verticalBlur.uniforms.aspect.value = aspect;
      horizontalBlur.uniforms.aspect.value = aspect;
    });

    function onMouseMove(event) {
      var xDelta = event.clientX / width;
      var yDelta = 1 - event.clientY / height;
      entity.rgbEffect.uniforms.mouse.value = new THREE.Vector2( xDelta, yDelta );
      verticalBlur.uniforms.mouse.value = new THREE.Vector2( xDelta, yDelta );
      horizontalBlur.uniforms.mouse.value = new THREE.Vector2( xDelta, yDelta );
    }

    const scene = sceneEl.object3D;
    const renderer = sceneEl.renderer;
    const camera = sceneEl.camera;

    // Passes
    var renderPass = new THREE.RenderPass(scene, camera);
    // BLUR
    var verticalBlur = new THREE.ShaderPass( THREE.VerticalBlurShader );
    verticalBlur.uniforms.aspect.value = width / height;
    verticalBlur.uniforms.size.value = new THREE.Vector2( width, height );
    var horizontalBlur = new THREE.ShaderPass( THREE.HorizontalBlurShader );
    horizontalBlur.uniforms.aspect.value = width / height;
    horizontalBlur.uniforms.size.value = new THREE.Vector2( width, height );
    // DISTORT
    this.rgbEffect = new THREE.ShaderPass( THREE.RGBShiftShader );
    this.rgbEffect.uniforms.aspect.value = width / height;
    this.rgbEffect.renderToScreen = true;

    // Create Composer
    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(verticalBlur);
    composer.addPass(horizontalBlur);
    composer.addPass(this.rgbEffect);

    // Setup
    this.composer = composer;
    this.t = 0;
    this.dt = 0;

    // Render Composer
		if (sceneEl.getAttribute('fullVersion') === "true") {
    	this.bind();
		}

  },

  // Update
  tick: function (t, dt) {
    this.t = t;
    this.dt = dt;
    this.rgbEffect.uniforms.u_time.value = t * 0.0025;
  },

  bind: function() {
    const renderer = this.sceneEl.renderer;
    const render = renderer.render;
    const system = this;
    let isDigest = false;

    renderer.render = function () {
      if (isDigest) {
        render.apply(this, arguments);
      } else {
        isDigest = true;
        system.composer.render(system.dt);
        isDigest = false;
      }
    };
  }

});

},{"../lib/CopyShader":3,"../lib/EffectComposer":4,"../lib/HorizontalBlurShader":5,"../lib/RGBShiftShader":6,"../lib/RenderPass":7,"../lib/ShaderPass":8,"../lib/VerticalBlurShader":9}],2:[function(require,module,exports){
require('./components/deform');
require('aframe-orbit-controls-component');

},{"./components/deform":1,"aframe-orbit-controls-component":10}],3:[function(require,module,exports){
module.exports = THREE.CopyShader = {

  uniforms: {

    "tDiffuse": { value: null },
    "opacity":  { value: 1.0 }

  },

  vertexShader: [

    "varying vec2 vUv;",

    "void main() {",

      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

    "}"

  ].join( "\n" ),

  fragmentShader: [

    "uniform float opacity;",

    "uniform sampler2D tDiffuse;",

    "varying vec2 vUv;",

    "void main() {",

      "vec4 texel = texture2D( tDiffuse, vUv );",
      "gl_FragColor = opacity * texel;",

    "}"

  ].join( "\n" )

};

},{}],4:[function(require,module,exports){
module.exports = THREE.EffectComposer = function ( renderer, renderTarget ) {

  this.renderer = renderer;

  if ( renderTarget === undefined ) {

    var parameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false
    };
    var size = renderer.getSize();
    renderTarget = new THREE.WebGLRenderTarget( size.width, size.height, parameters );
    renderTarget.texture.name = "EffectComposer.rt1";
  }

  this.renderTarget1 = renderTarget;
  this.renderTarget2 = renderTarget.clone();
  this.renderTarget2.texture.name = "EffectComposer.rt2";

  this.writeBuffer = this.renderTarget1;
  this.readBuffer = this.renderTarget2;

  this.passes = [];

  if ( THREE.CopyShader === undefined )
    console.error( "THREE.EffectComposer relies on THREE.CopyShader" );

  this.copyPass = new THREE.ShaderPass( THREE.CopyShader );

};

Object.assign( THREE.EffectComposer.prototype, {

  swapBuffers: function() {

    var tmp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = tmp;

  },

  addPass: function ( pass ) {

    this.passes.push( pass );

    var size = this.renderer.getSize();
    pass.setSize( size.width, size.height );

  },

  insertPass: function ( pass, index ) {

    this.passes.splice( index, 0, pass );

  },

  render: function ( delta ) {

    var maskActive = false;

    var pass, i, il = this.passes.length;

    for ( i = 0; i < il; i ++ ) {

      pass = this.passes[ i ];

      if ( pass.enabled === false ) continue;

      pass.render( this.renderer, this.writeBuffer, this.readBuffer, delta, maskActive );

      if ( pass.needsSwap ) {

        if ( maskActive ) {

          var context = this.renderer.context;

          context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );

          this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, delta );

          context.stencilFunc( context.EQUAL, 1, 0xffffffff );

        }

        this.swapBuffers();

      }

      if ( THREE.MaskPass !== undefined ) {

        if ( pass instanceof THREE.MaskPass ) {

          maskActive = true;

        } else if ( pass instanceof THREE.ClearMaskPass ) {

          maskActive = false;

        }

      }

    }

  },

  reset: function ( renderTarget ) {

    if ( renderTarget === undefined ) {

      var size = this.renderer.getSize();

      renderTarget = this.renderTarget1.clone();
      renderTarget.setSize( size.width, size.height );

    }

    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();

    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;

  },

  setSize: function ( width, height ) {

    this.renderTarget1.setSize( width, height );
    this.renderTarget2.setSize( width, height );

    for ( var i = 0; i < this.passes.length; i ++ ) {

      this.passes[i].setSize( width, height );

    }

  }

} );


THREE.Pass = function () {

  // if set to true, the pass is processed by the composer
  this.enabled = true;

  // if set to true, the pass indicates to swap read and write buffer after rendering
  this.needsSwap = true;

  // if set to true, the pass clears its buffer before rendering
  this.clear = false;

  // if set to true, the result of the pass is rendered to screen
  this.renderToScreen = false;

};

Object.assign( THREE.Pass.prototype, {

  setSize: function( width, height ) {},

  render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

    console.error( "THREE.Pass: .render() must be implemented in derived pass." );

  }

} );

},{}],5:[function(require,module,exports){
module.exports = THREE.HorizontalBlurShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"h": { value: 1.0 / 512.0 * 1.0 },
		"mouse": { value: new THREE.Vector2( 0.5, 0.5 ) },
		"size": { type: "v2" },
		"aspect": { type: "float" }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform float h;",
		"uniform float aspect;",
		"uniform vec2 mouse;",
		"uniform vec2 size;",

		"varying vec2 vUv;",

		"void main() {",

			"vec2 stretchUV = vUv * vec2(aspect, 1.0);",
			"vec2 offsetPos = stretchUV - mouse * vec2(aspect, 1.0);",
			"float mask = length(offsetPos) * 3.0;",
			"mask = smoothstep(0.0, 1.0, mask);",

			"float distFromCenter = distance(vec2(0.5, 0.5), mouse);",
			"distFromCenter = 1.25 - distFromCenter * 2.0;",

			"vec2 staticPos = vUv * vec2(aspect, 1.0);",
			"staticPos -= vec2(0.5, 0.5) * vec2(aspect, 1.0);",
			"float staticMask = length(staticPos) * 6.0 * distFromCenter;",
			"staticMask = smoothstep(-0.2, 1.0, staticMask);",

			"mask = min(mask, staticMask);",

			"float mult = h * mask * (1.0 / clamp(aspect, 0.5, 1.0));",
			"vec4 sum = vec4( 0.0 );",

			"sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * mult, vUv.y ) ) * 0.051;",
			"sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * mult, vUv.y ) ) * 0.0918;",
			"sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * mult, vUv.y ) ) * 0.12245;",
			"sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * mult, vUv.y ) ) * 0.1531;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;",
			"sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * mult, vUv.y ) ) * 0.1531;",
			"sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * mult, vUv.y ) ) * 0.12245;",
			"sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * mult, vUv.y ) ) * 0.0918;",
			"sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * mult, vUv.y ) ) * 0.051;",

			"gl_FragColor = sum;",

		"}"

	].join( "\n" )

};

},{}],6:[function(require,module,exports){
module.exports = THREE.RGBShiftShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"u_time": { value: 0.0 },
		"mouse": { value: new THREE.Vector2( 0.5, 0.5 ) },
		"aspect": { type: "float" }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform float u_time;",
		"uniform float aspect;",
		"uniform vec2 mouse;",
		"varying vec2 vUv;",

		// RANDOM
		"float random (in vec2 _st) { ",
		    "return fract(sin(dot(_st.xy,",
		                         "vec2(50.851, 75.516)))* ",
		        "100.943);",
		"}",

		// NOISE
		"float noise (in vec2 _st) {",
			"vec2 i = floor(_st);",
	    "vec2 f = fract(_st);",

	    "float a = random(i);",
	    "float b = random(i + vec2(1.0, 0.0));",
	    "float c = random(i + vec2(0.0, 1.0));",
	    "float d = random(i + vec2(1.0, 1.0));",

	    "vec2 u = f * f * (3.0 - 2.0 * f);",

	    "return mix(a, b, u.x) + ",
	            "(c - a)* u.y * (1.0 - u.x) + ",
	            "(d - b) * u.x * u.y;",
		"}",

		// FBM
		"#define NUM_OCTAVES 6",

		"float fbm ( in vec2 _st) {",
		    "float v = 0.0;",
		    "float a = 0.5;",
		    "vec2 shift = vec2(100.0);",
		    // Rotate to reduce axial bias
		    "mat2 rot = mat2(cos(0.5), sin(0.5), ",
		                    "-sin(0.5), cos(0.5));",
		    "for (int i = 0; i < NUM_OCTAVES; ++i) {",
		        "v += a * noise(_st);",
		        "_st = rot * _st * 2.4 + shift;",
		        "a *= 0.525;",
		    "}",
		    "return v;",
		"}",

		// MAIN
		"void main() {",

			"vec3 color = vec3(0.0);",

			"vec2 q = vec2(0.0);",
			"float scale = 8.0;",
			"vec2 stretchUV = vUv * vec2(aspect, 1.0);",
			"q.x = fbm( stretchUV * scale);",
			"q.y = fbm( stretchUV * scale - vec2(1.0));",

			"vec2 r = vec2(0.0);",
	    "r.x = fbm( vUv + 1.0 * q + vec2(0.5, 0.25) + 0.05 * u_time + 52.7);",
	    "r.y = fbm( vUv + 1.0 * q + vec2(0.25, 0.5) + 0.025 * u_time);",

			"vec2 position = vUv * vec2(aspect, 1.0);",
			"position -= mouse * vec2(aspect, 1.0);",
			"float mask = length(position) * 3.0;",
			"mask = smoothstep(-0.1, 1.0, mask);",

			"float distFromCenter = distance(vec2(0.5, 0.5), mouse);",
			"distFromCenter = 1.25 - distFromCenter * 2.0;",

			"vec2 staticPos = vUv * vec2(aspect, 1.0);",
			"staticPos -= vec2(0.5, 0.5) * vec2(aspect, 1.0);",
			"float staticMask = length(staticPos) * 6.0 * distFromCenter;",
			"staticMask = smoothstep(-0.4, 1.0, staticMask);",

			"mask = min(mask, staticMask);",

			"float offset = fbm(vUv + r * (mask + 0.1));",
			"offset = offset * 2.0 - 1.0;",
			"offset *= mask + 0.4;",
			"gl_FragColor = vec4(vec3(abs(offset) * 2.0), 1.0);",
			"offset *= 0.05 * 1.0;",
			"vec4 cr = texture2D(tDiffuse, vUv + offset * 1.25);",
			"vec4 cga = texture2D(tDiffuse, vUv + offset);",
			"vec4 cb = texture2D(tDiffuse, vUv + offset * 0.75);",
			"gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);",

		"}"

	].join( "\n" )

};

},{}],7:[function(require,module,exports){
module.exports = THREE.RenderPass = function ( scene, camera, overrideMaterial, clearColor, clearAlpha ) {

  THREE.Pass.call( this );

  this.scene = scene;
  this.camera = camera;

  this.overrideMaterial = overrideMaterial;

  this.clearColor = clearColor;
  this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 0;

  this.clear = true;
  this.clearDepth = false;
  this.needsSwap = false;

};

THREE.RenderPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

  constructor: THREE.RenderPass,

  render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

    var oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    this.scene.overrideMaterial = this.overrideMaterial;

    var oldClearColor, oldClearAlpha;

    if ( this.clearColor ) {

      oldClearColor = renderer.getClearColor().getHex();
      oldClearAlpha = renderer.getClearAlpha();

      renderer.setClearColor( this.clearColor, this.clearAlpha );

    }

    if ( this.clearDepth ) {

      renderer.clearDepth();

    }

    renderer.render( this.scene, this.camera, this.renderToScreen ? null : readBuffer, this.clear );

    if ( this.clearColor ) {

      renderer.setClearColor( oldClearColor, oldClearAlpha );

    }

    this.scene.overrideMaterial = null;
    renderer.autoClear = oldAutoClear;
  }

} );

},{}],8:[function(require,module,exports){
module.exports = THREE.ShaderPass = function ( shader, textureID ) {

  THREE.Pass.call( this );

  this.textureID = ( textureID !== undefined ) ? textureID : "tDiffuse";

  if ( shader instanceof THREE.ShaderMaterial ) {

    this.uniforms = shader.uniforms;

    this.material = shader;

  } else if ( shader ) {

    this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

    this.material = new THREE.ShaderMaterial( {

      defines: shader.defines || {},
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader

    } );

  }

  this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  this.scene = new THREE.Scene();

  this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
  this.quad.frustumCulled = false; // Avoid getting clipped
  this.scene.add( this.quad );

};

THREE.ShaderPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

  constructor: THREE.ShaderPass,

  render: function( renderer, writeBuffer, readBuffer, delta, maskActive ) {

    if ( this.uniforms[ this.textureID ] ) {

      this.uniforms[ this.textureID ].value = readBuffer.texture;

    }

    this.quad.material = this.material;

    if ( this.renderToScreen ) {

      renderer.render( this.scene, this.camera );

    } else {

      renderer.render( this.scene, this.camera, writeBuffer, this.clear );

    }

  }

} );

},{}],9:[function(require,module,exports){
module.exports = THREE.VerticalBlurShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"v": { value: 1.0 / 512.0 * 1.0 },
		"mouse": { value: new THREE.Vector2( 0.5, 0.5 ) },
		"size": { type: "v2" },
		"aspect": { type: "float" }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform float v;",
		"uniform float aspect;",
		"uniform vec2 mouse;",
		"uniform vec2 size;",

		"varying vec2 vUv;",

		"void main() {",

			"vec2 stretchUV = vUv * vec2(aspect, 1.0);",
			"vec2 offsetPos = stretchUV - mouse * vec2(aspect, 1.0);",
			"float mask = length(offsetPos) * 3.0;",
			"mask = smoothstep(0.0, 1.0, mask);",

			"float distFromCenter = distance(vec2(0.5, 0.5), mouse);",
			"distFromCenter = 1.25 - distFromCenter * 2.0;",

			"vec2 staticPos = vUv * vec2(aspect, 1.0);",
			"staticPos -= vec2(0.5, 0.5) * vec2(aspect, 1.0);",
			"float staticMask = length(staticPos) * 6.0 * distFromCenter;",
			"staticMask = smoothstep(-0.2, 1.0, staticMask);",

			"mask = min(mask, staticMask);",

			"float mult = v * mask * (1.0 / clamp(aspect, 0.5, 1.0));",
			"vec4 sum = vec4( 0.0 );",

			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * mult ) ) * 0.051;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * mult ) ) * 0.0918;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * mult ) ) * 0.12245;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * mult ) ) * 0.1531;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * mult ) ) * 0.1531;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * mult ) ) * 0.12245;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * mult ) ) * 0.0918;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * mult ) ) * 0.051;",

			"gl_FragColor = sum;",

		"}"

	].join( "\n" )

};

},{}],10:[function(require,module,exports){
// To avoid recalculation at every mouse movement tick
var PI_2 = Math.PI / 2;

AFRAME.registerComponent('orbit-controls', {

  schema: {
    enabled: { default: true }
  },

  init: function () {
    this.previousPosition = new THREE.Vector3();
    this.deltaPosition = new THREE.Vector3();
    this.setupMouseControls();
    this.setupHMDControls();
    this.bindMethods();

    var targetID = this.el.getAttribute('target');
    this.distance = this.el.getAttribute('distance');
    this.target3D = document.getElementById(targetID.replace('#', '')).object3D;

    window.target = this.target3D;
    window.camera = this.el;
  },

  update: function () {
    if (!this.data.enabled) { return; }
    this.controls.update();
    this.updateOrientation();
    this.updatePosition();
  },

  play: function () {
    this.previousPosition.set(0, 0, 0);
    this.addEventListeners();
  },

  pause: function () {
    this.removeEventListeners();
  },

  tick: function (t) {
    this.update();
  },

  remove: function () {
    this.pause();
  },

  bindMethods: function () {
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.releaseMouse = this.releaseMouse.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
  },

  setupMouseControls: function () {
    // The canvas where the scene is painted
    this.mouseDown = false;
    this.pitchObject = new THREE.Object3D();
    this.yawObject = new THREE.Object3D();
    this.yawObject.position.y = 10;
    this.yawObject.add(this.pitchObject);
  },

  setupHMDControls: function () {
    this.dolly = new THREE.Object3D();
    this.euler = new THREE.Euler();
    this.controls = new THREE.VRControls(this.dolly);
    this.zeroQuaternion = new THREE.Quaternion();
  },

  addEventListeners: function () {
    var sceneEl = this.el.sceneEl;
    var canvasEl = sceneEl.canvas;

    // listen for canvas to load.
    if (!canvasEl) {
      sceneEl.addEventListener('render-target-loaded', this.addEventListeners.bind(this));
      return;
    }

    // Mouse Events
    canvasEl.addEventListener('mousedown', this.onMouseDown, false);
    canvasEl.addEventListener('mousemove', this.onMouseMove, false);
    canvasEl.addEventListener('mouseup', this.releaseMouse, false);
    canvasEl.addEventListener('mouseout', this.releaseMouse, false);

    // Touch events
    canvasEl.addEventListener('touchstart', this.onTouchStart);
    canvasEl.addEventListener('touchmove', this.onTouchMove);
    canvasEl.addEventListener('touchend', this.onTouchEnd);
  },

  removeEventListeners: function () {
    var sceneEl = document.querySelector('a-scene');
    var canvasEl = sceneEl && sceneEl.canvas;
    if (!canvasEl) { return; }

    // Mouse Events
    canvasEl.removeEventListener('mousedown', this.onMouseDown);
    canvasEl.removeEventListener('mousemove', this.onMouseMove);
    canvasEl.removeEventListener('mouseup', this.releaseMouse);
    canvasEl.removeEventListener('mouseout', this.releaseMouse);

    // Touch events
    canvasEl.removeEventListener('touchstart', this.onTouchStart);
    canvasEl.removeEventListener('touchmove', this.onTouchMove);
    canvasEl.removeEventListener('touchend', this.onTouchEnd);
  },

  updateOrientation: (function () {
    var hmdEuler = new THREE.Euler();
    hmdEuler.order = 'YXZ';
    return function () {
      var pitchObject = this.pitchObject;
      var yawObject = this.yawObject;
      var hmdQuaternion = this.calculateHMDQuaternion();
      hmdEuler.setFromQuaternion(hmdQuaternion);
      this.el.setAttribute('rotation', {
        x: THREE.Math.radToDeg(hmdEuler.x) + THREE.Math.radToDeg(pitchObject.rotation.x),
        y: THREE.Math.radToDeg(hmdEuler.y) + THREE.Math.radToDeg(yawObject.rotation.y),
        z: THREE.Math.radToDeg(hmdEuler.z) + THREE.Math.radToDeg(yawObject.rotation.z)
      });
    };
  })(),

  calculateHMDQuaternion: (function () {
    var hmdQuaternion = new THREE.Quaternion();
    return function () {
      var dolly = this.dolly;
      if (!this.zeroed && !dolly.quaternion.equals(this.zeroQuaternion)) {
        this.zeroOrientation();
        this.zeroed = true;
      }
      hmdQuaternion.copy(this.zeroQuaternion).multiply(dolly.quaternion);
      return hmdQuaternion;
    };
  })(),

  updatePosition: (function () {
    var position = new THREE.Vector3();
    var quaternion = new THREE.Quaternion();
    var scale = new THREE.Vector3();
    return function () {
		var el = this.el;
		var deltaPosition = this.calculateDeltaPosition();
		var currentPosition = this.target3D.position;
		this.el.object3D.matrixWorld.decompose(position, quaternion, scale);

		deltaPosition.applyQuaternion(quaternion);

		// Reset the Camera to 0

		el.setAttribute('position', {
		    x: this.target3D.position.x,
		    y: this.target3D.position.y,
		    z: this.target3D.position.z
		});

		var targetCameraPosition = camera.object3D.translateOnAxis( new THREE.Vector3(0,0,1), this.distance ).position;

		el.setAttribute('position', {
		    x: targetCameraPosition.x,
		    y: targetCameraPosition.y,
		    z: targetCameraPosition.z
		});
    };
  })(),

  calculateDeltaPosition: function () {
    var dolly = this.dolly;
    var deltaPosition = this.deltaPosition;
    var previousPosition = this.previousPosition;
    deltaPosition.copy(dolly.position);
    deltaPosition.sub(previousPosition);
    previousPosition.copy(dolly.position);
    return deltaPosition;
  },

  updateHMDQuaternion: (function () {
    var hmdQuaternion = new THREE.Quaternion();
    return function () {
      var dolly = this.dolly;
      this.controls.update();
      if (!this.zeroed && !dolly.quaternion.equals(this.zeroQuaternion)) {
        this.zeroOrientation();
        this.zeroed = true;
      }
      hmdQuaternion.copy(this.zeroQuaternion).multiply(dolly.quaternion);
      return hmdQuaternion;
    };
  })(),

  zeroOrientation: function () {
    var euler = new THREE.Euler();
    euler.setFromQuaternion(this.dolly.quaternion.clone().inverse());
    // Cancel out roll and pitch. We want to only reset yaw
    euler.z = 0;
    euler.x = 0;
    this.zeroQuaternion.setFromEuler(euler);
  },

  onMouseMove: function (event) {
    var pitchObject = this.pitchObject;
    var yawObject = this.yawObject;
    var previousMouseEvent = this.previousMouseEvent;

    if (!this.mouseDown || !this.data.enabled) { return; }

    var movementX = event.movementX || event.mozMovementX;
    var movementY = event.movementY || event.mozMovementY;

    if (movementX === undefined || movementY === undefined) {
      movementX = event.screenX - previousMouseEvent.screenX;
      movementY = event.screenY - previousMouseEvent.screenY;
    }
    this.previousMouseEvent = event;

    yawObject.rotation.y -= movementX * 0.002;
    pitchObject.rotation.x -= movementY * 0.002;
    pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
  },

  onMouseDown: function (event) {
    this.mouseDown = true;
    this.previousMouseEvent = event;
  },

  releaseMouse: function () {
    this.mouseDown = false;
  },

  onTouchStart: function (e) {
    if (e.touches.length !== 1) { return; }
    this.touchStart = {
      x: e.touches[0].pageX,
      y: e.touches[0].pageY
    };
    this.touchStarted = true;
  },

  onTouchMove: function (e) {
    var deltaY;
    var yawObject = this.yawObject;
    if (!this.touchStarted) { return; }
    deltaY = 2 * Math.PI * (e.touches[0].pageX - this.touchStart.x) /
    this.el.sceneEl.canvas.clientWidth;
    // Limits touch orientaion to to yaw (y axis)
    yawObject.rotation.y -= deltaY * 0.5;
    this.touchStart = {
      x: e.touches[0].pageX,
      y: e.touches[0].pageY
    };
  },

  onTouchEnd: function () {
    this.touchStarted = false;
  }
});
},{}]},{},[2]);
