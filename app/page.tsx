import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/lib/auth-actions";
import { getCurrentUser } from "@/lib/session";

// Placeholder home page: shows who's signed in. The real home page (start a
// poem, add to a poem, browse poems) comes later.

const AccountStatus = async () => {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="font-medium text-stone-900 underline underline-offset-2 hover:text-stone-700"
      >
        Sign in or create an account
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-stone-700">
        Signed in as <span className="font-medium text-stone-900">@{user.handle}</span>
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100"
        >
          Sign out
        </button>
      </form>
    </div>
  );
};

const Home = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-semibold text-stone-900">Exquisite Corpus</h1>
    <p className="text-stone-600">Write poems together, one line at a time.</p>
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <AccountStatus />
    </Suspense>
  </div>
);

export default Home;
