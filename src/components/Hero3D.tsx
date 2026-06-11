import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Interactive 3D hero scene (Three.js):
 * - Glowing wireframe house rotating in 3D space
 * - Depth particle field (stars) with additive glow
 * - Mouse parallax — camera eases toward the pointer
 * - Pauses when tab is hidden; respects prefers-reduced-motion
 */
export const Hero3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040814, 0.025);
    const camera = new THREE.PerspectiveCamera(60, mount.offsetWidth / mount.offsetHeight, 0.1, 100);
    camera.position.set(0, 0.5, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.offsetWidth, mount.offsetHeight);
    mount.appendChild(renderer.domElement);

    // ---- Wireframe house (line segments) ----
    const housePts: number[] = [];
    const seg = (a: number[], b: number[]) => housePts.push(...a, ...b);
    // base cube 4w x 3h x 4d, roof peak at y=5
    const A = [-2, 0, -2], B = [2, 0, -2], C = [2, 0, 2], D = [-2, 0, 2];
    const E = [-2, 3, -2], F = [2, 3, -2], G = [2, 3, 2], H = [-2, 3, 2];
    const P1 = [0, 5, -2], P2 = [0, 5, 2];
    [[A, B], [B, C], [C, D], [D, A], [E, F], [F, G], [G, H], [H, E],
     [A, E], [B, F], [C, G], [D, H],
     [E, P1], [F, P1], [H, P2], [G, P2], [P1, P2],
     // door + window
     [[-0.5, 0, 2.01], [-0.5, 1.6, 2.01]], [[0.5, 0, 2.01], [0.5, 1.6, 2.01]], [[-0.5, 1.6, 2.01], [0.5, 1.6, 2.01]],
     [[1, 1.5, 2.01], [1.7, 1.5, 2.01]], [[1.7, 1.5, 2.01], [1.7, 2.2, 2.01]], [[1.7, 2.2, 2.01], [1, 2.2, 2.01]], [[1, 2.2, 2.01], [1, 1.5, 2.01]],
    ].forEach(([a, b]) => seg(a as number[], b as number[]));

    const houseGeo = new THREE.BufferGeometry();
    houseGeo.setAttribute('position', new THREE.Float32BufferAttribute(housePts, 3));
    const house = new THREE.LineSegments(
      houseGeo,
      new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 })
    );
    house.position.set(4.5, -2.2, 0);
    scene.add(house);

    // glow vertices at house corners
    const cornerGeo = new THREE.BufferGeometry();
    cornerGeo.setAttribute('position', new THREE.Float32BufferAttribute(
      [A, B, C, D, E, F, G, H, P1, P2].flat(), 3));
    const corners = new THREE.Points(cornerGeo, new THREE.PointsMaterial({
      color: 0x67e8f9, size: 0.18, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    house.add(corners);

    // ---- Particle depth field ----
    const N = 700;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x06b6d4, size: 0.09, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    scene.add(stars);

    // second layer, blue, slower
    const stars2 = new THREE.Points(starGeo.clone(), new THREE.PointsMaterial({
      color: 0x60a5fa, size: 0.06, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    stars2.rotation.z = 1.3;
    scene.add(stars2);

    // ---- Interaction ----
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    // Scroll drive: 0 → 1 as the hero scrolls out of view
    let scrollP = 0;
    const onScroll = () => {
      scrollP = Math.min(1, Math.max(0, window.scrollY / Math.max(1, mount.offsetHeight)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    let raf = 0;
    const t0 = performance.now();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = (performance.now() - t0) / 1000;
      if (!reduced) {
        // Scroll spins the house an extra full turn and lifts it as you leave the hero
        house.rotation.y = t * 0.25 + target.x * 0.4 + scrollP * Math.PI * 2;
        house.rotation.x = target.y * 0.12 - scrollP * 0.35;
        house.position.y = -2.2 + Math.sin(t * 0.8) * 0.15 + scrollP * 4;
        stars.rotation.y = t * 0.015 + scrollP * 0.5;
        stars2.rotation.y = -t * 0.01 - scrollP * 0.3;
      }
      // Camera dollies back and rises with scroll for a fly-away feel
      camera.position.x += (target.x * 1.6 - camera.position.x) * 0.04;
      camera.position.y += (0.5 - target.y * 1.0 + scrollP * 3 - camera.position.y) * 0.04;
      camera.position.z += (14 + scrollP * 6 - camera.position.z) * 0.04;
      camera.lookAt(2, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else animate();
    };
    document.addEventListener('visibilitychange', onVis);

    const onResize = () => {
      camera.aspect = mount.offsetWidth / mount.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.offsetWidth, mount.offsetHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
      houseGeo.dispose();
      cornerGeo.dispose();
      starGeo.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />;
};

export default Hero3D;
