import type { StackModule } from "../types";

export const three: StackModule = {
  id: "three",
  name: "Three.js",
  description: "3D in the browser with React Three Fiber and Drei, plus an example scene.",
  category: "3d",
  homepage: "https://r3f.docs.pmnd.rs",
  frameworks: ["nextjs", "vite-react"],
  apply(project) {
    const { paths } = project;
    const tw = project.has("tailwind");
    project.addDependency("three", "@react-three/fiber", "@react-three/drei").addDevDependency("@types/three");

    const sceneDir = `${paths.components}/scene`;

    project.addFile(
      `${sceneDir}/scene-canvas.tsx`,
      `${project.useClient}import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function SpinningBox() {
  const mesh = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.x += delta * 0.4;
    mesh.current.rotation.y += delta * 0.6;
  });
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[1.6, 1.6, 1.6]} />
      <meshStandardMaterial color="#10b981" />
    </mesh>
  );
}

export default function SceneCanvas() {
  return (
    <Canvas camera={{ position: [3, 2, 4], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <SpinningBox />
      <OrbitControls enablePan={false} />
    </Canvas>
  );
}
`,
    );

    const box = tw ? 'className="h-80 w-full max-w-xl"' : 'style={{ height: 320, width: "100%", maxWidth: 560 }}';
    const docs = "built with [React Three Fiber](https://r3f.docs.pmnd.rs) and [Drei](https://drei.docs.pmnd.rs)";
    const canvasDoc = `- \`${sceneDir}/scene-canvas.tsx\`: the scene itself (meshes, lights, controls).`;

    if (project.config.framework === "nextjs") {
      project.addFile(
        `${sceneDir}/index.tsx`,
        `"use client";

import dynamic from "next/dynamic";

// WebGL only exists in the browser: load the canvas on the client only, and keep
// Three.js out of the server bundle.
const SceneCanvas = dynamic(() => import("./scene-canvas"), {
  ssr: false,
  loading: () => <div ${box} />,
});

export function Scene() {
  return (
    <div ${box}>
      <SceneCanvas />
    </div>
  );
}
`,
      );

      const main = tw
        ? 'className="flex flex-1 flex-col items-center justify-center gap-6 p-8"'
        : 'className="page"';
      project.addFile(
        `${paths.app}/scene/page.tsx`,
        `import { Scene } from "${project.importPath(sceneDir)}";

export default function ScenePage() {
  return (
    <main ${main}>
      <h1${tw ? ' className="text-2xl font-bold"' : ""}>3D scene</h1>
      <Scene />
      <p${tw ? ' className="text-sm text-zinc-500"' : ""}>Drag to rotate the camera.</p>
    </main>
  );
}
`,
      );

      project.addReadmeSection(
        "3D (Three.js)",
        `Open [http://localhost:3000/scene](http://localhost:3000/scene) for the example scene, ${docs}.

${canvasDoc}
- \`${sceneDir}/index.tsx\`: loads it on the client only with \`next/dynamic\` and \`ssr: false\`, since WebGL needs a browser.`,
      );
      return;
    }

    project.addFile(
      `${sceneDir}/index.tsx`,
      `import { lazy, Suspense } from "react";

// Three.js is large: load the canvas only when the scene renders, in its own chunk.
const SceneCanvas = lazy(() => import("./scene-canvas"));

export function Scene() {
  return (
    <div ${box}>
      <Suspense fallback={null}>
        <SceneCanvas />
      </Suspense>
    </div>
  );
}
`,
    );
    project.addHomeSection(`import { Scene } from "${project.importPath(sceneDir)}";`, "<Scene />");
    // Three.js gets its own lazy-loaded chunk (~900 kB), above Vite's 500 kB warning threshold.
    project.setViteConfig("build", "{\n    chunkSizeWarningLimit: 1000,\n  }");

    project.addReadmeSection(
      "3D (Three.js)",
      `The home page renders an example scene, ${docs}.

${canvasDoc}
- \`${sceneDir}/index.tsx\`: loads it lazily with \`React.lazy\`, so Three.js stays out of the main bundle.`,
    );
  },
};
