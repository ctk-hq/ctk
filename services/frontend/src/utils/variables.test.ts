import {
  dotenvLine,
  generateEnvExample,
  referencedVariables
} from "./variables";

test("discovers reusable Compose references throughout config and skips escaped dollars", () => {
  expect(
    referencedVariables({
      services: {
        db: {
          environment: { PASS: "${DB_PASSWORD:?Supply a password}", TZ: "$TZ" },
          volumes: ["${BASE_PATH:-/srv}/db:/data"],
          command: "echo $$RUNTIME $${ESCAPED}"
        }
      },
      networks: { main: { name: "${NETWORK}" } }
    })
  ).toEqual(["BASE_PATH", "DB_PASSWORD", "NETWORK", "TZ"]);
});

test("exports only shared defaults and blank secret values even with a stale secret default", () => {
  const example = generateEnvExample({ env: "${IMPORTED}" }, [
    { name: "TZ", secret: false, default: "UTC" },
    { name: "DB_PASSWORD", secret: true, default: "must-not-export" }
  ]);
  expect(example).toContain('TZ="UTC"');
  expect(example).toContain('DB_PASSWORD=""');
  expect(example).toContain('IMPORTED=""');
  expect(example).not.toContain("must-not-export");
});

test("quotes literal dollars, backslashes, newlines, and quotes for Compose dotenv", () => {
  expect(dotenvLine("VALUE", 'a$SECRET\\"\n')).toBe(
    'VALUE="a$$SECRET\\\\\\"\\n"\n'
  );
});

test("discovers imported Compose sections while excluding native text and import snapshots", () => {
  const example = generateEnvExample(
    {
      nodes: {
        app: {
          serviceConfig: {
            environment: { VALUE: "${REAL}", literal: "$${NATIVE_LITERAL}" }
          }
        }
      },
      manifestSource: {
        compose: { configs: { settings: { file: "${CONFIG_PATH}" } } },
        kubernetes: {
          documents: [{ data: { literal: "${NATIVE_LITERAL}" } }],
          bindings: [{ config: { value: "${OLD_SNAPSHOT}" } }]
        }
      }
    },
    []
  );
  expect(example).toContain('REAL=""');
  expect(example).toContain('CONFIG_PATH=""');
  expect(example).not.toContain("NATIVE_LITERAL");
  expect(example).not.toContain("OLD_SNAPSHOT");
});
