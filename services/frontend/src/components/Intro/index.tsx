import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

export default function Intro() {
  return (
    <main className="min-h-[calc(var(--vh,1vh)*100)] md:pl-16 bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
      <section className="mx-auto flex min-h-[calc(var(--vh,1vh)*100)] w-full max-w-6xl flex-col justify-center gap-10 px-6 py-10 lg:flex-row lg:items-center lg:gap-14">
        <div className="w-full lg:w-1/2">
          <p className="mb-2 inline-flex items-center rounded-full border border-cyan-200 bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-800">
            Container ToolKit
          </p>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Welcome!
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
            Build Docker Compose stacks and Kubernetes manifests visually, then
            switch to code mode anytime to edit YAML directly. The graph and
            code stay in sync in both directions.
          </p>
          <p className="mt-3 text-slate-700">
            Want to contribute? Request a feature? Or report a bug? Check out
            our{" "}
            <a
              className="font-semibold text-cyan-700 hover:text-cyan-800"
              href="https://github.com/ctk-hq/ctk"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            .
          </p>
          <Link
            to="/projects/new"
            className="mt-8 inline-flex items-center rounded-md bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            Start a project <ArrowRightIcon className="ml-2 h-4 w-4" />
          </Link>
          <p className="mt-5 text-sm text-slate-600">
            Want to keep projects organized?
            <Link
              className="ml-1 font-semibold text-cyan-700 hover:text-cyan-800"
              to="/login"
            >
              Log in
            </Link>
            <span> or </span>
            <Link
              className="font-semibold text-cyan-700 hover:text-cyan-800"
              to="/signup"
            >
              register
            </Link>
            .
          </p>
        </div>

        {/* 
        <div className="w-full lg:w-1/2"></div>
        */}
      </section>
    </main>
  );
}
