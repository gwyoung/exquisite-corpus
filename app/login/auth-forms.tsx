"use client";

import { useActionState, useState, type FormEvent } from "react";
import RequirementList from "@/components/requirement-list";
import { signIn, signUp, type AuthFormState } from "@/lib/auth-actions";
import {
  allMet,
  PASSWORD_MAX_LENGTH,
  passwordRequirements,
  USERNAME_MAX_LENGTH,
  usernameRequirements,
} from "@/lib/validation";

const initialState: AuthFormState = {};

const inputClass =
  "mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base " +
  "focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300";
const labelClass = "block text-sm font-medium text-stone-700";
const buttonClass =
  "w-full rounded-md bg-stone-800 px-4 py-2.5 font-medium text-white " +
  "hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60";

const FormError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  ) : null;

const SignInForm = () => {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <label htmlFor="identifier" className={labelClass}>
          Email or username
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.values?.identifier}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="sign-in-password" className={labelClass}>
          Password
        </label>
        <input
          id="sign-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
};

const SignUpForm = () => {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  // Username and password are controlled so their requirements can update as
  // the user types (and so they survive React resetting the form on submit).
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [attempted, setAttempted] = useState(false);

  const usernameReqs = usernameRequirements(username);
  const passwordReqs = passwordRequirements(password);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!allMet(usernameReqs) || !allMet(passwordReqs)) {
      event.preventDefault();
      setAttempted(true);
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={state.error} />
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="username" className={labelClass}>
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={USERNAME_MAX_LENGTH}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-describedby="username-requirements"
          aria-invalid={attempted && !allMet(usernameReqs)}
          className={inputClass}
        />
        <RequirementList
          id="username-requirements"
          requirements={usernameReqs}
          showErrors={attempted}
        />
      </div>
      <div>
        <label htmlFor="sign-up-password" className={labelClass}>
          Password
        </label>
        <input
          id="sign-up-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          maxLength={PASSWORD_MAX_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="password-requirements"
          aria-invalid={attempted && !allMet(passwordReqs)}
          className={inputClass}
        />
        <RequirementList
          id="password-requirements"
          requirements={passwordReqs}
          showErrors={attempted}
        />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
};

type Mode = "sign-in" | "sign-up";

/** Sign-in and sign-up forms with a toggle between them. */
const AuthForms = () => {
  const [mode, setMode] = useState<Mode>("sign-in");
  const isSignIn = mode === "sign-in";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-stone-900">
        {isSignIn ? "Sign in" : "Create an account"}
      </h1>
      {isSignIn ? <SignInForm /> : <SignUpForm />}
      <p className="text-center text-sm text-stone-600">
        {isSignIn ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignIn ? "sign-up" : "sign-in")}
          className="font-medium text-stone-900 underline underline-offset-2 hover:text-stone-700"
        >
          {isSignIn ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
};

export default AuthForms;
