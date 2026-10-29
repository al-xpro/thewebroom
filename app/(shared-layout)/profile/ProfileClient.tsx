"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2, LogOut } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { api } from "@/convex/_generated/api";
import Footer from "@/components/web/Footer";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { FieldLabel } from "@/components/ui/field";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileClient() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deleteReauthToken = (searchParams.get("deleteReauthToken") ?? "").trim();

  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isReauthenticatingGithub, setIsReauthenticatingGithub] = useState(false);
  const [isCompletingGithubReauth, setIsCompletingGithubReauth] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const deleteGuard = useQuery(api.auth.getDeleteAccountGuard, isAuthenticated ? {} : "skip");
  const deletePasswordCheck = useQuery(
    api.auth.checkDeletePassword,
    isAuthenticated && deleteGuard?.hasCredentialPassword && password.trim().length > 0
      ? { password }
      : "skip"
  );

  const deleteAccountCascade = useMutation(api.auth.deleteAccountCascade);
  const createGithubDeleteReauthChallenge = useMutation(api.auth.createGithubDeleteReauthChallenge);
  const completeGithubDeleteReauth = useMutation(api.auth.completeGithubDeleteReauth);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!deleteReauthToken) return;

    let cancelled = false;
    setIsCompletingGithubReauth(true);

    void (async () => {
      try {
        await completeGithubDeleteReauth({ token: deleteReauthToken });
        if (!cancelled) showSuccessToast("GitHub reauthentication verified.");
      } catch (error) {
        if (!cancelled) {
          showErrorToast(error instanceof Error ? error.message : "Failed to verify GitHub reauthentication");
        }
      } finally {
        if (!cancelled) {
          setIsCompletingGithubReauth(false);
          router.replace("/profile");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [completeGithubDeleteReauth, deleteReauthToken, isAuthenticated, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => { showSuccessToast("Logged out successfully"); router.push("/"); },
          onError: (error) => { showErrorToast(error?.error?.message || "Failed to logout"); },
        },
      });
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleGithubReauthentication = async () => {
    if (!deleteGuard?.requiresGithubReauth) return;
    setIsReauthenticatingGithub(true);
    try {
      const challenge = await createGithubDeleteReauthChallenge();
      await authClient.signIn.social({
        provider: "github",
        requestSignUp: false,
        callbackURL: `/profile?deleteReauthToken=${encodeURIComponent(challenge.token)}`,
      });
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to start GitHub reauthentication");
      setIsReauthenticatingGithub(false);
    }
  };

  const handleDeleteAccount = async () => {
    const deleteUnlocked = deleteGuard?.hasCredentialPassword
      ? Boolean(deletePasswordCheck?.matches)
      : Boolean(deleteGuard?.githubReauthValid);

    if (!deleteUnlocked) { showErrorToast("Complete account reauthentication before deleting your account"); return; }
    if (confirmText !== "DELETE") { showErrorToast("Type DELETE to confirm"); return; }

    setIsDeleting(true);
    try {
      await deleteAccountCascade({ password: deleteGuard?.hasCredentialPassword ? password : undefined });
      showSuccessToast("Account and all related content deleted successfully");
      window.location.replace("/");
      return;
    } catch {
      showErrorToast("Unable to delete account. Reauthenticate and try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || !isAuthenticated) return null;

  const profileReady = user !== undefined;
  // deleteGuard === undefined means the query is still loading.
  // deleteGuard === null means unauthenticated (shouldn't happen here).
  const guardReady   = deleteGuard !== undefined;
  const deleteUnlocked = deleteGuard?.hasCredentialPassword
    ? Boolean(deletePasswordCheck?.matches)
    : Boolean(deleteGuard?.githubReauthValid);

  return (
    <>
      <div className="flex flex-col w-full pt-20 max-w-3xl mx-auto px-4">
        <div className="w-full space-y-6">
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between mt-6 gap-4">
              <h1 className="text-4xl font-extrabold text-primary">Account Settings</h1>
              <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut} className="cursor-pointer">
                {isLoggingOut && <Loader2 className="size-4 animate-spin" />}
                <span className="flex gap-2 items-center"><LogOut className="size-4" /> Logout</span>
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
                  <FieldLabel className="text-sm font-medium" htmlFor="avatar">Avatar</FieldLabel>
                  <p className="text-xs text-paragraph">Your profile picture</p>
                  <input id="avatar" hidden readOnly />
                  {profileReady ? (
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage src={`https://avatar.vercel.sh/${user?.name}`} alt={user?.name ?? "User avatar"} />
                    </Avatar>
                  ) : (
                    <Skeleton className="size-10 rounded-full" />
                  )}
                </div>
                <div className="flex flex-col w-full space-y-2">
                  <FieldLabel className="text-sm font-medium" htmlFor="username">Username</FieldLabel>
                  <p className="text-xs text-paragraph">Your display name on the platform</p>
                  {profileReady ? (
                    <Input id="username" type="text" name="username" autoComplete="username"
                      value={user?.name ?? ""} disabled
                      className="bg-white dark:bg-black disabled:cursor-not-allowed disabled:pointer-events-auto" />
                  ) : (
                    <Skeleton className="h-9 w-full rounded-md" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel className="text-sm font-medium" htmlFor="email">Email Address</FieldLabel>
                <p className="text-xs text-paragraph">Your registered email address</p>
                {profileReady ? (
                  <Input id="email" type="email" name="email" autoComplete="email"
                    value={user?.email ?? ""} disabled
                    className="bg-white dark:bg-black disabled:cursor-not-allowed disabled:pointer-events-auto" />
                ) : (
                  <Skeleton className="h-9 w-full rounded-md" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#DA2E34] dark:border-[#D93036]">
            <CardHeader>
              <CardTitle className="text-[#DA2E34] dark:text-[#D93036]">Delete Account</CardTitle>
              <CardDescription>This action is permanent. All your posts and comments will be deleted.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show skeleton while the deleteGuard query is still loading */}
              {!guardReady && (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-60" />
                  <Skeleton className="h-9 w-40" />
                </div>
              )}

              {/* Credential password flow */}
              {guardReady && deleteGuard?.hasCredentialPassword && (
                <div className="space-y-2">
                  <FieldLabel htmlFor="delete-password" className="text-sm font-medium">Password</FieldLabel>
                  <p className="text-xs text-paragraph">Enter your password to delete your account.</p>
                  <PasswordInput
                    id="delete-password"
                    name="delete-account-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isDeleting}
                    className="bg-white dark:bg-black"
                  />
                </div>
              )}

              {/* GitHub reauth flow */}
              {guardReady && !deleteGuard?.hasCredentialPassword && (
                <div className="space-y-2">
                  <FieldLabel htmlFor="github-reauth" className="text-sm font-medium">Reauthentication</FieldLabel>
                  <p className="text-xs text-paragraph">
                    You need to reauthenticate with GitHub to delete your account.
                  </p>
                  <input id="github-reauth" hidden readOnly />
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleGithubReauthentication}
                    disabled={
                      isReauthenticatingGithub ||
                      isCompletingGithubReauth ||
                      !deleteGuard?.requiresGithubReauth ||
                      Boolean(deleteGuard?.githubReauthValid)
                    }
                  >
                    {(isReauthenticatingGithub || isCompletingGithubReauth) && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    <span className="flex gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4">
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="currentColor" />
                      </svg>
                      Reauthenticate
                    </span>
                  </Button>
                </div>
              )}

              <Button
                variant="destructive"
                onClick={() => setOpen(true)}
                disabled={isDeleting || !deleteUnlocked}
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
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE" name="delete" />
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => { setOpen(false); setConfirmText(""); }} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={confirmText !== "DELETE" || isDeleting} onClick={handleDeleteAccount}>
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
