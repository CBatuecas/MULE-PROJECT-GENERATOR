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
        { name: "Properties por entorno (dev/uat/prod)", value: "properties", checked: true },
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
    </dependency>${munitDep}${mqDep}${osDep}
  </dependencies>
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

const generateProperties = (artifactId, env) => `http:
  port: "8081"
  host: "0.0.0.0"
api:
  name: "${artifactId}"
  version: "v1"
env:
  name: "${env}"`;

const generateGlobalConfig = () => `<?xml version="1.0" encoding="UTF-8"?>
<mule xmlns="http://www.mulesoft.org/schema/mule/core"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.mulesoft.org/schema/mule/core
        http://www.mulesoft.org/schema/mule/core/current/mule.xsd">

  <global-property name="env" value="dev"/>
  <configuration-properties file="config-\${env}.yaml"/>

</mule>`;

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
  console.log(chalk.green("  ✅ pom.xml"));

  // Error handler
  if (extras.includes("errorHandler")) {
    fs.writeFileSync(path.join(outputPath, "src/main/mule/error-handler.xml"), generateErrorHandler());
    console.log(chalk.green("  ✅ error-handler.xml"));
  }

  // Properties
  if (extras.includes("properties")) {
    for (const env of ["dev", "uat", "prod"]) {
      fs.writeFileSync(path.join(outputPath, `src/main/resources/config-${env}.yaml`), generateProperties(artifactId, env));
    }
    fs.writeFileSync(path.join(outputPath, "src/main/mule/global.xml"), generateGlobalConfig());
    console.log(chalk.green("  ✅ global.xml (env + config-${env}.yaml)"));
    console.log(chalk.green("  ✅ config-dev/uat/prod.yaml"));
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