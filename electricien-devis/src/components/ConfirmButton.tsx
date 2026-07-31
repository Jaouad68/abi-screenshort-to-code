"use client";

/**
 * Bouton de soumission avec confirmation navigateur — pour les actions
 * destructrices (suppression). L'action est un server action lié en amont.
 */
export function ConfirmButton({
  action,
  message,
  className,
  children,
}: {
  action: () => Promise<void>;
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        className={className}
        onClick={(e) => {
          if (!window.confirm(message)) e.preventDefault();
        }}
      >
        {children}
      </button>
    </form>
  );
}
