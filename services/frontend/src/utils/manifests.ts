import YAML from "yaml";
import { manifestTypes } from "../constants";
import type { IGeneratePayload, ManifestSource } from "../types";
import { importKubernetes } from "./kubernetes";

export interface ManifestImport {
  replaceSource?: boolean;
  type: (typeof manifestTypes)[keyof typeof manifestTypes];
  data: IGeneratePayload["data"];
  source: ManifestSource;
}

export const isRecord = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function parseManifest(text: string, language: string): ManifestImport {
  if (!text.trim())
    throw new Error(
      "Paste a Compose or Kubernetes manifest to update the graph."
    );
  let documents: unknown[];
  try {
    if (language === "json") {
      const value = JSON.parse(text);
      documents = Array.isArray(value) ? value : [value];
    } else {
      const parsed = YAML.parseAllDocuments(text, {
        merge: true,
        uniqueKeys: true
      });
      const invalid = parsed.find((document) => document.errors.length);
      if (invalid) throw invalid.errors[0];
      documents = parsed.map((document) =>
        document.toJS({ maxAliasCount: 100 })
      );
    }
  } catch (error) {
    // Parser messages can include source excerpts (and credentials).
    const line =
      isRecord(error) && isRecord(error.linePos?.[0])
        ? error.linePos[0].line
        : undefined;
    // eslint-disable-next-line preserve-caught-error -- Parser errors can contain private manifest excerpts.
    throw new Error(
      `Invalid ${language.toUpperCase()}${line ? ` at line ${line}` : ""}. Fix the manifest to update the graph.`
    );
  }
  documents = documents.filter((document) => document !== null);
  if (!documents.length || documents.some((document) => !isRecord(document))) {
    throw new Error(
      "Expected a Compose document or Kubernetes resources as objects."
    );
  }
  if (
    documents.some(
      (document) =>
        isRecord(document) && ("apiVersion" in document || "kind" in document)
    )
  ) {
    return importKubernetes(documents as Record<string, any>[]);
  }
  if (documents.length !== 1)
    throw new Error(
      "Compose import needs one document. Kubernetes resources can use --- separators."
    );
  const document = documents[0] as Record<string, any>;
  const reserved = new Set([
    "version",
    "name",
    "networks",
    "volumes",
    "configs",
    "secrets",
    "include"
  ]);
  let services = document.services;
  const legacy =
    services === undefined &&
    Object.entries(document).filter(
      ([key]) => !reserved.has(key) && !key.startsWith("x-")
    );
  if (
    legacy &&
    legacy.length &&
    legacy.every(
      ([, value]) => isRecord(value) && ("image" in value || "build" in value)
    )
  ) {
    services = Object.fromEntries(legacy);
  }
  if (
    !isRecord(services) ||
    Object.values(services).some((service) => !isRecord(service))
  ) {
    throw new Error(
      "Compose needs a services object with a configuration object for each service."
    );
  }
  for (const section of ["networks", "volumes"]) {
    if (
      document[section] !== undefined &&
      (!isRecord(document[section]) ||
        Object.values(document[section]).some(
          (value) => value !== null && !isRecord(value)
        ))
    ) {
      throw new Error(
        `Compose ${section} must be an object of named configurations.`
      );
    }
  }
  const compose = Object.fromEntries(
    Object.entries(document).filter(
      ([key]) =>
        key !== "version" &&
        key !== "services" &&
        key !== "networks" &&
        key !== "volumes" &&
        !(legacy && key in services)
    )
  );
  const nativeSections = Object.keys(compose).filter(
    (key) => key !== "name" && !key.startsWith("x-")
  );
  return {
    type: manifestTypes.DOCKER_COMPOSE,
    data: {
      services,
      networks: document.networks ?? {},
      volumes: document.volumes ?? {}
    },
    source: {
      compose,
      warnings: nativeSections.length
        ? [
            `Compose sections ${nativeSections.join(", ")} are preserved in Compose; they are not translated to Kubernetes.`
          ]
        : []
    }
  };
}
