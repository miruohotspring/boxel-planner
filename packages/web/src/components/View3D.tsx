import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
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
}

function Scene({ blueprint, showScaffold, showOutline }: SceneProps) {
  const { structure, scaffold, bounds } = blueprint;

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

      <OrbitControls
        target={center}
        maxDistance={cameraDistance * 3}
        enableDamping
        dampingFactor={0.1}
      />
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
}

export function View3D({ blueprint, showScaffold, showOutline }: View3DProps) {
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
          <Scene blueprint={blueprint} showScaffold={showScaffold} showOutline={showOutline} />
        ) : (
          <EmptyScene />
        )}
      </Canvas>

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
