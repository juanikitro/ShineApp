/** @type {import('next').NextConfig} */

// Origen de la API (para acotar connect-src). Si no se puede parsear, se omite.
function apiOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9001/api").origin;
  } catch {
    return "";
  }
}

function splitEnvList(value) {
  return (value ?? "").split(/\s+/).filter(Boolean);
}

// Content-Security-Policy. Notas:
// - script-src/style-src incluyen 'unsafe-inline' porque Next inyecta scripts y
//   estilos inline de hidratacion (sin nonce). La defensa principal contra robo
//   de token via XSS es connect-src acotado (bloquea fetch/XHR/WebSocket a
//   dominios ajenos).
// - connect-src se arma con 'self' + origen de la API + NEXT_PUBLIC_CSP_CONNECT_SRC.
// - img-src por defecto permite https: (logos/avatares servidos desde Supabase).
//   Para endurecer aun mas, setear NEXT_PUBLIC_CSP_IMG_SRC con los origenes exactos.
// - Todo el CSP se puede desactivar con NEXT_PUBLIC_CSP_DISABLED=1 (escape hatch
//   operativo, sin redeploy de codigo).
function contentSecurityPolicy() {
  const connectSrc = ["'self'", apiOrigin(), ...splitEnvList(process.env.NEXT_PUBLIC_CSP_CONNECT_SRC)].filter(Boolean);
  const imgSrc = splitEnvList(process.env.NEXT_PUBLIC_CSP_IMG_SRC);
  const imgSrcFinal = imgSrc.length ? ["'self'", "data:", "blob:", ...imgSrc] : ["'self'", "data:", "blob:", "https:"];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrcFinal.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");
}

function securityHeaders() {
  const headers = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
  ];
  if (process.env.NEXT_PUBLIC_CSP_DISABLED !== "1") {
    headers.unshift({ key: "Content-Security-Policy", value: contentSecurityPolicy() });
  }
  return headers;
}

const nextConfig = {
  output: process.platform === "win32" ? undefined : "standalone",
  // El lint corre como paso propio (npm run lint, advisory en CI). El build
  // no debe fallar por reglas de ESLint: se mantiene desacoplado mientras las
  // reglas estan en baseline (ver docs/plans/2026-06-12-refactor-mantenibilidad.md,
  // Track H endurece los gates).
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
    staticGenerationMaxConcurrency: 1,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
