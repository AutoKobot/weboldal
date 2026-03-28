import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useFBX, OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

interface FBXAvatarProps {
  url: string;
  className?: string;
  isFeeding?: boolean;
  isMoving?: boolean;
  isHungry?: boolean;
  currentAction?: string | null;
  animationUrls?: Record<string, string>;
}

function Model({ url, isFeeding, isMoving, isHungry, currentAction, animationUrls }: FBXAvatarProps) {
  const fbx = useFBX(url);
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clipsRef = useRef<Record<string, THREE.AnimationClip>>({});
  const [loadedAnimsCount, setLoadedAnimsCount] = useState(0);
  
  // Extra animációk betöltése
  useEffect(() => {
    if (animationUrls) {
      const loader = new FBXLoader();
      Object.entries(animationUrls).forEach(([key, animUrl]) => {
        // Ne töltsük be újra, ha már megvan
        if (clipsRef.current[key]) return;

        loader.load(encodeURI(`/avatars/${animUrl}`), (animFbx: any) => {
          if (animFbx.animations.length > 0) {
            const clip = animFbx.animations[0];
            clip.name = key; // Elnevezzük a kulcs alapján (pl. walk)
            clipsRef.current[key] = clip;
            console.log(`Külső animáció betöltve: ${key} (${animUrl})`);
            setLoadedAnimsCount(c => c + 1);
          }
        }, undefined, (err: any) => console.error(`Hiba az animáció betöltésekor (${key}):`, err));
      });
    }
  }, [animationUrls]);
  
  // Automatikus méretezés és középre igazítás
  useEffect(() => {
    if (fbx) {
      console.log('FBX model betöltve:', url);
      console.log('Animációk száma:', fbx.animations.length);
      fbx.animations.forEach((anim, i) => console.log(`Animáció ${i}: ${anim.name}`));

      const box = new THREE.Box3().setFromObject(fbx);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 3.8 / maxDim; // Kicsit nagyobb skálázás
      fbx.scale.setScalar(scale);
      
      // Alapértelmezett pozíció: lábak a középpont közelében
      fbx.position.y = -size.y * scale / 2;

      // Árnyékok bekapcsolása minden gyerekre
      fbx.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Animációk beállítása
      if (fbx.animations.length > 0) {
        mixerRef.current = new THREE.AnimationMixer(fbx);
      }
    }
  }, [fbx, url]);

  // Animáció váltás logika
  useEffect(() => {
    if (fbx && mixerRef.current) {
      let targetAnim = 'idle';
      
      if (currentAction) targetAnim = currentAction;
      else if (isFeeding) targetAnim = 'feed';
      else if (isMoving) targetAnim = 'walk';
      else if (isHungry) targetAnim = 'sad'; // Vagy 'idle' ha nincs 'sad'

      // Keressük meg a legmegfelelőbb animációt
      const clip = clipsRef.current[targetAnim] // Külső fájlok elsőbbsége
                 || fbx.animations.find(a => a.name.toLowerCase().includes(targetAnim)) 
                 || fbx.animations.find(a => a.name.toLowerCase().includes('idle'))
                 || fbx.animations[0];

      if (clip) {
        const action = mixerRef.current.clipAction(clip);
        
        mixerRef.current.stopAllAction();
        action.reset().fadeIn(0.5).play();
        
        return () => {
          action.fadeOut(0.5);
        };
      }
    }
  }, [fbx, isMoving, isFeeding, isHungry, currentAction, loadedAnimsCount]);

  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    if (groupRef.current) {
      // Finom lebegés (csak ha nincs látható járás mozgás, vagy tetszés szerint)
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = Math.sin(t) * 0.05;
      
      // Etetési effekt (dobbanás)
      if (isFeeding) {
        const s = 1 + Math.sin(t * 15) * 0.1;
        groupRef.current.scale.set(s, s, s);
      } else {
        groupRef.current.scale.set(1, 1, 1);
      }
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={fbx} dispose={null} />
    </group>
  );
}

export function FBXAvatar({ url, className, isFeeding, isMoving, isHungry, currentAction, animationUrls }: FBXAvatarProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%', perspective: '1000px' }}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        style={{ background: 'transparent', pointerEvents: 'none' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4f46e5" />
          <directionalLight position={[0, 5, 5]} intensity={0.5} />
          
          <Float speed={2} rotationIntensity={0.2} floatIntensity={isMoving ? 0.2 : 0.5}>
            <Model url={url} isFeeding={isFeeding} isMoving={isMoving} isHungry={isHungry} currentAction={currentAction} animationUrls={animationUrls} />
          </Float>
          
          <Environment preset="city" />
          <ContactShadows 
            position={[0, -2, 0]} 
            opacity={0.5} 
            scale={10} 
            blur={2.5} 
            far={4} 
          />
          
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            autoRotate
            autoRotateSpeed={1}
            enableRotate={false}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
