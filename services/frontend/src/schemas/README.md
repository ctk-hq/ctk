# Export validation schemas

- `compose.json`: official Compose specification schema, commit `de28432802a367d650bd4ad6748b19491b6cf986` (JSON Schema 2020-12).
- `kubernetes.json`: application API definitions and transitive references from the official Kubernetes `v1.35.0` OpenAPI v2 schema. Descriptions, formats and server defaults are omitted; unknown object properties are rejected. Integer-or-string unions are retained.

Sources: https://github.com/compose-spec/compose-spec/blob/de28432802a367d650bd4ad6748b19491b6cf986/schema/compose-spec.json and https://github.com/kubernetes/kubernetes/blob/v1.35.0/api/openapi-spec/swagger.json.

Validation runs offline. It establishes schema and CTK semantic conformance, not cluster admission, driver availability, or runtime behavior. Uncatalogued API versions/CRDs are preserved as source and block validated export.

Regenerate with `python3 scripts/update-manifest-schemas.py` from the repository root. This fetches only the pinned official sources; application startup and export never fetch schemas.
