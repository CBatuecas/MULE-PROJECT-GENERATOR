import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";

const askQuestions = async () => {
  return inquirer.prompt([
    {
      type: "input",
      name: "outputDir",
      message: "Carpeta donde crear el proyecto (ruta absoluta o relativa):",
      default: "..",
      validate: (v) =>
        v.trim() !== "" || "Indica una carpeta de destino",
    },
    {
      type: "input",
      name: "artifactId",
      message: "Nombre del proyecto:",
      validate: (v) => v.trim() !== "" || "El nombre no puede estar vacío",
    },
    {
      type: "input",
      name: "groupId",
      message: "GroupId:",
      default: "com.tuportfolio",
    },
    {
      type: "input",
      name: "version",
      message: "Versión:",
      default: "1.0.0",
    },
    {
      type: "checkbox",
      name: "extras",
      message: "¿Qué quieres incluir?",
      choices: [
        { name: "Error Handler global", value: "errorHandler", checked: true },
        { name: "Properties YAML (common + des/pre/prod)", value: "properties", checked: true },
        {
          name: "Propiedades seguras (YAML + dependencia Exchange + repos Maven en pom)",
          value: "secureProperties",
          checked: true,
        },
        { name: "MUnit", value: "munit" },
        { name: "Anypoint MQ", value: "mq" },
        { name: "Object Store", value: "objectStore" },
      ],
    },
  ]);
};

const generatePom = (groupId, artifactId, version, extras) => {
  const munitDep = extras.includes("munit") ? `
    <dependency>
      <groupId>com.mulesoft.munit</groupId>
      <artifactId>munit-runner</artifactId>
      <version>3.1.0</version>
      <classifier>mule-plugin</classifier>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>com.mulesoft.munit</groupId>
      <artifactId>munit-tools</artifactId>
      <version>3.1.0</version>
      <classifier>mule-plugin</classifier>
      <scope>test</scope>
    </dependency>` : "";

  const mqDep = extras.includes("mq") ? `
    <dependency>
      <groupId>com.mulesoft.connectors</groupId>
      <artifactId>anypoint-mq-connector</artifactId>
      <version>4.0.4</version>
      <classifier>mule-plugin</classifier>
    </dependency>` : "";

  const osDep = extras.includes("objectStore") ? `
    <dependency>
      <groupId>org.mule.connectors</groupId>
      <artifactId>mule-objectstore-connector</artifactId>
      <version>1.2.2</version>
      <classifier>mule-plugin</classifier>
    </dependency>` : "";

  const securePropsDep = extras.includes("secureProperties") ? `
    <dependency>
      <groupId>com.mulesoft.modules</groupId>
      <artifactId>mule-secure-configuration-property-module</artifactId>
      <version>1.3.0</version>
      <classifier>mule-plugin</classifier>
    </dependency>` : "";

  // Sin estos repos Maven/Studio no resuelven el módulo Exchange y el XML secure-properties queda sin esquema.
  const secureReposBlock = extras.includes("secureProperties") ? `
  <repositories>
    <repository>
      <id>anypoint-exchange-v3</id>
      <name>Anypoint Exchange</name>
      <url>https://maven.anypoint.mulesoft.com/api/v3/maven</url>
    </repository>
    <repository>
      <id>mulesoft-releases</id>
      <name>MuleSoft Releases Repository</name>
      <url>https://repository.mulesoft.org/releases/</url>
    </repository>
  </repositories>
  <pluginRepositories>
    <pluginRepository>
      <id>mulesoft-releases</id>
      <name>MuleSoft Releases Repository</name>
      <url>https://repository.mulesoft.org/releases/</url>
    </pluginRepository>
  </pluginRepositories>` : "";

  const munitPlugin = extras.includes("munit") ? `
      <plugin>
        <groupId>com.mulesoft.munit.tools</groupId>
        <artifactId>munit-maven-plugin</artifactId>
        <version>3.1.0</version>
        <executions>
          <execution>
            <id>test</id>
            <phase>test</phase>
            <goals><goal>test</goal></goals>
          </execution>
        </executions>
        <configuration>
          <coverage>
            <runCoverage>true</runCoverage>
            <failBuild>true</failBuild>
            <requiredApplicationCoverage>80</requiredApplicationCoverage>
          </coverage>
        </configuration>
      </plugin>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>${groupId}</groupId>
  <artifactId>${artifactId}</artifactId>
  <version>${version}</version>
  <packaging>mule-application</packaging>
  <properties>
    <mule.version>4.6.0</mule.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.mule.connectors</groupId>
      <artifactId>mule-http-connector</artifactId>
      <version>1.9.1</version>
      <classifier>mule-plugin</classifier>
    </dependency>${munitDep}${mqDep}${osDep}${securePropsDep}
  </dependencies>${secureReposBlock}
  <build>
    <plugins>
      <plugin>
        <groupId>org.mule.tools.maven</groupId>
        <artifactId>mule-maven-plugin</artifactId>
        <version>4.1.0</version>
        <extensions>true</extensions>
      </plugin>${munitPlugin}
    </plugins>
  </build>
</project>`;
};

const generateErrorHandler = () => `<?xml version="1.0" encoding="UTF-8"?>
<mule xmlns="http://www.mulesoft.org/schema/mule/core"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.mulesoft.org/schema/mule/core
        http://www.mulesoft.org/schema/mule/core/current/mule.xsd">

  <error-handler name="global-error-handler">
    <on-error-propagate type="HTTP:UNAUTHORIZED">
      <set-payload value='#[output application/json --- {code: 401, message: "Unauthorized"}]'/>
    </on-error-propagate>
    <on-error-propagate type="HTTP:NOT_FOUND">
      <set-payload value='#[output application/json --- {code: 404, message: "Resource not found"}]'/>
    </on-error-propagate>
    <on-error-propagate type="VALIDATION:INVALID_INPUT">
      <set-payload value='#[output application/json --- {code: 400, message: "Bad request: " ++ error.description}]'/>
    </on-error-propagate>
    <on-error-propagate type="ANY">
      <set-payload value='#[output application/json --- {code: 500, message: "Internal server error"}]'/>
    </on-error-propagate>
  </error-handler>

</mule>`;

const ENVIRONMENTS = ["des", "pre", "prod"];

/** Rutas relativas a classpath (src/main/resources): YAML bajo properties/, seguras bajo properties/secure/ */
const PROPERTIES_DIR = "properties";
const PROPERTIES_SECURE_DIR = `${PROPERTIES_DIR}/secure`;

const generateAppCommonYaml = (artifactId) => `http:
  port: "8081"
  host: "0.0.0.0"
api:
  name: "${artifactId}"
  version: "v1"`;

const generateAppEnvPropertiesYaml = (artifactId, env) => `# Valores específicos de ${env} (sobrescriben claves de app-common.yaml si coinciden)
env:
  name: "${env}"
example:
  endpoint: "https://api.example.com/${env}"`;

const generateSecureEnvYaml = (env) => `# Acceso en la app: \${secure::...} (p. ej. \${secure::credentials.clientSecret})
# Tras cifrar con Secure Properties Tool / Studio, usar valores entre comillas como "![...]" (ver doc MuleSoft)
credentials:
  clientId: "CHANGE_ME_${env}"
  clientSecret: "CHANGE_ME"
database:
  password: "CHANGE_ME"
api:
  token: "CHANGE_ME"`;

const generateGlobalConfig = (extras) => {
  const hasProps = extras.includes("properties");
  const hasSecure = extras.includes("secureProperties");

  const xmlnsSecure = hasSecure
    ? `
      xmlns:secure-properties="http://www.mulesoft.org/schema/mule/secure-properties"`
    : "";

  const schemaCore = `http://www.mulesoft.org/schema/mule/core
        http://www.mulesoft.org/schema/mule/core/current/mule.xsd`;
  const schemaSecure = hasSecure
    ? `
        http://www.mulesoft.org/schema/mule/secure-properties
        http://www.mulesoft.org/schema/mule/secure-properties/current/mule-secure-properties.xsd`
    : "";

  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<mule xmlns="http://www.mulesoft.org/schema/mule/core"${xmlnsSecure}`);
  lines.push(`      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`);
  lines.push(`      xsi:schemaLocation="${schemaCore}${schemaSecure}">`);
  lines.push(``);
  lines.push(`  <!-- des | pre | prod -->`);
  lines.push(`  <global-property name="env" value="des"/>`);

  if (hasSecure) {
    lines.push(
      `  <!-- Clave de cifrado: definir en runtime (p. ej. -M-Dsecure.key=...) y no commitear valores reales -->`
    );
    lines.push(
      `  <global-property name="secure.key" value="localDevOnlyReplaceOrUseRuntimeProperty"/>`
    );
  }

  if (hasProps) {
    lines.push(`  <configuration-properties file="${PROPERTIES_DIR}/app-common.yaml"/>`);
    lines.push(`  <configuration-properties file="${PROPERTIES_DIR}/app-\${env}-properties.yaml"/>`);
  }

  if (hasSecure) {
    lines.push(
      `  <secure-properties:config name="secure-config" key="\${secure.key}" file="${PROPERTIES_SECURE_DIR}/app-\${env}-secure-properties.yaml"/>`
    );
  }

  lines.push(``);
  lines.push(`</mule>`);
  return lines.join("\n");
};

const generateMunitSuite = (artifactId) => `<?xml version="1.0" encoding="UTF-8"?>
<mule xmlns="http://www.mulesoft.org/schema/mule/core"
      xmlns:munit="http://www.mulesoft.org/schema/mule/munit"
      xmlns:munit-tools="http://www.mulesoft.org/schema/mule/munit-tools"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.mulesoft.org/schema/mule/core
        http://www.mulesoft.org/schema/mule/core/current/mule.xsd
        http://www.mulesoft.org/schema/mule/munit
        http://www.mulesoft.org/schema/mule/munit/current/mule-munit.xsd
        http://www.mulesoft.org/schema/mule/munit-tools
        http://www.mulesoft.org/schema/mule/munit-tools/current/mule-munit-tools.xsd">

  <munit:config name="${artifactId}-test-suite"/>

  <munit:test name="${artifactId}-test" description="Test principal">
    <munit:execution>
      <munit-tools:assert-that expression="#[true]" is="#[MunitTools::equalTo(true)]"/>
    </munit:execution>
  </munit:test>

</mule>`;

const run = async () => {
  console.log(chalk.cyan("\n🚀 Mule Project Generator\n"));

  const { outputDir, artifactId, groupId, version, extras } = await askQuestions();

  const outputPath = path.resolve(process.cwd(), outputDir.trim(), artifactId.trim());

  if (fs.existsSync(outputPath)) {
    console.log(chalk.red(`\n❌ Ya existe una carpeta con el nombre '${artifactId}'`));
    process.exit(1);
  }

  console.log(chalk.yellow("\n⚙️  Generando proyecto...\n"));

  // Estructura base
  fs.ensureDirSync(path.join(outputPath, "src/main/mule"));
  fs.ensureDirSync(path.join(outputPath, "src/main/resources"));

  // pom.xml
  fs.writeFileSync(path.join(outputPath, "pom.xml"), generatePom(groupId, artifactId, version, extras));
  const pomExtra = extras.includes("secureProperties") ? " (+ Secure Configuration)" : "";
  console.log(chalk.green(`  ✅ pom.xml${pomExtra}`));

  // Error handler
  if (extras.includes("errorHandler")) {
    fs.writeFileSync(path.join(outputPath, "src/main/mule/error-handler.xml"), generateErrorHandler());
    console.log(chalk.green("  ✅ error-handler.xml"));
  }

  // Properties (app-common + app-{env}-properties por entorno) → src/main/resources/properties/
  if (extras.includes("properties")) {
    const propertiesDir = path.join(outputPath, "src/main/resources", PROPERTIES_DIR);
    fs.ensureDirSync(propertiesDir);
    fs.writeFileSync(path.join(propertiesDir, "app-common.yaml"), generateAppCommonYaml(artifactId));
    for (const env of ENVIRONMENTS) {
      fs.writeFileSync(
        path.join(propertiesDir, `app-${env}-properties.yaml`),
        generateAppEnvPropertiesYaml(artifactId, env)
      );
    }
    console.log(
      chalk.green(
        `  ✅ ${PROPERTIES_DIR}/app-common.yaml + ${ENVIRONMENTS.map((e) => `${PROPERTIES_DIR}/app-${e}-properties.yaml`).join(", ")}`
      )
    );
  }

  // Secure properties → src/main/resources/properties/secure/
  if (extras.includes("secureProperties")) {
    const secureDir = path.join(outputPath, "src/main/resources", PROPERTIES_SECURE_DIR);
    fs.ensureDirSync(secureDir);
    for (const env of ENVIRONMENTS) {
      fs.writeFileSync(
        path.join(secureDir, `app-${env}-secure-properties.yaml`),
        generateSecureEnvYaml(env)
      );
    }
    console.log(
      chalk.green(
        `  ✅ ${ENVIRONMENTS.map((e) => `${PROPERTIES_SECURE_DIR}/app-${e}-secure-properties.yaml`).join(", ")}`
      )
    );
  }

  // global.xml si hay properties y/o secure properties
  if (extras.includes("properties") || extras.includes("secureProperties")) {
    fs.writeFileSync(
      path.join(outputPath, "src/main/mule/global.xml"),
      generateGlobalConfig(extras)
    );
    const parts = ["env"];
    if (extras.includes("properties")) {
      parts.push(`${PROPERTIES_DIR}/app-common.yaml`, `${PROPERTIES_DIR}/app-\${env}-properties.yaml`);
    }
    if (extras.includes("secureProperties")) {
      parts.push("secure.key", `${PROPERTIES_SECURE_DIR}/app-\${env}-secure-properties.yaml`);
    }
    console.log(chalk.green(`  ✅ global.xml (${parts.join(" + ")})`));
  }

  // MUnit
  if (extras.includes("munit")) {
    fs.ensureDirSync(path.join(outputPath, "src/test/munit"));
    fs.writeFileSync(path.join(outputPath, `src/test/munit/${artifactId}-test-suite.xml`), generateMunitSuite(artifactId));
    console.log(chalk.green("  ✅ MUnit test suite"));
  }

  console.log(chalk.cyan(`\n✨ Proyecto '${artifactId}' generado en:\n   ${outputPath}\n`));
};

run();