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
			"distFromCenter = 1.5 - distFromCenter * 2.0;",

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
