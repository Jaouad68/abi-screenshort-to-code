export type ActionState = { error?: string; success?: string } | null;

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null;
  if (state.error) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
        {state.error}
      </p>
    );
  }
  return (
    <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700" role="status">
      {state.success}
    </p>
  );
}
