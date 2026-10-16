import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function Intro() {
  return (
    <main className="h-[calc(100dvh-4rem)] overflow-y-auto bg-background md:h-dvh md:pl-16">
      <section className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center gap-10 px-6 py-10 lg:flex-row lg:items-center lg:gap-14">
        <div className="w-full lg:w-1/2">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Welcome!
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Build Docker Compose stacks visually, edit the Compose YAML in sync
            with the graph, and export ready-to-use Compose or Kubernetes
            manifests directly from your browser.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            No backend is required to generate, copy, or download manifests.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Want to contribute? Request a feature? Or report a bug? Check out
            our{" "}
            <a
              className="font-medium text-foreground underline underline-offset-4"
              href="https://github.com/ctk-hq/ctk"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            .
          </p>
          <Button asChild className="mt-8" size="lg">
            <Link to="/projects/new">
              Start a project <ArrowRight />
            </Link>
          </Button>
          <p className="mt-5 text-sm text-muted-foreground">
            Want to keep projects organized?{" "}
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              to="/login"
            >
              Log in
            </Link>{" "}
            or{" "}
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              to="/signup"
            >
              register
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
