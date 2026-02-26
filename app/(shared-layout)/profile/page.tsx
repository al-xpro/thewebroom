"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { api } from "@/convex/_generated/api";
import Footer from "@/components/web/Footer";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { FieldLabel } from "@/components/ui/field";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, isLoading, router]);

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
    } catch (error: any) {
      showErrorToast(error?.message || "Failed to logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      showErrorToast("Please enter your password to delete your account");
      return;
    }

    if (!confirm("Are you absolutely sure? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete account
      await authClient.deleteUser({
        password,
      });
      showSuccessToast("Account deleted successfully");
      router.push("/");
    } catch (error: any) {
      showErrorToast(error?.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
      setPassword("");
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const profileReady = user !== undefined;

  return (
    <>
      <div className="flex flex-col w-full pt-20 max-w-3xl mx-auto px-4">
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between gap-4">
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

          {/* Email & Profile Section */}
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

          {/* Password Section */}
          <Card className="border-[#DA2E34] dark:border-[#D93036]">
            <CardHeader>
              <CardTitle className="text-[#DA2E34] dark:text-[#D93036]">Delete Account</CardTitle>
              <CardDescription>
                This action is permanent. All your posts and comments will be deleted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FieldLabel htmlFor="password" className="text-sm font-medium">
                    Enter your password to delete account
                  </FieldLabel>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="delete account"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isDeleting}
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

              <Button
                variant="destructive"
                onClick={() => setOpen(true)}
                disabled={isDeleting || !password.trim()}
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

            <p className="text-sm text-muted-foreground">
              This action is permanent. Type <b>DELETE</b> to confirm.
            </p>

            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
            />

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>

              <Button
                variant="destructive"
                disabled={confirmText !== "DELETE"}
                onClick={handleDeleteAccount}
              >
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                <span>Confirm Delete</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
