import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/session";
import AuthForms from "./auth-forms";

export const metadata: Metadata = {
  title: "Sign in · Exquisite Corpus",
};

/** Already signed in? Then there's nothing to do here. */
const RedirectIfSignedIn = async () => {
  if (await getCurrentUser()) redirect("/");
  return null;
};

const LoginPage = () => (
  <>
    {/* Reads the session, so it sits behind its own boundary; the forms
        themselves are static and render immediately. */}
    <Suspense fallback={null}>
      <RedirectIfSignedIn />
    </Suspense>
    <AuthForms />
  </>
);

export default LoginPage;
