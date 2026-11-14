// The 3D scene for the Mission Overview page.
// IMPORTANT: this is an ILLUSTRATIVE visualization. It is not live data
// and it does not detect or simulate real radiation.

import * as THREE from "three";

const stage = document.getElementById("spacecraft-stage");

// Check that this browser can draw 3D (WebGL).
function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch (error) {
    return false;
  }
}

function startSpacecraftScene() {
  if (!stage || !webglAvailable()) {
    return; // The fallback text in the box stays visible.
  }

  // Safety net: keep the canvas inside its box even if the CSS is missing.
  stage.style.position = "relative";
  stage.style.overflow = "hidden";
  // The renderer draws the scene onto a canvas.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // The scene holds the objects. The camera is our point of view.
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 4;

  // One simple test shape: a cyan wireframe ball.
  const shape = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x7896C7, wireframe: true })
  );
  scene.add(shape);

  // Everything worked so far, so now we can replace the fallback text.
  stage.querySelector(".stage-label").hidden = true;
  stage.appendChild(renderer.domElement);

  const caption = document.createElement("p");
  caption.className = "stage-caption";
  caption.textContent = "Illustrative visualization, not live data.";
  stage.appendChild(caption);

  // Keep the canvas the same size as the box.
  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // Spin slowly, unless the visitor asked their device to reduce motion.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    function animate() {
      shape.rotation.y += 0.005;
      shape.rotation.x += 0.002;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();
  }
}

try {
  startSpacecraftScene();
} catch (error) {
  console.error("3D scene could not start:", error);
}