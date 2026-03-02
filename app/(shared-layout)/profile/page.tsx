"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { api } from "@/convex/_generated/api";
import Footer from "@/components/web/Footer";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { FieldLabel } from "@/components/ui/field";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function ProfilePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const deleteGuard = useQuery(api.auth.getDeleteAccountGuard, isAuthenticated ? {} : "skip");

  const verifyDeletePassword = useMutation(api.auth.verifyDeletePassword);
  const deleteAccountCascade = useMutation(api.auth.deleteAccountCascade);

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPreparingPasswordFlow, setIsPreparingPasswordFlow] = useState(false);
  const [passwordCheckState, setPasswordCheckState] = useState<
    "idle" | "checking" | "valid" | "invalid" | "missing_password"
  >("idle");
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            showSuccessToast("Logged out successfully");
            router.push("/");
          },
          onError: (error) => {
            showErrorToast(error?.error?.message || "Failed to logout");
          },
        },
      });
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/auth/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!deleteGuard) return;

    if (!deleteGuard.hasCredentialPassword) {
      setPasswordCheckState("missing_password");
      return;
    }

    if (!password.trim()) {
      setPasswordCheckState("idle");
      return;
    }

    let cancelled = false;
    setPasswordCheckState("checking");

    const timer = window.setTimeout(async () => {
      try {
        await verifyDeletePassword({ password });
        if (!cancelled) {
          setPasswordCheckState("valid");
        }
      } catch {
        if (!cancelled) {
          setPasswordCheckState("invalid");
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deleteGuard, isAuthenticated, password, verifyDeletePassword]);

  const handleDeleteAccount = async () => {
    if (passwordCheckState !== "valid") {
      showErrorToast("Type your exact account password to enable deletion");
      return;
    }

    if (confirmText !== "DELETE") {
      showErrorToast("Type DELETE to confirm");
      return;
    }

    setIsDeleting(true);
    try {
      await verifyDeletePassword({ password });
      await deleteAccountCascade({ password });
      showSuccessToast("Account and all related content deleted successfully");

      try {
        await authClient.signOut();
      } catch {
        // Session is likely already invalidated by server-side deletion.
      }

      window.location.href = "/";
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetPasswordFlow = async () => {
    if (!user?.email) {
      showErrorToast("Unable to start password setup flow");
      return;
    }

    setIsPreparingPasswordFlow(true);
    try {
      await authClient.signOut();
      window.location.href = `/auth/forgot-password?email=${encodeURIComponent(user.email)}`;
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to start password setup flow");
      setIsPreparingPasswordFlow(false);
    }
  };

  if (isLoading || !isAuthenticated) return null;

  const profileReady = user !== undefined;

  return (
    <>
      <div className="flex flex-col w-full pt-20 max-w-3xl mx-auto px-4">
        <div className="w-full space-y-6">
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between mt-6 gap-4">
              <h1 className="text-4xl font-extrabold text-primary">Account Settings</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="cursor-pointer"
              >
                {isLoggingOut && <Loader2 className="size-4 animate-spin" />}
                <span className="flex gap-2 items-center">
                  <LogOut className="size-4" /> Logout
                </span>
              </Button>
            </div>
            <p className="text-paragraph text-xl pt-4">Manage your account settings</p>
          </div>

          <Card className="space-y-3">
            <CardHeader>
              <CardTitle className="text-black dark:text-white">Profile Information</CardTitle>
              <CardDescription>Your account details and profile information.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              <div className="flex w-full gap-5">
                <div className="flex flex-col w-full space-y-2">
                  <FieldLabel className="text-sm font-medium" htmlFor="avatar">
                    Avatar
                  </FieldLabel>
                  <p className="text-xs text-paragraph">Your profile picture</p>
                  <input id="avatar" hidden readOnly />
                  {profileReady ? (
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage
                        src={`https://avatar.vercel.sh/${user?.name || "default"}`}
                        alt={user?.name || "Default Avatar"}
                      />
                    </Avatar>
                  ) : (
                    <Skeleton className="size-10 rounded-full" />
                  )}
                </div>
                <div className="flex flex-col w-full space-y-2">
                  <FieldLabel className="text-sm font-medium" htmlFor="username">
                    Username
                  </FieldLabel>
                  <p className="text-xs text-paragraph">Your display name on the platform</p>
                  <Input
                    id="username"
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={user?.name || ""}
                    disabled
                    className="bg-white dark:bg-black disabled:cursor-not-allowed disabled:pointer-events-auto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel className="text-sm font-medium" htmlFor="email">
                  Email Address
                </FieldLabel>
                <p className="text-xs text-paragraph">Your registered email address</p>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-white dark:bg-black disabled:cursor-not-allowed disabled:pointer-events-auto"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#DA2E34] dark:border-[#D93036]">
            <CardHeader>
              <CardTitle className="text-[#DA2E34] dark:text-[#D93036]">Delete Account</CardTitle>
              <CardDescription>
                This action is permanent. All your posts and comments will be deleted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="password" className="text-sm font-medium">
                  Type your account password
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="delete-account-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                    }}
                    placeholder="Enter your password"
                    disabled={isDeleting || deleteGuard?.hasCredentialPassword === false}
                    className="bg-white dark:bg-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-paragraph cursor-pointer"
                    disabled={isDeleting}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {passwordCheckState === "checking" && (
                <p className="text-sm text-paragraph">Checking password...</p>
              )}
              {passwordCheckState === "invalid" && (
                <p className="text-sm text-destructive">Password does not match this account.</p>
              )}
              {passwordCheckState === "valid" && (
                <p className="text-sm text-green-600">Password matches your account.</p>
              )}
              {passwordCheckState === "missing_password" && (
                <div className="space-y-2">
                  <p className="text-sm text-paragraph">
                    This account has no local password (GitHub login). Create a password first, then
                    retry account deletion.
                  </p>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleSetPasswordFlow}
                    disabled={isPreparingPasswordFlow}
                  >
                    {isPreparingPasswordFlow && <Loader2 className="size-4 animate-spin" />}
                    <span>Sign out and set password</span>
                  </Button>
                  <p className="text-xs text-paragraph">
                    Already signed out? Open{" "}
                    <Link href="/auth/forgot-password" className="underline">
                      forgot password
                    </Link>
                    .
                  </p>
                </div>
              )}

              <Button
                variant="destructive"
                onClick={() => setOpen(true)}
                disabled={isDeleting || passwordCheckState !== "valid"}
                className="w-full"
              >
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                <span>Delete Account</span>
              </Button>
            </CardContent>
          </Card>

          <Footer />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-black rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Delete Account</h2>

            <p className="text-sm text-paragraph">
              This action is permanent. Type <b>DELETE</b> to confirm.
            </p>

            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              name="delete"
            />

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                disabled={confirmText !== "DELETE" || isDeleting}
                onClick={handleDeleteAccount}
              >
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
