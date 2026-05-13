import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector2 } from 'three'

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

const float SC = 250.;
const float SC_INV = 1./SC;
const float SC_BIG = SC * 1000.0;
const float SC_INV_SMALL = 0.0005 * SC_INV;

const vec3 VEC3_Y = vec3(0., 1., 0.);

const float T_MIN = .1;
const float T_MAX = 20.;

const int OCTAVES = 4;
const float PERSISTENCE = .37;
const float LACUNARITY = 3. + 1./3.;

const vec3 WAVE_OUTLINE_COLOR = vec3(1., .956, .839);
const vec3 SUN_EMISSION_COLOR = 0.25 * vec3(1.0, 0.7, 0.4);
const vec3 SUN_GLOW_COLOR = 0.25 * vec3(1.0, 0.8, 0.6);
const vec3 SUN_COLOR = 0.2 * vec3(1.0, 0.8, 0.6);
const vec3 DIFFUSION_FACTOR = vec3(0., .6, 1.) * .1;
const vec3 CLOUD_COLOR = vec3(1.0, 0.95, 1.0);
const vec3 SKY_COLOR = vec3(0.3, 0.5, 0.85);
const vec3 HAZE_COLOR = 0.85 * vec3(0.7, 0.75, 0.85);
const vec3 FADE_COLOR = 0.68 * vec3(0.4, 0.65, 1.0);
const vec3 FOG_COLOR = 0.65 * vec3(0.4,0.65,1.0);
const vec3 ALBEDO = vec3(1.);

const vec3 LIGHT_DIR = normalize(vec3(-.8, .15, -.3));
const vec3 CAM_STEP = vec3(LIGHT_DIR.x, 0., LIGHT_DIR.z);
const vec3 CAM_POS = vec3(8., 2., 5.) + CAM_STEP;
const vec3 CAM_TARGET = vec3(1., 1., 4.) + CAM_STEP;
const float CAM_ROLL = 0.0;

const vec3 RR = vec3(sin(CAM_ROLL), cos(CAM_ROLL), 0.0);
const vec3 WW = normalize(CAM_TARGET - CAM_POS);
const vec3 UU = normalize(cross(WW, RR));
const vec3 VV = normalize(cross(UU, WW));

float noise(float x) {
    return sin(x - uTime / 2.0);
}

float fbm(float uv_x, float uv_y) {
    float value = 0.;
    float amplitude = 1.;
    float freq = 0.8;
    
    for (int i = 0; i < OCTAVES; i++) {
        value += (.25 - abs(noise(uv_x * freq) - .3) * amplitude);
        
        amplitude *= PERSISTENCE;
        freq *= LACUNARITY;
        
        float old_uv_x = uv_x;
        uv_x += uv_y/10.0;
        uv_y += old_uv_x/10.0;
    }
    
    return value;
}

vec3 getNormal(vec3 p, float t) {
    float eps_x = .001 * t;
    float p_x = p.x, p_z = p.z;
    
    return normalize(vec3(
        fbm(p_x - eps_x, p_z) - fbm(p_x + eps_x, p_z),
        2. * eps_x,
        fbm(p_x, p_z - eps_x) - fbm(p_x, p_z + eps_x)
    ));
}

float rayMarching(vec3 ro, vec3 rd) {
    float t = T_MIN;
    
	for(int i = 0; i < 300; i++) {
        vec3 pos = ro + t * rd;
		float h = pos.y - fbm(pos.x, pos.z);
		if( abs(h) < (0.0015 * t) || t > T_MAX ) break;
		t += 0.4 * h;
	}

	return t;
}

vec3 lighting(vec3 p, vec3 normal, vec3 V) {
   	vec3 diff = max(dot(normal, LIGHT_DIR) * ALBEDO, 0.);
    
    vec3 refl = normalize(reflect(LIGHT_DIR, normal));
    float spec = max(dot(refl, -normalize(V)), 0.);
    spec = pow(spec, 18.);
    spec = clamp(spec, 0., 1.);
    float sky = max(0.0, dot(VEC3_Y, normal));
    
    vec3 col = diff * WAVE_OUTLINE_COLOR;
    col += spec * WAVE_OUTLINE_COLOR;
    col += sky * DIFFUSION_FACTOR;
    
   	return col;
}

void main() {
    vec2 fragCoord = vUv * uResolution;
    vec2 uv = (fragCoord - uResolution.xy * .5) / uResolution.y;
    vec3 rd = normalize(UU * uv.x + VV * uv.y + WW);
    vec3 ro = CAM_POS;
    float t = rayMarching(ro, rd);
    
    vec3 col = vec3(0.);
    
    if (t > T_MAX) {
        float sd = clamp(dot(rd, LIGHT_DIR), 0.0, 1.0);
        float sd_p5 = sd * sd * sd * sd * sd;
        float sd_p16 = sd_p5 * sd_p5 * sd_p5 * sd;
        float sd_p64 = sd_p16 * sd_p16 * sd_p16 * sd_p16;
        float sd_p256 = sd_p64 * sd_p64 * sd_p64 * sd_p64;
        
        col = SKY_COLOR - rd.y * rd.y * 0.5;
        col = mix(col, HAZE_COLOR, pow(1.0 - max(rd.y, 0.0), 4.0));
		col += SUN_EMISSION_COLOR * sd_p5;
		col += SUN_GLOW_COLOR * sd_p64;
		col += SUN_COLOR * sd_p256 * sd_p256;
        float opt0 = (SC_BIG - ro.y) / rd.y;
        float sc_x = (ro.x + rd.x * opt0) * SC_INV_SMALL;
        float sc_y = (ro.z + rd.z * opt0) * SC_INV_SMALL;
		col = mix(col, CLOUD_COLOR, 0.5 * smoothstep(0.5, 0.8, fbm(sc_x, sc_y)));
        col = mix(col, FADE_COLOR, pow(1.0 - max(rd.y, 0.0), 16.0));
    } else {
        vec3 p = ro + rd * t;
        vec3 normal = getNormal(p, t);
        vec3 viewDir = normalize(ro - p);
        
        col = lighting(p, normal, viewDir);
        
        float fo = 1.0 - exp(-pow(30. * t * SC_INV, 1.5));
        col = mix(col, FOG_COLOR, fo);
    }
    
    col = sqrt(clamp(col, 0., 1.));
    gl_FragColor = vec4(col, 1.0);
}
`

export function WaveBackground() {
  const materialRef = useRef(null)
  const { size } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new Vector2(size.width, size.height) },
    }),
    [size.width, size.height],
  )

  useFrame((state) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    materialRef.current.uniforms.uResolution.value.set(size.width, size.height)
  })

  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
