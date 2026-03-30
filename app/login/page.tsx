import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
