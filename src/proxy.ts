export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: ["/compte/:path*", "/organisateur/:path*", "/admin/:path*"],
};
