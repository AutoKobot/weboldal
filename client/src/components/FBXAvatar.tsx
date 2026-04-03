import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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
  direction?: number;
  petPos?: { x: number; y: number };
  volume?: number; // 0-1 híváserősség az audio analizerből
}

function Model({ url, isFeeding, isMoving, isHungry, currentAction, animationUrls, direction = 1, petPos, volume = 0 }: FBXAvatarProps) {
  const fbx = useFBX(url);
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clipsRef = useRef<Record<string, THREE.AnimationClip>>({});
  const [loadedAnimsCount, setLoadedAnimsCount] = useState(0);
  const jawRef = useRef<THREE.Object3D | null>(null);
  const headRef = useRef<THREE.Object3D | null>(null);
  
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

      const box = new THREE.Box3().setFromObject(fbx);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 3.2 / maxDim; // Kicsit kisebb skálázás, hogy beférjen a dobozba
      fbx.scale.setScalar(scale);
      
      // Tökéletes centrálás: a modell saját eltolódásait kompenzáljuk
      fbx.position.x = -center.x * scale;
      fbx.position.y = -center.y * scale;
      fbx.position.z = -center.z * scale;

      // Csontok kikeresése a lip-sync-hez
      fbx.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
        
        // Száj/Állkerapcs csont keresése (Common names: Jaw, Head, Neck)
        const name = child.name.toLowerCase();
        if (name.includes('jaw') || name.includes('mouth')) {
          jawRef.current = child;
        }
        if (name.includes('head')) {
          headRef.current = child;
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

    // Lip Sync (Jaw movement based on volume)
    if (jawRef.current && volume > 0.01) {
      jawRef.current.rotation.x = THREE.MathUtils.lerp(jawRef.current.rotation.x, volume * 1.5, 0.4);
    } else if (jawRef.current) {
      jawRef.current.rotation.x = THREE.MathUtils.lerp(jawRef.current.rotation.x, 0, 0.2);
    }

    // Head bobbing when speaking (Fej bólintgatás beszéd közben)
    if (headRef.current && volume > 0.01) {
      headRef.current.rotation.x += Math.sin(state.clock.getElapsedTime() * 15) * 0.05 * volume;
    }

    if (groupRef.current) {
      if (petPos) {
        // Képernyő (pixel) koordináta átalakítása 3D világ szerinti koordinátává
        const centerX = petPos.x + 75; // 150px széles doboz közepe
        const centerY = petPos.y + 100; // 200px magas doboz közepe
        
        const x = (centerX / window.innerWidth) * viewport.width - (viewport.width / 2);
        const y = -(centerY / window.innerHeight) * viewport.height + (viewport.height / 2);
        
        // Simított követés (így folyamatos az egér/drag után is)
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, x, 0.2);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, y - (viewport.height * 0.15), 0.2);
      } else {
        // Ha nincs petPos (pl. prezentáció), kényszerített alaphelyzet!
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, 0.2);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, 0.2);
      }
      
      // Valódi 3D-s elfordulás kezelése (Y tengely körüli forgatás)
      const targetRotation = direction === 1 ? 0 : Math.PI;
      // Finom átmenet a két irány között
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation, 0.1);
      
      const t = state.clock.getElapsedTime();
      
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

export function FBXAvatar({ url, className, isFeeding, isMoving, isHungry, currentAction, animationUrls, direction, petPos, volume }: FBXAvatarProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%', perspective: '1000px', pointerEvents: 'none' }}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        style={{ background: 'transparent', pointerEvents: 'none' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#4f46e5" />
          <directionalLight position={[0, 5, 5]} intensity={1.5} />
          
          <Model url={url} isFeeding={isFeeding} isMoving={isMoving} isHungry={isHungry} currentAction={currentAction} animationUrls={animationUrls} direction={direction} petPos={petPos} volume={volume} />
          
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
            enableRotate={false}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
