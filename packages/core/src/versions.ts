/**
 * Single source of truth for the versions written into generated package.json files.
 * Bump them here; every module picks them up.
 */
export const VERSIONS = {
  // Next.js base
  next: "16.4.0",
  react: "19.3.0",
  "react-dom": "19.3.0",
  typescript: "^5",
  "@types/node": "^24",
  "@types/react": "^19",
  "@types/react-dom": "^19",

  // Styling & UI
  tailwindcss: "^4",
  "@tailwindcss/postcss": "^4",
  "class-variance-authority": "^0.7.1",
  clsx: "^2.1.1",
  "lucide-react": "^1.57.0",
  "radix-ui": "^1.8.1",
  "tailwind-merge": "^3.7.0",
  "tw-animate-css": "^1.4.0",
  // Pinned exactly, as required by icons-animated.
  motion: "13.1.1",
  "framer-motion": "13.1.1",
  "motion-dom": "13.1.1",
  "motion-utils": "13.0.0",

  // Database
  prisma: "^7.10.0",
  "@prisma/client": "^7.10.0",
  "@prisma/adapter-pg": "^7.10.0",
  "drizzle-orm": "^0.45.4",
  "drizzle-kit": "^0.31.11",
  postgres: "^3.4.9",
  dotenv: "^18.0.7",

  // Auth
  "next-auth": "5.0.0-beta.32",

  // Code quality
  eslint: "^10",
  "eslint-config-next": "16.4.0",
  prettier: "^3.9.10",
  "prettier-plugin-tailwindcss": "^0.8.1",

  // Testing
  vitest: "^5.0.4",
  "@vitejs/plugin-react": "^6.1.2",
  jsdom: "^30.1.2",
  "@testing-library/react": "^16.3.3",
  "@testing-library/dom": "^10.4.2",

  // State & validation
  zustand: "^5.0.15",
  zod: "^4.6.7",
} as const;

export type KnownPackage = keyof typeof VERSIONS;
