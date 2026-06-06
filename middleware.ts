import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/ka/:path*"],
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const stripped = url.pathname.replace(/^\/ka/, "") || "/";
  url.pathname = stripped;
  const res = NextResponse.rewrite(url);
  res.headers.set("x-locale", "ka");
  return res;
}
