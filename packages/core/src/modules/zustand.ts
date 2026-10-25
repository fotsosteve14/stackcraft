import type { StackModule } from "../types";

export const zustand: StackModule = {
  id: "zustand",
  name: "Zustand",
  description: "Small, fast client-side state management.",
  category: "state",
  homepage: "https://zustand.docs.pmnd.rs",
  frameworks: ["nextjs", "vite-react"],
  apply(project) {
    project.addDependency("zustand");

    project.addFile(
      `${project.paths.stores}/counter-store.ts`,
      `import { create } from "zustand";

interface CounterState {
  count: number;
  increment: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}));
`,
    );
  },
};
