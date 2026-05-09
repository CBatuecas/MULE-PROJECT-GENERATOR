# Mule Project Generator

Generador por consola que crea un **esqueleto de aplicación Mule 4** (Maven, `packaging: mule-application`) con opciones habituales: error handler global, configuración por entorno, MUnit, Anypoint MQ y Object Store.

## Requisitos

- **Node.js** (versión con soporte para ES modules; el proyecto usa `"type": "module"`).
- **npm**, **pnpm** o **yarn** para instalar dependencias.

No sustituye a Anypoint Studio ni al Mule runtime: solo genera archivos en disco para que luego los abras en tu IDE o los construyas con Maven.

## Instalación

Clona o descarga el repositorio y, en la carpeta del proyecto:

```bash
npm install
```

(o `pnpm install` / `yarn` si lo prefieres).

## Uso

Desde la carpeta del generador:

```bash
npm start
```

Equivale a ejecutar `node index.js`.

El asistente te hará varias preguntas. Al final verás la **ruta absoluta** donde se creó la carpeta del proyecto.

## Preguntas del asistente

| Pregunta | Descripción |
|----------|-------------|
| **Carpeta donde crear el proyecto** | Directorio **base** donde se creará una subcarpeta con el nombre del proyecto. Puede ser ruta **relativa** al directorio desde el que ejecutas el comando (por ejemplo `.`, `..`, `./mis-apis`) o **absoluta** (por ejemplo `C:\dev\mule`). Por defecto: `..` (un nivel por encima del directorio actual). |
| **Nombre del proyecto** | Se usa como `artifactId` de Maven y como nombre de la carpeta final: `\<carpeta base\>\<nombre del proyecto\>`. Obligatorio; no puede estar vacío. |
| **GroupId** | Identificador de grupo Maven. Por defecto: `com.tuportfolio`. |
| **Versión** | Versión del artefacto en el `pom.xml`. Por defecto: `1.0.0`. |
| **¿Qué quieres incluir?** | Opciones múltiples (espacio para marcar/desmarcar en la consola). Ver la siguiente sección. |

### Opciones incluibles (checkbox)

- **Error Handler global** (marcado por defecto): crea `src/main/mule/error-handler.xml` con manejadores para HTTP 401/404, validación y un `ANY` genérico con respuestas JSON.
- **Properties por entorno (dev/uat/prod)** (marcado por defecto): crea `config-dev.yaml`, `config-uat.yaml` y `config-prod.yaml` en `src/main/resources`, y `src/main/mule/global.xml` con `global-property` `env=dev` y carga de `config-${env}.yaml`.
- **MUnit**: añade dependencias de MUnit, el plugin `munit-maven-plugin` con cobertura mínima del 80 % y un suite de prueba de ejemplo en `src/test/munit/<artifactId>-test-suite.xml`.
- **Anypoint MQ**: añade la dependencia del conector Anypoint MQ en el `pom.xml`.
- **Object Store**: añade la dependencia del conector Object Store en el `pom.xml`.

Si desmarcas **Error Handler** y **Properties**, el generador igualmente crea la estructura base y el `pom.xml`; solo no generará esos XML/YAML.

## Estructura generada

```
<nombre-proyecto>/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── mule/          # error-handler.xml, global.xml (según opciones)
│   │   └── resources/     # config-dev.yaml, config-uat.yaml, config-prod.yaml (según opciones)
│   └── test/
│       └── munit/         # si activas MUnit
```

## Versiones fijadas en la plantilla

Estas versiones están **incrustadas** en el generador; si necesitas otras, edita el proyecto generado o el código de `index.js`.

| Componente | Versión (referencia en plantilla) |
|------------|-----------------------------------|
| Mule (propiedad `mule.version`) | 4.6.0 |
| HTTP Connector | 1.9.1 |
| Mule Maven Plugin | 4.1.0 |
| MUnit (runner, tools, plugin) | 3.1.0 |
| Anypoint MQ Connector | 4.0.4 |
| Object Store Connector | 1.2.2 |

## Comportamiento y limitaciones

- **Carpeta ya existente**: si ya existe `\<carpeta base\>\<nombre del proyecto\>`, el programa se detiene con un mensaje de error y no sobrescribe nada.
- **Rutas**: la ruta final se calcula con `path.resolve(process.cwd(), carpetaBase, nombreProyecto)`, de modo que las rutas relativas dependen del directorio desde el que ejecutas `npm start`.
- El `pom.xml` generado es un esqueleto válido para una app Mule; puede que quieras añadir `name`, `description`, repositorios Maven de MuleSoft u otros plugins según tu entorno corporativo.

## Dependencias del generador (Node)

- [inquirer](https://www.npmjs.com/package/inquirer): preguntas interactivas en consola.
- [chalk](https://www.npmjs.com/package/chalk): colores en la salida.
- [fs-extra](https://www.npmjs.com/package/fs-extra): creación de directorios y escritura de archivos.

## Licencia

ISC (según `package.json` del repositorio).
