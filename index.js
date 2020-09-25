import { OrbitControls } from "https://threejs.org/examples/jsm/controls/OrbitControls.js";
import "https://cdnjs.cloudflare.com/ajax/libs/simplex-noise/2.3.0/simplex-noise.min.js"; // Noise

import { RenderPass } from "https://threejs.org/examples/jsm/postprocessing/RenderPass.js";

import { MaskPass } from "https://threejs.org/examples/jsm/postprocessing/MaskPass.js";
import { CopyShader } from "https://threejs.org/examples/jsm/shaders/CopyShader.js";
import { ConvolutionShader } from "https://threejs.org/examples/jsm/shaders/ConvolutionShader.js";
import { LuminosityHighPassShader } from "https://threejs.org/examples/jsm/shaders/LuminosityHighPassShader.js";

import { ShaderPass } from "https://threejs.org/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "https://threejs.org/examples/jsm/shaders/FXAAShader.js";
import { UnrealBloomPass } from "https://threejs.org/examples/jsm/postprocessing/UnrealBloomPass.js";
import { EffectComposer } from "https://threejs.org/examples/jsm/postprocessing/EffectComposer.js";

// var noise = new SimplexNoise();

const n = noise;

let geometry, mesh, renderScene, composer;
let audioContext, audio, source, analyser, frequency_array;

// Canvas
const canvas = document.querySelector("#canvas");
const renderer = new THREE.WebGLRenderer({ canvas });
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  1,
  50000
);

// Controlls
var controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.enablePan = true;
controls.minDistance = 350;
controls.maxDistance = 2000;

function setFog(color, near, far) {
  scene.fog = new THREE.Fog(color, near, far);
}

function postProcessing() {
  //    Note for bloom https://jsfiddle.net/yp2t6op6/3/

  // Audio
  audio = new Audio();

  audio.src =
    "https://ia801609.us.archive.org/2/items/001.WolfgangAmadeusMozartRequiemK.626Lacrimosa/001.%20Wolfgang%20Amadeus%20Mozart%20-%20Requiem%20%28K.%20626%29%20-%20Lacrimosa.ogg";
  audio.controls = false;
  audio.crossOrigin = "anonymous";
  analyser = audioContext.createAnalyser();
  source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  analyser.fftSize = 32;

  frequency_array = new Uint8Array(analyser.frequencyBinCount);
  audio.play();

  var bloomStrength = 1.4;
  var bloomRadius = 0;
  var bloomThreshold = 0.1;

  geometry = new THREE.IcosahedronGeometry(50, 4);
  var material = new THREE.MeshBasicMaterial({
    color: "purple",
    linewidth: 0,
    wireframe: true,
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  renderScene = new RenderPass(scene, camera);

  var effectFXAA = new ShaderPass(FXAAShader);
  effectFXAA.uniforms["resolution"].value.set(
    1 / window.innerWidth,
    1 / window.innerHeight
  );

  var copyShader = new ShaderPass(CopyShader);
  copyShader.renderToScreen = true;

  var bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    bloomStrength,
    bloomRadius,
    bloomThreshold
  );

  composer = new EffectComposer(renderer);

  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(renderScene);
  composer.addPass(effectFXAA);
  composer.addPass(effectFXAA);
  composer.addPass(bloomPass);
  composer.addPass(copyShader);

  window.onresize = onResize;

  onResize();

  requestAnimationFrame(animate);
}

function startStuff() {
  console.log("Playing");
  audioContext = new AudioContext();
  document.getElementById("button-wrapper").style.display = "none";
  postProcessing();
}

function fractionate(value, minValue, maxValue) {
  return (value - minValue) / (maxValue - minValue);
}

function modulate(value, minValue, maxValue, outerMin, outerMax) {
  var fraction = fractionate(value, minValue, maxValue);
  var delta = outerMax - outerMin;
  return outerMin + fraction * delta;
}

function average(array) {
  var total = array.reduce(function (sum, x) {
    return sum + x;
  });
  return total / array.length;
}

function maxValue(array) {
  return array.reduce(function (a, b) {
    return Math.max(a, b);
  });
}

function onResize(e) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function makeRoughBall(mesh, bassFr, treFr, time) {
  mesh.rotation.x = time * 10;
  mesh.rotation.z = time * 10;
  mesh.rotation.y = time * 10;

  mesh.geometry.vertices.forEach(function (vertex, i) {
    var offset = mesh.geometry.parameters.radius;
    var aplitude = 1.2;

    // vertex.normalize();
    // var distance =
    //   offset +
    //   bassFr +
    //   noise.noise3D(
    //     vertex.x + time * 17,
    //     vertex.y + time * 18,
    //     vertex.z + time * 19
    //   ) *
    //     aplitude *
    //     treFr;

    vertex.normalize();
    var distance =
      offset +
      bassFr +
      (n.simplex3(
        vertex.x * 2 + time * 20,
        vertex.x * 2 + time * 20,
        vertex.x * 2 + time * 20
      ) +
        n.simplex3(
          vertex.y * 2 + time * 20,
          vertex.y * 2 + time * 20,
          vertex.y * 2 + time * 20
        ) +
        n.simplex3(
          vertex.z * 2 + time * 20,
          vertex.z * 2 + time * 20,
          vertex.z * 2 + time * 20
        )) *
        aplitude *
        treFr;
    vertex.multiplyScalar(distance);
  });
  mesh.geometry.verticesNeedUpdate = true;
  mesh.geometry.normalsNeedUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeFaceNormals();
}

function animate(time) {
  time *= 0.0001;
  analyser.getByteFrequencyData(frequency_array);

  let lowerHalfArray = frequency_array.slice(0, frequency_array.length / 2 - 1);
  let upperHalfArray = frequency_array.slice(
    frequency_array.length / 2 - 1,
    frequency_array.length - 1
  );

  let lowerMax = maxValue(lowerHalfArray);
  let upperAvg = average(upperHalfArray);
  let lowerMaxFr = lowerMax / lowerHalfArray.length;
  let upperAvgFr = upperAvg / upperHalfArray.length;

  makeRoughBall(
    mesh,
    modulate(Math.pow(lowerMaxFr, 0.7), 0, 1, 0, 8),
    modulate(upperAvgFr, 0, 1, 0, 4),
    time
  );

  controls.update();
  composer.render();
  requestAnimationFrame(animate);
}

document.getElementById("playB").onclick = startStuff;
setFog("green", 0, 2000);
