import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <section className="text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-indigo-600 hover:underline">
        Back to start
      </Link>
    </section>
  );
}
