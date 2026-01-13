"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth, Role } from "@/lib/auth-context";
import { User, ShieldCheck, Eye } from "lucide-react";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { login } = useAuth();
  const roleOptions: {
    role: Role;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    title: string;
    description: string;
  }[] = [
      {
        role: "viewer",
        icon: Eye,
        title: "Viewer Access",
        description: "Read-only access to analytics and calendar.",
      },
      {
        role: "creator",
        icon: User,
        title: "Creator Access",
        description: "Full access to create and schedule content.",
      },
      {
        role: "admin",
        icon: ShieldCheck,
        title: "Admin Access",
        description: "Full system control and user management.",
      },
    ];

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Select an account to access the dashboard
          </p>
        </div>

        <div className="grid gap-4">
          {roleOptions.map((option) => (
            <Button
              key={option.role}
              onClick={() => login(option.role)}
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-2 border-border/40 hover:border-primary/50 transition-colors"
            >
              <option.icon className="w-8 h-8 text-primary" />
              <div className="text-center">
                <p className="font-bold">{option.title}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </Button>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/40" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" placeholder="m@example.com" />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" type="password" />
        </Field>
        <Button className="w-full" onClick={() => login("creator")}>
          Log In
        </Button>
      </FieldGroup>
    </div>
  );
}

// "use client"
// import { cn } from "@/lib/utils"
// import { Button } from "@/components/ui/button"
// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import {
//   Field,
//   FieldGroup,
//   FieldLabel,
// } from "@/components/ui/field"
// import { Input } from "@/components/ui/input"
// import { toast } from "sonner"

// export function LoginForm({
//   className,
//   ...props
// }: React.ComponentProps<"form">) {
//     const [isLoading, setIsLoading] = useState(false)
//   const router = useRouter()
//   async function handleLogin(e: React.FormEvent) {
//     e.preventDefault()
//     setIsLoading(true)

//     // Simulate auth
//     setTimeout(() => {
//       document.cookie = "auth=true; path=/"
//       router.push("/")
//       toast.success("You have successfully logged in as Elliot.")
//     }, 1000)
//   }

//   return (
//     <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleLogin}>
//       <FieldGroup>
//         <div className="flex flex-col items-center gap-1 text-center">
//           <h1 className="text-2xl font-bold">Welcome back</h1>
//           <p className="text-muted-foreground text-sm text-balance">
//             Enter your credentials to access the dashboard
//           </p>
//         </div>
//         <Field>
//           <FieldLabel htmlFor="email">Email</FieldLabel>
//           <Input id="email" type="email" placeholder="m@example.com" required />
//         </Field>
//         <Field>
//           <div className="flex items-center">
//             <FieldLabel htmlFor="password">Password</FieldLabel>
//             <a
//               href="#"
//               className="ml-auto text-sm underline-offset-4 hover:underline"
//             >
//               Forgot your password?
//             </a>
//           </div>
//           <Input id="password" type="password" required />
//         </Field>
//         <Field>
//           <Button type="submit">{isLoading ? "Logging in..." : "Log in"}</Button>
//         </Field>
//       </FieldGroup>
//     </form>
//   )
// }
