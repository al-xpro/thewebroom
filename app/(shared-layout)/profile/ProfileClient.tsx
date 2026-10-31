"use client";

import { useEffect, useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2, LogOut } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { api } from "@/convex/_generated/api";
import Footer from "@/components/web/Footer";
import { updateDisplayNameAction } from "@/app/actions";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { FieldLabel } from "@/components/ui/field";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TOPICS } from "@/convex/topics";
import { TopicFollowPicker } from "@/components/web/TopicFollowPicker";
import { useTopicFollows } from "@/hooks/use-topic-follows";
import Github from "@thesvg/react/github";
import { AvatarCropper } from "@/components/web/AvatarCropper";

export default function ProfileClient() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deleteReauthToken = (searchParams.get("deleteReauthToken") ?? "").trim();

  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isReauthenticatingGithub, setIsReauthenticatingGithub] = useState(false);
  // The GitHub reauthentication token that has been checked; until then, it's in progress.
  const [settledReauthToken, setSettledReauthToken] = useState("");
  const isCompletingGithubReauth = isAuthenticated && deleteReauthToken !== "" && settledReauthToken !== deleteReauthToken;
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  // The photo being framed before it's uploaded.
  const [cropFile, setCropFile] = useState<File | null>(null);
  const uploadAvatar = useAction(api.avatars.uploadAvatar);
  const removeAvatar = useMutation(api.avatars.removeAvatar);
  const [isSavingName, setIsSavingName] = useState(false);

  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const deleteGuard = useQuery(api.auth.getDeleteAccountGuard, isAuthenticated ? {} : "skip");
  const deletePasswordCheck = useQuery(
    api.auth.checkDeletePassword,
    isAuthenticated && deleteGuard?.hasCredentialPassword && password.trim().length > 0
      ? { password }
      : "skip"
  );

  const topicFollows = useTopicFollows();
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
          setSettledReauthToken(deleteReauthToken);
          router.replace("/profile");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [completeGithubDeleteReauth, deleteReauthToken, isAuthenticated, router]);

  // Same rules as onboarding; the server checks them again (convex/auth.ts).
  const nameValue = nameDraft ?? user?.name ?? "";
  const nameError = !/^[a-zA-Z0-9\s-]+$/.test(nameValue.trim())
    ? "Use letters, digits, spaces and hyphens only."
    : nameValue.trim().length < 3 || nameValue.trim().length > 10
      ? "Use 3 to 10 characters."
      : null;
  const nameChanged = nameDraft !== null && nameDraft.trim() !== (user?.name ?? "");

  const handleSaveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nameChanged || nameError) return;
    setIsSavingName(true);
    try {
      const result = await updateDisplayNameAction(nameValue.trim());
      if (!result.ok) {
        showErrorToast(result.message);
        return;
      }
      setNameDraft(null);
      showSuccessToast(`You're now ${result.name} everywhere on The Web Room.`);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to change your name");
    } finally {
      setIsSavingName(false);
    }
  };

  // Checked here for a quick answer; the cropped square is checked again on the server (#95).
  const handleAvatarFile = (file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      showErrorToast("Use a PNG, JPEG or WebP image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showErrorToast("Use an image of 10 MB or less");
      return;
    }
    setCropFile(file);
  };

  const uploadCropped = async (blob: Blob) => {
    setIsSavingAvatar(true);
    try {
      await uploadAvatar({ bytes: await blob.arrayBuffer() });
      showSuccessToast("Photo updated");
      setCropFile(null);
    } catch (error) {
      showErrorToast((error as { data?: string }).data ?? "Failed to upload the photo");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsSavingAvatar(true);
    try {
      await removeAvatar();
      showSuccessToast("Photo removed");
    } catch (error) {
      showErrorToast((error as { data?: string }).data ?? "Failed to remove the photo");
    } finally {
      setIsSavingAvatar(false);
    }
  };

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
      {cropFile && (
        <AvatarCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={uploadCropped} />
      )}
      <div className="flex flex-col w-full pt-20 max-w-3xl mx-auto px-4">
        <div className="w-full">
          <div className="flex items-center justify-between gap-4 py-10">
            <h1 className="type-display">Account</h1>
            <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              Log out
            </Button>
          </div>

          <section className="section-minimal">
            <h2 className="type-label">Profile</h2>
            <div className="space-y-6">
              <div className="flex w-full gap-5">
                <div className="flex flex-col w-full space-y-2">
                  <FieldLabel className="text-sm font-medium" htmlFor="avatar">Photo</FieldLabel>
                  {profileReady ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage
                          src={user?.avatarUrl ?? `https://avatar.vercel.sh/${user?.name}`}
                          alt={user?.name ?? "User avatar"}
                          className="object-cover"
                        />
                      </Avatar>
                      <label className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm ${isSavingAvatar ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-accent"}`}>
                        {isSavingAvatar && <Loader2 className="size-4 animate-spin" />}
                        Upload
                        <input
                          id="avatar"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          disabled={isSavingAvatar}
                          onChange={(e) => {
                            handleAvatarFile(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {user?.hasUploadedAvatar && (
                        <Button type="button" variant="ghost" size="sm" disabled={isSavingAvatar} onClick={handleRemoveAvatar}>
                          Remove
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Skeleton className="size-10 rounded-full" />
                  )}
                </div>
                <div className="flex flex-col w-full space-y-2">
                  <FieldLabel className="text-sm font-medium" htmlFor="username">Name</FieldLabel>
                  {profileReady ? (
                    <form onSubmit={handleSaveName} className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Input id="username" type="text" name="username" autoComplete="nickname"
                          value={nameValue}
                          onChange={(e) => setNameDraft(e.target.value)}
                          disabled={isSavingName}
                          aria-invalid={nameChanged && !!nameError}
                          aria-describedby={nameChanged && nameError ? "username-error" : undefined}
                          className="bg-white dark:bg-black" />
                        <Button type="submit" size="sm" className="h-9"
                          disabled={!nameChanged || !!nameError || isSavingName}>
                          {isSavingName && <Loader2 className="size-4 animate-spin" />}
                          Save
                        </Button>
                      </div>
                      {nameChanged && nameError && (
                        <p id="username-error" className="text-xs text-destructive">{nameError}</p>
                      )}
                    </form>
                  ) : (
                    <Skeleton className="h-9 w-full rounded-md" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel className="text-sm font-medium" htmlFor="email">Email</FieldLabel>
                {profileReady ? (
                  <Input id="email" type="email" name="email" autoComplete="email"
                    value={user?.email ?? ""} disabled
                    className="bg-white dark:bg-black disabled:cursor-not-allowed disabled:pointer-events-auto" />
                ) : (
                  <Skeleton className="h-9 w-full rounded-md" />
                )}
              </div>
            </div>
          </section>

          <section className="section-minimal">
            <h2 className="type-label">Topics</h2>
            <div className="space-y-6">
              {topicFollows.canFollow ? (
                <TopicFollowPicker
                  selected={TOPICS.filter(topicFollows.isFollowing)}
                  onToggle={topicFollows.toggle}
                />
              ) : (
                <Skeleton className="h-9 w-full rounded-full" />
              )}
            </div>
          </section>

          <section className="section-minimal">
            <h2 className="type-label text-destructive">Delete account</h2>
            <p className="type-meta -mt-3">Permanent. Your posts and comments go too.</p>
            <div className="space-y-6">
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
                  <PasswordInput
                    id="delete-password"
                    name="delete-account-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    disabled={isDeleting}
                    className="bg-white dark:bg-black"
                  />
                </div>
              )}

              {/* GitHub reauth flow */}
              {guardReady && !deleteGuard?.hasCredentialPassword && (
                <div className="space-y-2">
                  <FieldLabel htmlFor="github-reauth" className="text-sm font-medium">Confirm with GitHub</FieldLabel>
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
                      <Github variant="mono" className="size-4" aria-hidden />
                      GitHub
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
                <span>Delete</span>
              </Button>
            </div>
          </section>

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
