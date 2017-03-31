module.exports = THREE.HorizontalBlurShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"h": { value: 1.0 / 512.0 },
		"mouse": { value: new THREE.Vector2( 0.5, 0.75 ) },
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

		"varying vec2 vUv;",

		"void main() {",

			"vec2 position = vUv * vec2(aspect, 1.0);",
			"position -= mouse * vec2(aspect, 1.0);",
			"float mask = length(position) * 4.0;",
			"mask = smoothstep(0.0, 1.0, mask);",

			"float mult = h * mask;",
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
