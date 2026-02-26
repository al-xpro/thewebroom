"use client";

import { loginSchema } from "@/app/schemas/auth";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import Link from "next/link";
import { useConvex } from "convex/react";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const convex = useConvex();
  
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: z.infer<typeof loginSchema>) {
    startTransition(async () => {
      console.log("[Login] Attempting login with:", data.email);
      
      await authClient.signIn.email({
        email: data.email,
        password: data.password,
        fetchOptions: {
          onSuccess: async () => {
            showSuccessToast("Logged in successfully");
            
            // Force Convex to re-fetch auth state
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Refresh the page to ensure auth state is synced
            window.location.href = "/";
          },
          onError: (error) => {
            console.error("[Login] Error:", error);
            showErrorToast(error.error.message);
          },
        },
      });
    });
  }
  
  return (
    <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
      {/* Back button */}
      <Button
        variant="outline"
        size="sm"
        className="relative flex px-2 py-1 items-start sm:absolute left-0 top-0 z-20 cursor-pointer"
      >
        <Link href="/" className="flex items-center justify-center gap-3">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
      </Button>
      <form className="flex flex-col w-full max-w-md gap-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Login to your account</h1>
            <p className="text-muted-foreground text-sm text-paragraph">
              Enter your email below to login{" "}
              <span className="whitespace-nowrap">to your account.</span>
            </p>
          </div>
          <Field>
            <Controller
              name="email"
              rules={{ required: true }}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    aria-invalid={fieldState.invalid}
                    placeholder="Email address"
                    type="email"
                    {...field}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </Field>
          <Field>
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Link
                      href="/auth/forgot-password"
                      className="ml-auto text-sm underline underline-offset-4 text-paragraph hover:text-primary!"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    aria-invalid={fieldState.invalid}
                    placeholder="*****"
                    type="password"
                    {...field}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </Field>
          <Field>
            <Button disabled={isPending} className="cursor-pointer">
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </Button>
          </Field>
          <FieldSeparator className="text-paragraph">Or continue with</FieldSeparator>
          <Field>
            <Button variant="outline" type="button" className="cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                  fill="currentColor"
                />
              </svg>
              Login with GitHub
            </Button>
            <Button variant="outline" type="button" className="cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height={16}
                strokeLinejoin="round"
                viewBox="0 0 16 16"
                width={16}
                style={{
                  color: "currentcolor",
                }}
              >
                <path
                  d="M8.15991 6.54543V9.64362H12.4654C12.2763 10.64 11.709 11.4837 10.8581 12.0509L13.4544 14.0655C14.9671 12.6692 15.8399 10.6182 15.8399 8.18188C15.8399 7.61461 15.789 7.06911 15.6944 6.54552L8.15991 6.54543Z"
                  fill="#4285F4"
                />
                <path
                  d="M3.6764 9.52268L3.09083 9.97093L1.01807 11.5855C2.33443 14.1963 5.03241 16 8.15966 16C10.3196 16 12.1305 15.2873 13.4542 14.0655L10.8578 12.0509C10.1451 12.5309 9.23598 12.8219 8.15966 12.8219C6.07967 12.8219 4.31245 11.4182 3.67967 9.5273L3.6764 9.52268Z"
                  fill="#34A853"
                />
                <path
                  d="M1.01803 4.41455C0.472607 5.49087 0.159912 6.70543 0.159912 7.99995C0.159912 9.29447 0.472607 10.509 1.01803 11.5854C1.01803 11.5926 3.6799 9.51991 3.6799 9.51991C3.5199 9.03991 3.42532 8.53085 3.42532 7.99987C3.42532 7.46889 3.5199 6.95983 3.6799 6.47983L1.01803 4.41455Z"
                  fill="#FBBC05"
                />
                <path
                  d="M8.15982 3.18545C9.33802 3.18545 10.3853 3.59271 11.2216 4.37818L13.5125 2.0873C12.1234 0.792777 10.3199 0 8.15982 0C5.03257 0 2.33443 1.79636 1.01807 4.41455L3.67985 6.48001C4.31254 4.58908 6.07983 3.18545 8.15982 3.18545Z"
                  fill="#EA4335"
                />
              </svg>
              Login with Google
            </Button>
            <FieldDescription className="text-center">
              Don&apos;t have an account?{" "}
              <Link href="/auth/sign-up" className="underline underline-offset-4 text-paragraph">
                Sign up
              </Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}