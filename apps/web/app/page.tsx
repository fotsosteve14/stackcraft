import { Suspense } from "react";
import { Configurator } from "@/components/configurator";

export default function Home() {
  return (
    <Suspense>
      <Configurator />
    </Suspense>
  );
}
