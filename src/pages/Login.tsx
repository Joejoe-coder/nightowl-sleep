import { Button } from "@/components/ui/button";
import { Moon } from "lucide-react";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <Moon className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h1 className="font-display mt-6 text-4xl tracking-tight">夜航睡眠</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          记录每一晚，看清自己的睡眠节奏。
          <br />
          数据存在云端，换设备也不会丢。
        </p>
        <Button
          className="mt-8 w-full"
          size="lg"
          onClick={() => {
            window.location.href = getOAuthUrl();
          }}
        >
          使用 Kimi 账号登录
        </Button>
      </div>
    </div>
  );
}
