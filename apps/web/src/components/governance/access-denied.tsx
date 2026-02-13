import { Link } from "@tanstack/react-router";

type AccessDeniedProps = {
	title?: string;
	message: string;
	loginHref?: "/login";
	supportHint?: string;
};

export default function AccessDenied({
	title = "Access denied",
	message,
	loginHref = "/login",
	supportHint = "Sign in with the invited account or contact the host team for access.",
}: AccessDeniedProps) {
	return (
		<section className="mx-auto max-w-xl rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
			<p className="text-muted-foreground text-xs uppercase tracking-wide">
				Invite-only protection
			</p>
			<h1 className="mt-2 font-semibold text-2xl tracking-tight">{title}</h1>
			<p className="mt-3 text-muted-foreground text-sm">{message}</p>
			<p className="mt-2 text-muted-foreground text-sm">{supportHint}</p>

			<div className="mt-5 flex flex-wrap gap-2">
				<Link
					className="inline-flex rounded-md border px-3 py-2 font-medium text-sm"
					to={loginHref}
				>
					Go to sign in
				</Link>
				<Link
					className="inline-flex rounded-md border px-3 py-2 font-medium text-sm"
					to="/"
				>
					Back to home
				</Link>
			</div>
		</section>
	);
}
