import { generateZip, InvalidConfigError, type ProjectConfig } from "@stackcraft/core";
import { configFromJson, configFromParams } from "@/lib/config";

/** GET /api/generate?name=my-app&pm=npm&modules=tailwind,prisma (handy for curl). */
export async function GET(request: Request) {
  return zipResponse(configFromParams(new URL(request.url).searchParams));
}

/** POST /api/generate with a JSON ProjectConfig body. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  return zipResponse(configFromJson(body));
}

async function zipResponse(config: ProjectConfig) {
  try {
    const zip = await generateZip(config);
    return new Response(new Blob([zip as Uint8Array<ArrayBuffer>]), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${config.name}.zip"`,
      },
    });
  } catch (error) {
    if (error instanceof InvalidConfigError) {
      return Response.json({ errors: error.errors }, { status: 400 });
    }
    throw error;
  }
}
