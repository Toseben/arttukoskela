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
      entity.rgbEffect.uniforms.aspect.value = width / height;
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
    //verticalBlur.uniforms.v.value = 1.0 / width;
    var horizontalBlur = new THREE.ShaderPass( THREE.HorizontalBlurShader );
    horizontalBlur.uniforms.aspect.value = width / height;
    //verticalBlur.uniforms.v.value = 1.0 / height;
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
