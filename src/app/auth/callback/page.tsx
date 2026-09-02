import AuthCallbackClient from "@/components/AuthCallbackClient";

// SM-P1-009, second correction pass. This route was one client component that
// read the whole link itself. It is now a server wrapper for the same reason
// the login page became one: the client half must decide before first paint
// whether this link needs the reader's explicit confirmation (a token_hash the
// email carries directly, which is single-use and must not be spent by
// whatever loads the page first), and a decision made before first paint
// belongs to the server, read from searchParams, the framework's own prop.
// The hash-fragment shapes a server can never see stay with the client, which
// still reads window.location for them on mount.
export default async function AuthCallbackPage(props: {
  searchParams: Promise<{ code?: string; token_hash?: string; type?: string; next?: string }>;
}) {
  const sp = await props.searchParams;
  return (
    <AuthCallbackClient
      code={sp.code ?? null}
      tokenHash={sp.token_hash ?? null}
      typeParam={sp.type ?? null}
      nextParam={sp.next ?? null}
    />
  );
}
