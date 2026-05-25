import { LoginForm } from "@/components/partials/login-form";
import Image from "next/image";
import Logo from "@/components/partials/logo";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left panel — image */}
      <div className="relative hidden lg:block overflow-hidden bg-muted">
        <Image
          src="/login-banner.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-10 left-10 right-10">
          <p className="text-white/80 text-sm font-medium leading-relaxed max-w-xs">
            &ldquo;We went from two hours of editing per video to about eight minutes. It&apos;s a bit absurd.&rdquo;
          </p>
          <p className="text-white/50 text-xs mt-2">Sarah K. &mdash; content creator</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col p-8 md:p-14">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
            <Logo className="size-4" />
          </div>
          <Link href="/" className="text-lg font-bold tracking-tight">
            Beyond
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
              <p className="text-muted-foreground text-sm">Sign in to your account to continue.</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
