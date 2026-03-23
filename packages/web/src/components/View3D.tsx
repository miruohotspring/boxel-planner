import { useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { type Blueprint, type Block } from "@boxel-planner/schema";

interface VoxelMeshProps {
  blocks: Block[];
  visible: boolean;
}

function VoxelMesh({ blocks, visible }: VoxelMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || blocks.length === 0) return;

    const matrix = new THREE.Matrix4();
    for (let i = 0; i < blocks.length; i++) {
      const { x, y, z } = blocks[i];
      matrix.setPosition(x, y, z);
      mesh.setMatrixAt(i, matrix);
      // setColorAt は instanceColor が null でも内部で生成してくれる
      // vertexColors は不要（instanceColor は別経路で適用される）
      mesh.setColorAt(i, new THREE.Color(blocks[i].color));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [blocks]);

  if (blocks.length === 0) return null;

  // unmount/remount を避けるため visible は Three.js オブジェクトの
  // .visible プロパティで制御する（toggle の ON復帰が確実になる）
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, blocks.length]} visible={visible}>
      <boxGeometry args={[1, 1, 1]} />
      <meshLambertMaterial />
    </instancedMesh>
  );
}

/** 足場ブロック用：黄色ワイヤーフレーム枠線 */
function ScaffoldWireframe({ blocks, visible }: VoxelMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || blocks.length === 0) return;

    const matrix = new THREE.Matrix4();
    for (let i = 0; i < blocks.length; i++) {
      const { x, y, z } = blocks[i];
      matrix.setPosition(x, y, z);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [blocks]);

  if (blocks.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, blocks.length]} visible={visible}>
      <boxGeometry args={[1.02, 1.02, 1.02]} />
      <meshBasicMaterial color="#FFD700" wireframe />
    </instancedMesh>
  );
}

/** 全ブロック用：黒ワイヤーフレーム輪郭線 */
function BlockOutlineMesh({ blocks, visible }: VoxelMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || blocks.length === 0) return;

    const matrix = new THREE.Matrix4();
    for (let i = 0; i < blocks.length; i++) {
      const { x, y, z } = blocks[i];
      matrix.setPosition(x, y, z);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [blocks]);

  if (blocks.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, blocks.length]} visible={visible}>
      <boxGeometry args={[1.005, 1.005, 1.005]} />
      <meshBasicMaterial color="#000000" wireframe />
    </instancedMesh>
  );
}

interface SceneProps {
  blueprint: Blueprint;
  showScaffold: boolean;
  showOutline: boolean;
  firstPersonMode: boolean;
}

interface FirstPersonLookControlsProps {
  enabled: boolean;
}

function FirstPersonLookControls({ enabled }: FirstPersonLookControlsProps) {
  const { camera, gl } = useThree();
  const rotationRef = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const pointerStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    x: number;
    y: number;
  }>({
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    const domElement = gl.domElement;
    const previousCursor = domElement.style.cursor;
    const previousTouchAction = domElement.style.touchAction;
    const maxPitch = Math.PI / 2 - 0.01;
    const pointerState = pointerStateRef.current;

    const syncRotationFromCamera = () => {
      rotationRef.current.setFromQuaternion(camera.quaternion, "YXZ");
    };

    const stopDragging = (restoreCursor = true) => {
      if (
        pointerState.pointerId !== null &&
        domElement.hasPointerCapture(pointerState.pointerId)
      ) {
        domElement.releasePointerCapture(pointerState.pointerId);
      }
      pointerState.active = false;
      pointerState.pointerId = null;
      if (restoreCursor) {
        domElement.style.cursor = "grab";
      }
    };

    const rotateCamera = (dx: number, dy: number) => {
      rotationRef.current.y -= dx * 0.005;
      rotationRef.current.x -= dy * 0.005;
      rotationRef.current.x = THREE.MathUtils.clamp(rotationRef.current.x, -maxPitch, maxPitch);
      camera.quaternion.setFromEuler(rotationRef.current);
      camera.updateMatrixWorld();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      event.preventDefault();
      syncRotationFromCamera();
      pointerState.active = true;
      pointerState.pointerId = event.pointerId;
      pointerState.x = event.clientX;
      pointerState.y = event.clientY;
      domElement.style.cursor = "grabbing";
      domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerState.active || pointerState.pointerId !== event.pointerId) return;

      event.preventDefault();
      const dx = event.clientX - pointerState.x;
      const dy = event.clientY - pointerState.y;
      pointerState.x = event.clientX;
      pointerState.y = event.clientY;
      rotateCamera(dx, dy);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (pointerState.pointerId !== event.pointerId) return;
      stopDragging();
    };

    syncRotationFromCamera();
    domElement.style.cursor = "grab";
    domElement.style.touchAction = "none";
    domElement.addEventListener("pointerdown", handlePointerDown);
    domElement.addEventListener("pointermove", handlePointerMove);
    domElement.addEventListener("pointerup", handlePointerUp);
    domElement.addEventListener("pointercancel", handlePointerUp);
    domElement.addEventListener("pointerleave", handlePointerUp);

    return () => {
      stopDragging(false);
      domElement.removeEventListener("pointerdown", handlePointerDown);
      domElement.removeEventListener("pointermove", handlePointerMove);
      domElement.removeEventListener("pointerup", handlePointerUp);
      domElement.removeEventListener("pointercancel", handlePointerUp);
      domElement.removeEventListener("pointerleave", handlePointerUp);
      domElement.style.cursor = previousCursor;
      domElement.style.touchAction = previousTouchAction;
    };
  }, [camera, enabled, gl]);

  return null;
}

function Scene({ blueprint, showScaffold, showOutline, firstPersonMode }: SceneProps) {
  const { camera } = useThree();
  const { structure, scaffold, bounds } = blueprint;
  const orbitControlsRef = useRef<OrbitControlsImpl | null>(null);
  const orbitTargetRef = useRef(new THREE.Vector3());
  const prevFirstPersonModeRef = useRef(firstPersonMode);

  // カメラの初期位置をboundsの中心に合わせる
  const center = useMemo(() => {
    const cx = (bounds.min.x + bounds.max.x) / 2;
    const cy = (bounds.min.y + bounds.max.y) / 2;
    const cz = (bounds.min.z + bounds.max.z) / 2;
    return new THREE.Vector3(cx, cy, cz);
  }, [bounds]);

  const cameraDistance = useMemo(() => {
    const dx = bounds.max.x - bounds.min.x;
    const dy = bounds.max.y - bounds.min.y;
    const dz = bounds.max.z - bounds.min.z;
    return Math.max(dx, dy, dz, 5) * 2;
  }, [bounds]);

  useEffect(() => {
    orbitTargetRef.current.copy(center);

    if (!firstPersonMode && orbitControlsRef.current) {
      orbitControlsRef.current.target.copy(center);
      orbitControlsRef.current.update();
    }
  }, [center]);

  useLayoutEffect(() => {
    const wasFirstPersonMode = prevFirstPersonModeRef.current;

    if (wasFirstPersonMode && !firstPersonMode) {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);

      const distance = Math.max(camera.position.distanceTo(orbitTargetRef.current), 0.001);
      orbitTargetRef.current.copy(camera.position).add(direction.multiplyScalar(distance));

      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(orbitTargetRef.current);
        orbitControlsRef.current.update();
      }
    }

    prevFirstPersonModeRef.current = firstPersonMode;
  }, [camera, firstPersonMode]);

  return (
    <>
      {/* 環境光 */}
      <ambientLight intensity={0.6} />
      {/* 方向光 */}
      <directionalLight position={[1, 2, 1]} intensity={0.8} />
      <directionalLight position={[-1, -1, -1]} intensity={0.2} />

      {/* 構造ブロック */}
      <VoxelMesh blocks={structure} visible={true} />
      <BlockOutlineMesh blocks={structure} visible={showOutline} />

      {/* 足場ブロック（色 + 黄色枠線） */}
      <VoxelMesh blocks={scaffold} visible={showScaffold} />
      <ScaffoldWireframe blocks={scaffold} visible={showScaffold} />

      {/* グリッドヘルパー */}
      <gridHelper
        args={[
          Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z, 10) + 4,
          Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z, 10) + 4,
          "#30363d",
          "#21262d",
        ]}
        position={[center.x, bounds.min.y - 0.5, center.z]}
      />

      {firstPersonMode ? (
        <FirstPersonLookControls enabled />
      ) : (
        <OrbitControls
          ref={orbitControlsRef}
          target={center}
          maxDistance={cameraDistance * 3}
          enableDamping
          dampingFactor={0.1}
        />
      )}
    </>
  );
}

/** 空の状態（デモキューブ）を表示するシーン */
function EmptyScene() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[1, 2, 1]} intensity={0.8} />
      <mesh ref={meshRef}>
        <boxGeometry args={[2, 2, 2]} />
        <meshLambertMaterial color="#388bfd" />
      </mesh>
      <OrbitControls enableDamping dampingFactor={0.1} />
    </>
  );
}

interface View3DProps {
  blueprint: Blueprint | null;
  showScaffold: boolean;
  showOutline: boolean;
  firstPersonMode: boolean;
}

export function View3D({ blueprint, showScaffold, showOutline, firstPersonMode }: View3DProps) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#0d1117" }}>
      <Canvas
        camera={{
          position: blueprint
            ? [
                (blueprint.bounds.min.x + blueprint.bounds.max.x) / 2 +
                  Math.max(
                    blueprint.bounds.max.x - blueprint.bounds.min.x,
                    blueprint.bounds.max.y - blueprint.bounds.min.y,
                    blueprint.bounds.max.z - blueprint.bounds.min.z,
                    5
                  ) * 1.5,
                (blueprint.bounds.min.y + blueprint.bounds.max.y) / 2 +
                  Math.max(
                    blueprint.bounds.max.y - blueprint.bounds.min.y,
                    5
                  ) * 1.2,
                (blueprint.bounds.min.z + blueprint.bounds.max.z) / 2 +
                  Math.max(
                    blueprint.bounds.max.x - blueprint.bounds.min.x,
                    blueprint.bounds.max.z - blueprint.bounds.min.z,
                    5
                  ) * 1.5,
              ]
            : [5, 5, 5],
          fov: 50,
        }}
        style={{ background: "#0d1117" }}
      >
        {blueprint ? (
          <Scene
            blueprint={blueprint}
            showScaffold={showScaffold}
            showOutline={showOutline}
            firstPersonMode={firstPersonMode}
          />
        ) : (
          <EmptyScene />
        )}
      </Canvas>

      {blueprint && firstPersonMode && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "rgba(22, 27, 34, 0.85)",
            border: "1px solid #30363d",
            borderRadius: "6px",
            padding: "6px 10px",
            fontSize: "12px",
            color: "#8b949e",
            pointerEvents: "none",
          }}
        >
          First Person: ドラッグで視線回転
        </div>
      )}

      {/* オーバーレイのヒント */}
      {!blueprint && (
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(22, 27, 34, 0.85)",
            border: "1px solid #30363d",
            borderRadius: "6px",
            padding: "6px 14px",
            fontSize: "12px",
            color: "#8b949e",
            pointerEvents: "none",
          }}
        >
          Import または ドラッグ＆ドロップで .boxel.json を読み込む
        </div>
      )}
    </div>
  );
}
